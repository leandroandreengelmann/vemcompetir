'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { normalizePhone } from '@/lib/phone';

export async function updateAthleteProfile(formData: FormData) {
    const user = await requireAuth();
    const supabase = await createClient();
    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string | null;
    const weight = formData.get('weight') ? Number(formData.get('weight')) : null;
    const birthDate = formData.get('birth_date') as string;
    const beltColor = formData.get('belt_color') as string;
    const cpf = formData.get('cpf') as string ? (formData.get('cpf') as string).replace(/\D/g, '') : null;
    const phone = formData.get('phone') as string ? (formData.get('phone') as string).replace(/\D/g, '') : null;
    const sexo = formData.get('sexo') as string | null;
    const nationalityRaw = (formData.get('nationality') as string | null)?.toUpperCase() ?? null;
    const nationality = nationalityRaw && /^[A-Z]{2}$/.test(nationalityRaw) ? nationalityRaw : null;

    // These fields are optionally filled if the user is a "community suggestion"
    // but we MUST NOT update tenant_id or master_id here for regular users.
    const gymName = formData.get('gym_name') as string | null;
    const masterName = formData.get('master_name') as string | null;

    if (!fullName || fullName.trim().length < 3) {
        return { error: 'O nome deve ter pelo menos 3 caracteres.' };
    }

    // CPF validation if provided
    if (cpf && cpf.length > 0) {
        // Simple length check, full validation on frontend
        if (cpf.length !== 11) {
            return { error: 'CPF inválido.' };
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName.trim(),
            weight,
            birth_date: birthDate || null,
            belt_color: beltColor,
            gym_name: gymName || null,
            master_name: masterName || null,
            cpf,
            phone,
            sexo,
            nationality,
        })
        .eq('id', user.id);

    if (error) {
        console.error('Update profile error:', error);
        if (error.code === '23505') return { error: 'Este CPF já está cadastrado em outra conta.' };
        return { error: 'Ocorreu um erro ao atualizar o perfil.' };
    }

    if (email && email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
        if (authError) {
            console.error('Update email error:', authError);
            return { error: 'Erro ao tentar atualizar o e-mail. Verifique se ele já não está em uso por outra conta.' };
        }
    }

    revalidatePath('/atleta/dashboard');
    revalidatePath('/atleta/dashboard/perfil');
    revalidatePath('/atleta/dashboard/inscricoes');
    return { success: true };
}

export async function sendPhoneVerificationAction(phone: string) {
    const user = await requireAuth();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

    // Remove verificações anteriores do mesmo perfil
    await adminClient.from('phone_verifications').delete().eq('profile_id', user.id);

    // Salva o novo código
    const { error: insertError } = await adminClient.from('phone_verifications').insert({
        profile_id: user.id,
        phone,
        code,
        expires_at: expiresAt,
    });
    if (insertError) return { error: 'Erro ao gerar código de verificação.' };

    // Busca config Z-API
    const { data: config } = await adminClient.from('whatsapp_config').select('*').limit(1).maybeSingle();
    if (!config?.instance_id || !config?.token) return { error: 'WhatsApp não configurado. Tente mais tarde.' };

    const normalizedPhone = normalizePhone(phone);
    const message = `🔐 Seu código de verificação VemCompetir: *${code}*\n\nVálido por 10 minutos. Não compartilhe este código.`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.client_token) headers['Client-Token'] = config.client_token;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
        res = await fetch(
            `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
            { method: 'POST', headers, body: JSON.stringify({ phone: normalizedPhone, message, delayMessage: 3 }), signal: controller.signal }
        );
    } catch {
        return { error: 'Tempo esgotado ao enviar o código. Tente novamente.' };
    } finally {
        clearTimeout(timeout);
    }

    if (!res.ok) return { error: 'Não foi possível enviar o código. Verifique se o número está no WhatsApp.' };

    // Registra/atualiza conversa no inbox para o admin ver
    const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).single();
    const contactName = profile?.full_name ?? 'Atleta';
    const now = new Date().toISOString();

    const { data: existing } = await adminClient
        .from('whatsapp_conversations')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

    if (existing) {
        await adminClient.from('whatsapp_conversations').update({
            last_message: message,
            last_message_at: now,
            last_message_direction: 'outbound',
            last_message_status: 'sent',
        }).eq('id', existing.id);
    } else {
        await adminClient.from('whatsapp_conversations').insert({
            phone: normalizedPhone,
            contact_name: contactName,
            contact_type: 'verificacao',
            linked_id: user.id,
            status: 'aberta',
            last_message: message,
            last_message_at: now,
            last_message_direction: 'outbound',
            last_message_status: 'sent',
        });
    }

    return { success: true };
}

export async function confirmPhoneVerificationAction(phone: string, code: string) {
    const user = await requireAuth();
    const adminClient = createAdminClient();

    const { data: record } = await adminClient
        .from('phone_verifications')
        .select('*')
        .eq('profile_id', user.id)
        .eq('phone', phone)
        .eq('used', false)
        .single();

    if (!record) return { error: 'Código inválido ou expirado.' };
    if (new Date(record.expires_at) < new Date()) return { error: 'Código expirado. Solicite um novo.' };
    if (record.code !== code.trim()) return { error: 'Código incorreto.' };

    // Marca como usado
    await adminClient.from('phone_verifications').update({ used: true }).eq('id', record.id);

    // Salva o telefone no perfil (update separado do phone_verified para não acionar o trigger de reset)
    await adminClient.from('profiles').update({ phone }).eq('id', user.id);
    // Segundo update: marca verificado (trigger não reseta pois phone não mudou neste update)
    await adminClient.from('profiles').update({ phone_verified: true }).eq('id', user.id);

    revalidatePath('/atleta/dashboard');
    revalidatePath('/atleta/dashboard/perfil');
    return { success: true };
}

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/');
    return { success: true };
}

const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadAvatarAction(formData: FormData) {
    const user = await requireAuth();
    const supabase = await createClient();
    const admin = createAdminClient();

    const file = formData.get('avatar') as File | null;
    if (!file || file.size === 0) return { error: 'Nenhuma imagem recebida.' };
    if (!ALLOWED_AVATAR_MIME.includes(file.type)) return { error: 'Formato inválido. Use JPG, PNG ou WEBP.' };
    if (file.size > MAX_AVATAR_BYTES) return { error: 'Imagem muito grande. Tamanho máximo: 2 MB.' };

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    // Remove avatar antigo antes de subir o novo
    const { data: existing } = await admin.storage.from('avatars').list(user.id);
    if (existing && existing.length > 0) {
        const oldPaths = existing.map(f => `${user.id}/${f.name}`);
        await admin.storage.from('avatars').remove(oldPaths);
    }

    const { error: uploadError } = await admin.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return { error: 'Erro ao enviar a imagem.' };
    }

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
    if (updateError) {
        console.error('Avatar update profile error:', updateError);
        return { error: 'Erro ao salvar o perfil.' };
    }

    revalidatePath('/atleta/dashboard');
    revalidatePath('/atleta/dashboard/perfil');
    return { success: true, url: publicUrl };
}

export async function removeAvatarAction() {
    const user = await requireAuth();
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: existing } = await admin.storage.from('avatars').list(user.id);
    if (existing && existing.length > 0) {
        const paths = existing.map(f => `${user.id}/${f.name}`);
        await admin.storage.from('avatars').remove(paths);
    }

    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    if (error) {
        console.error('Avatar remove profile error:', error);
        return { error: 'Erro ao remover a foto.' };
    }

    revalidatePath('/atleta/dashboard');
    revalidatePath('/atleta/dashboard/perfil');
    return { success: true };
}

export async function searchGyms(query: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('search_gyms_optimized', {
        search_term: query
    });

    if (error) {
        console.error('Error in searchGyms:', error);
        return { official: [], community: [] };
    }

    return data as {
        official: { id: string, name: string }[],
        community: string[]
    };
}

export async function searchMasters(query: string, tenantId?: string, gymName?: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('search_masters_optimized', {
        search_term: query,
        p_tenant_id: tenantId || null,
        p_gym_name: gymName || null
    });

    if (error) {
        console.error('Error in searchMasters:', error);
        return { official: [], community: [] };
    }

    return data as {
        official: { id: string, full_name: string }[],
        community: string[]
    };
}

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function createAthleteAction(formData: FormData) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    let email = formData.get('email') as string;
    let password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;
    const birth_date = formData.get('birth_date') as string;
    const belt_color = formData.get('belt_color') as string;
    const weight = formData.get('weight') as string;
    let phone = formData.get('phone') as string;
    const is_responsible = formData.get('is_responsible') === 'on';
    const is_master = formData.get('is_master') === 'on';
    // Mestres não são mestres de si mesmos
    const master_id = is_master ? null : (formData.get('master_id') as string || null);
    const master_name = is_master ? null : (formData.get('master_name') as string || null);

    if (!full_name) return { error: 'Preencha todos os campos obrigatórios.' };

    if (!email) {
        const randomStr = Math.random().toString(36).substring(2, 10);
        email = `${randomStr}-${Date.now()}@dummy.competir.com`;
    }
    if (!password) {
        password = Math.random().toString(36).slice(-10) + 'A1!@';
    }

    const adminClient = createAdminClient();
    const supabase = await createClient();

    // Buscar gym_name da academia que está cadastrando o atleta
    // Usa tenant.name como fallback se gym_name não estiver preenchido no perfil
    const [{ data: organizerProfile }, { data: tenant }] = await Promise.all([
        supabase.from('profiles').select('gym_name').eq('id', profile.id).single(),
        supabase.from('tenants').select('name').eq('id', tenant_id).single(),
    ]);
    const gym_name = organizerProfile?.gym_name || tenant?.name || null;

    const { data: { user }, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'atleta',
            full_name,
            tenant_id,
            birth_date,
            belt_color,
            weight: weight ? parseFloat(weight) : null,
            phone,
            is_responsible,
            is_master,
            master_id,
            master_name,
            cpf: (formData.get('cpf') as string || '').replace(/\D/g, ''),
            sexo: formData.get('sexo') as string,
        },
        email_confirm: true,
    });

    if (error) {
        if (error.message.includes('already been registered')) {
            return { error: 'Este e-mail já está cadastrado em nossa base de dados.' };
        }
        return { error: error.message };
    }

    if (user) {
        await adminClient
            .from('profiles')
            .upsert({
                id: user.id,
                role: 'atleta',
                full_name,
                tenant_id,
                gym_name,
                birth_date: birth_date || null,
                belt_color: belt_color || null,
                weight: weight ? parseFloat(weight) : null,
                phone,
                is_responsible,
                is_master,
                master_id,
                master_name,
                cpf: (formData.get('cpf') as string || '').replace(/\D/g, ''),
                sexo: formData.get('sexo') as string,
            });
    }

    revalidatePath('/academia-equipe/dashboard/atletas');
    return { success: true };
}

export async function updateAthleteAction(formData: FormData) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe' && profile.role !== 'admin_geral') {
        return { error: 'Sem permissão.' };
    }
    const isGlobalAdmin = profile.role === 'admin_geral';

    const id = formData.get('id') as string;
    const full_name = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const birth_date = formData.get('birth_date') as string;
    const belt_color = formData.get('belt_color') as string;
    const weight = formData.get('weight') as string;
    const phone = formData.get('phone') as string;
    const is_responsible = formData.get('is_responsible') === 'on';
    const is_master = formData.get('is_master') === 'on';
    // Mestres não são mestres de si mesmos
    const master_id = is_master ? null : (formData.get('master_id') as string || null);
    const master_name = is_master ? null : (formData.get('master_name') as string || null);

    if (!id || !full_name) return { error: 'ID e Nome são obrigatórios.' };

    const adminClient = createAdminClient();
    const supabase = await createClient();

    // Verifique se o atleta pertence ao mesmo tenant
    const { data: athleteProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (!isGlobalAdmin && athleteProfile?.tenant_id !== tenant_id) {
        return { error: 'Você não tem permissão para editar este atleta.' };
    }

    const resolvedTenantId = isGlobalAdmin ? (athleteProfile?.tenant_id || tenant_id) : tenant_id;

    // Buscar gym_name da academia editora (não sobrescreve com null se admin global)
    // Usa tenant.name como fallback se gym_name não estiver preenchido no perfil
    let gym_name: string | null = null;
    if (!isGlobalAdmin) {
        const [{ data: organizerProfile }, { data: tenant }] = await Promise.all([
            supabase.from('profiles').select('gym_name').eq('id', profile.id).single(),
            supabase.from('tenants').select('name').eq('id', tenant_id).single(),
        ]);
        gym_name = organizerProfile?.gym_name || tenant?.name || null;
    }

    const updateData: any = {
        user_metadata: {
            full_name,
            role: 'atleta',
            tenant_id: resolvedTenantId,
            birth_date,
            belt_color,
            weight: weight ? parseFloat(weight) : null,
            phone,
            is_responsible,
            is_master,
            master_id,
            master_name,
            cpf: (formData.get('cpf') as string || '').replace(/\D/g, ''),
            sexo: formData.get('sexo') as string,
        }
    };
    if (email) updateData.email = email;
    if (password && password.length >= 6) updateData.password = password;

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, updateData);
    if (authError) return { error: authError.message };

    const profileUpdateData: any = {
        full_name,
        birth_date: birth_date || null,
        belt_color: belt_color || null,
        weight: weight ? parseFloat(weight) : null,
        phone,
        cpf: (formData.get('cpf') as string || '').replace(/\D/g, ''),
        sexo: formData.get('sexo') as string,
        is_responsible,
        is_master,
        master_id,
        master_name,
    };
    // Só atualiza gym_name se não for admin global (admin global não deve sobrescrever)
    if (!isGlobalAdmin && gym_name !== null) {
        profileUpdateData.gym_name = gym_name;
    }

    const { error: profileError } = await adminClient
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', id);

    if (profileError) {
        await adminClient
            .from('profiles')
            .upsert({
                id,
                full_name,
                role: 'atleta',
                tenant_id: resolvedTenantId,
                gym_name: isGlobalAdmin ? undefined : gym_name,
                birth_date: birth_date || null,
                belt_color: belt_color || null,
                weight: weight ? parseFloat(weight) : null,
                phone,
                is_responsible,
                is_master,
                master_id,
                master_name,
            });
    }

    const suggested_master_name = formData.get('suggested_master_name') as string;
    if (is_master && suggested_master_name && suggested_master_name !== 'none') {
        const { error: bulkError } = await adminClient
            .from('profiles')
            .update({
                master_id: id,
                master_name: full_name,        // nome real do mestre
                ...(gym_name ? { gym_name } : {}), // nome oficial da academia
            })
            .eq('tenant_id', resolvedTenantId)
            .eq('role', 'atleta')
            .is('master_id', null)
            .eq('master_name', suggested_master_name);

        if (bulkError) {
            console.error('Error linking suggested athletes to master:', bulkError);
        }
    }

    revalidatePath('/academia-equipe/dashboard/atletas');
    revalidatePath(`/academia-equipe/dashboard/atletas/${id}`);
    return { success: true };
}

export async function deleteAthleteAction(id: string) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe' && profile.role !== 'admin_geral') {
        return { error: 'Sem permissão.' };
    }
    const isGlobalAdmin = profile.role === 'admin_geral';

    const adminClient = createAdminClient();

    // Verifique proprietário
    const { data: athleteProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (!isGlobalAdmin && athleteProfile?.tenant_id !== tenant_id) {
        return { error: 'Você não tem permissão para excluir este atleta.' };
    }

    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/academia-equipe/dashboard/atletas');
    return { success: true };
}

export async function unlinkSuggestedMasterAction(masterId: string, suggestionName: string) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    const adminClient = createAdminClient();

    // Verifique se o mestre pertence à mesma academia
    const { data: masterProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', masterId)
        .single();

    if (masterProfile?.tenant_id !== tenant_id) {
        return { error: 'Você não tem permissão para editar este mestre.' };
    }

    const { error: unlinkError } = await adminClient
        .from('profiles')
        .update({ master_id: null })
        .eq('tenant_id', tenant_id)
        .eq('role', 'atleta')
        .eq('master_id', masterId)
        .eq('master_name', suggestionName);

    if (unlinkError) {
        console.error('Error unlinking suggested athletes from master:', unlinkError);
        return { error: unlinkError.message };
    }

    revalidatePath('/academia-equipe/dashboard/atletas');
    revalidatePath(`/academia-equipe/dashboard/atletas/${masterId}`);
    return { success: true };
}

export async function generateAthleteAccessAction(formData: FormData) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe' && profile.role !== 'admin_geral') {
        return { error: 'Sem permissão.' };
    }
    const isGlobalAdmin = profile.role === 'admin_geral';

    const id = formData.get('id') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;

    if (!id || !email || !password) return { error: 'ID, E-mail e Senha são obrigatórios.' };

    const adminClient = createAdminClient();

    const { data: athleteProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (!isGlobalAdmin && athleteProfile?.tenant_id !== tenant_id) {
        return { error: 'Você não tem permissão para editar este atleta.' };
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
        email,
        password,
        email_confirm: true,
        user_metadata: { phone } // update phone in metadata
    });

    if (authError) {
        if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
            return { error: 'Este e-mail já está cadastrado em nossa base de dados.' };
        }
        return { error: authError.message };
    }

    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ phone: phone || null })
        .eq('id', id);

    if (profileError) {
        console.error('Error updating athlete profile phone:', profileError);
    }

    revalidatePath('/academia-equipe/dashboard/atletas');
    return { success: true };
}

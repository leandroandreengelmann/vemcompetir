'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateSystemSettingAdmin } from '@/lib/dal/system-settings';
import {
    SPONSORS_BUCKET,
    SPONSORS_ENABLED_KEY,
    SPONSORS_TITLE_KEY,
    SPONSOR_LOGO_IDEAL,
    slugifySponsor,
} from '@/lib/sponsors';
import { revalidatePath } from 'next/cache';

type Result = { success?: boolean; error?: string };

const MAX_FILE_SIZE = SPONSOR_LOGO_IDEAL.maxFileMb * 1024 * 1024;

function revalidateSponsors() {
    revalidatePath('/admin/dashboard/patrocinadores');
    revalidatePath('/');
}

function parseFields(formData: FormData): { error?: string; fields?: Record<string, string | null> } {
    const name = ((formData.get('name') as string) || '').trim().slice(0, 80);
    const linkUrl = ((formData.get('link_url') as string) || '').trim() || null;

    // Descrição vem como HTML do editor rico. Detecta "vazio" (ex.: "<p></p>").
    const descriptionHtml = ((formData.get('description') as string) || '').trim();
    const descPlain = descriptionHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    const description = descPlain ? descriptionHtml : null;

    const whatsappRaw = ((formData.get('whatsapp') as string) || '').replace(/\D/g, '');
    const whatsapp = whatsappRaw || null;

    if (!name) return { error: 'Informe o nome do parceiro.' };
    if (linkUrl && !linkUrl.startsWith('/') && !linkUrl.startsWith('https://')) {
        return { error: 'O link deve começar com "/" (página interna) ou "https://".' };
    }
    if (description && description.length > 20000) {
        return { error: 'Descrição muito longa.' };
    }
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) {
        return { error: 'WhatsApp inválido. Informe DDD + número (ex.: 66999998888).' };
    }

    return { fields: { name, link_url: linkUrl, description, whatsapp } };
}

/** Gera um slug único (acrescenta -2, -3… se já existir). */
async function uniqueSlug(
    admin: ReturnType<typeof createAdminClient>,
    name: string,
    excludeId?: string,
): Promise<string> {
    const base = slugifySponsor(name) || 'parceiro';
    let candidate = base;
    let n = 1;
    // Poucos parceiros: laço simples é suficiente.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let query = admin.from('sponsors').select('id').eq('slug', candidate);
        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query.maybeSingle();
        if (!data) return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
}

function validateFile(file: File | null): string | null {
    if (!file || file.size === 0) return null;
    if (!file.type.startsWith('image/')) return 'O arquivo deve ser uma imagem.';
    if (file.size > MAX_FILE_SIZE) return `A imagem deve ter no máximo ${SPONSOR_LOGO_IDEAL.maxFileMb}MB.`;
    return null;
}

async function uploadLogo(
    admin: ReturnType<typeof createAdminClient>,
    file: File,
): Promise<{ path?: string; error?: string }> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `logos/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage.from(SPONSORS_BUCKET).upload(path, file, { upsert: true });
    if (error) return { error: 'Erro no upload da logo.' };
    return { path };
}

export async function createSponsorAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return { error: 'Selecione uma logo.' };
    const fileErr = validateFile(file);
    if (fileErr) return { error: fileErr };

    const parsed = parseFields(formData);
    if (parsed.error) return { error: parsed.error };

    const admin = createAdminClient();

    const upload = await uploadLogo(admin, file);
    if (upload.error || !upload.path) return { error: upload.error };

    const { data: last } = await admin
        .from('sponsors')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

    const slug = await uniqueSlug(admin, parsed.fields!.name as string);

    const { error } = await admin.from('sponsors').insert({
        ...parsed.fields,
        slug,
        logo_path: upload.path,
        sort_order: (last?.sort_order ?? -1) + 1,
        is_active: true,
    });

    if (error) {
        await admin.storage.from(SPONSORS_BUCKET).remove([upload.path]);
        return { error: 'Erro ao criar o parceiro.' };
    }

    revalidateSponsors();
    return { success: true };
}

export async function updateSponsorAction(id: string, formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    if (!id) return { error: 'Dados inválidos.' };

    const parsed = parseFields(formData);
    if (parsed.error) return { error: parsed.error };

    const admin = createAdminClient();
    const payload: Record<string, unknown> = {
        ...parsed.fields,
        updated_at: new Date().toISOString(),
    };

    const file = formData.get('file') as File | null;
    const hasNewFile = !!file && file.size > 0;
    let newPath: string | null = null;
    let oldPath: string | null = null;

    if (hasNewFile) {
        const fileErr = validateFile(file);
        if (fileErr) return { error: fileErr };

        const { data: current } = await admin
            .from('sponsors')
            .select('logo_path')
            .eq('id', id)
            .single();

        const upload = await uploadLogo(admin, file!);
        if (upload.error || !upload.path) return { error: upload.error };
        payload.logo_path = upload.path;
        newPath = upload.path;
        oldPath = current?.logo_path ?? null;
    }

    const { error } = await admin.from('sponsors').update(payload).eq('id', id);
    if (error) {
        if (newPath) await admin.storage.from(SPONSORS_BUCKET).remove([newPath]);
        return { error: 'Erro ao atualizar o parceiro.' };
    }

    if (oldPath) {
        await admin.storage.from(SPONSORS_BUCKET).remove([oldPath]);
    }

    revalidateSponsors();
    return { success: true };
}

export async function toggleSponsorAction(id: string, isActive: boolean): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin
        .from('sponsors')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) return { error: 'Erro ao alterar status.' };
    revalidateSponsors();
    return { success: true };
}

export async function deleteSponsorAction(id: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data: sponsor } = await admin
        .from('sponsors')
        .select('logo_path')
        .eq('id', id)
        .single();

    const { error } = await admin.from('sponsors').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir o parceiro.' };

    if (sponsor?.logo_path) {
        await admin.storage.from(SPONSORS_BUCKET).remove([sponsor.logo_path]);
    }

    revalidateSponsors();
    return { success: true };
}

export async function reorderSponsorsAction(orderedIds: string[]): Promise<Result> {
    await requireRole('admin_geral');
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return { error: 'Dados inválidos.' };

    const admin = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await admin
            .from('sponsors')
            .update({ sort_order: i, updated_at: new Date().toISOString() })
            .eq('id', orderedIds[i]);
        if (error) return { error: 'Erro ao reordenar os parceiros.' };
    }

    revalidateSponsors();
    return { success: true };
}

export async function toggleSponsorsEnabledAction(enabled: boolean): Promise<Result> {
    await requireRole('admin_geral');
    try {
        await updateSystemSettingAdmin(SPONSORS_ENABLED_KEY, String(enabled));
    } catch {
        return { error: 'Erro ao salvar a configuração.' };
    }
    revalidateSponsors();
    return { success: true };
}

export async function updateSponsorsTitleAction(title: string): Promise<Result> {
    await requireRole('admin_geral');
    const clean = (title || '').trim().slice(0, 60);
    if (!clean) return { error: 'O título não pode ficar vazio.' };
    try {
        await updateSystemSettingAdmin(SPONSORS_TITLE_KEY, clean);
    } catch {
        return { error: 'Erro ao salvar o título.' };
    }
    revalidateSponsors();
    return { success: true };
}

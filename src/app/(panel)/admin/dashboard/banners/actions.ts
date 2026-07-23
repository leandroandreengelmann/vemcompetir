'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateSystemSettingAdmin } from '@/lib/dal/system-settings';
import {
    HERO_BANNERS_BUCKET, HERO_BANNERS_ENABLED_KEY, HERO_BANNERS_INTERVAL_KEY, HERO_BANNER_INTERVAL,
} from '@/lib/hero-banners';
import { revalidatePath } from 'next/cache';

type Result = { success?: boolean; error?: string };

const OVERLAY_STYLES = ['none', 'light', 'medium', 'dark'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function revalidateBanners() {
    revalidatePath('/admin/dashboard/banners');
    revalidatePath('/');
}

function parseFields(formData: FormData): { error?: string; fields?: Record<string, string | boolean | null> } {
    const title = ((formData.get('title') as string) || '').trim().slice(0, 80) || null;
    const subtitle = ((formData.get('subtitle') as string) || '').trim().slice(0, 160) || null;
    const linkUrl = ((formData.get('link_url') as string) || '').trim() || null;
    const overlayStyle = (formData.get('overlay_style') as string) || 'medium';

    if (linkUrl && !linkUrl.startsWith('/') && !linkUrl.startsWith('https://')) {
        return { error: 'O link deve começar com "/" (página interna) ou "https://".' };
    }
    if (!OVERLAY_STYLES.includes(overlayStyle)) {
        return { error: 'Estilo de escurecimento inválido.' };
    }

    return {
        fields: {
            title,
            subtitle,
            link_url: linkUrl,
            overlay_style: overlayStyle,
        },
    };
}

function validateFile(file: File | null): string | null {
    if (!file || file.size === 0) return null;
    if (!file.type.startsWith('image/')) return 'O arquivo deve ser uma imagem.';
    if (file.size > MAX_FILE_SIZE) return 'A imagem deve ter no máximo 5MB.';
    return null;
}

async function uploadBannerImage(
    admin: ReturnType<typeof createAdminClient>,
    file: File,
    suffix = '',
): Promise<{ path?: string; error?: string }> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `banners/${crypto.randomUUID()}${suffix}.${ext}`;
    const { error } = await admin.storage.from(HERO_BANNERS_BUCKET).upload(path, file, { upsert: true });
    if (error) return { error: 'Erro no upload da imagem.' };
    return { path };
}

export async function createBannerAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return { error: 'Selecione uma imagem para o banner.' };
    const fileErr = validateFile(file);
    if (fileErr) return { error: fileErr };

    const fileMobile = formData.get('file_mobile') as File | null;
    const hasMobile = !!fileMobile && fileMobile.size > 0;
    if (hasMobile) {
        const mobileErr = validateFile(fileMobile);
        if (mobileErr) return { error: mobileErr };
    }

    const parsed = parseFields(formData);
    if (parsed.error) return { error: parsed.error };

    const admin = createAdminClient();

    const upload = await uploadBannerImage(admin, file);
    if (upload.error || !upload.path) return { error: upload.error };

    let mobilePath: string | null = null;
    if (hasMobile) {
        const upMobile = await uploadBannerImage(admin, fileMobile!, '-mobile');
        if (upMobile.error || !upMobile.path) {
            await admin.storage.from(HERO_BANNERS_BUCKET).remove([upload.path]);
            return { error: upMobile.error };
        }
        mobilePath = upMobile.path;
    }

    const { data: last } = await admin
        .from('hero_banners')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

    const { error } = await admin.from('hero_banners').insert({
        ...parsed.fields,
        image_path: upload.path,
        image_path_mobile: mobilePath,
        sort_order: (last?.sort_order ?? -1) + 1,
        is_active: true,
    });

    if (error) {
        const orphans = mobilePath ? [upload.path, mobilePath] : [upload.path];
        await admin.storage.from(HERO_BANNERS_BUCKET).remove(orphans);
        return { error: 'Erro ao criar o banner.' };
    }

    revalidateBanners();
    return { success: true };
}

export async function updateBannerAction(id: string, formData: FormData): Promise<Result> {
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
    const fileMobile = formData.get('file_mobile') as File | null;
    const removeMobile = formData.get('remove_mobile') === 'on';
    const newUploads: string[] = [];
    const oldPaths: string[] = [];

    const hasNewFile = !!file && file.size > 0;
    const hasNewMobile = !!fileMobile && fileMobile.size > 0;

    if (hasNewFile) {
        const fileErr = validateFile(file);
        if (fileErr) return { error: fileErr };
    }
    if (hasNewMobile) {
        const mobileErr = validateFile(fileMobile);
        if (mobileErr) return { error: mobileErr };
    }

    if (hasNewFile || hasNewMobile || removeMobile) {
        const { data: current } = await admin
            .from('hero_banners')
            .select('image_path, image_path_mobile')
            .eq('id', id)
            .single();

        if (hasNewFile) {
            const upload = await uploadBannerImage(admin, file!);
            if (upload.error || !upload.path) return { error: upload.error };
            payload.image_path = upload.path;
            newUploads.push(upload.path);
            if (current?.image_path) oldPaths.push(current.image_path);
        }

        if (hasNewMobile) {
            const upMobile = await uploadBannerImage(admin, fileMobile!, '-mobile');
            if (upMobile.error || !upMobile.path) {
                if (newUploads.length) await admin.storage.from(HERO_BANNERS_BUCKET).remove(newUploads);
                return { error: upMobile.error };
            }
            payload.image_path_mobile = upMobile.path;
            newUploads.push(upMobile.path);
            if (current?.image_path_mobile) oldPaths.push(current.image_path_mobile);
        } else if (removeMobile) {
            payload.image_path_mobile = null;
            if (current?.image_path_mobile) oldPaths.push(current.image_path_mobile);
        }
    }

    const { error } = await admin.from('hero_banners').update(payload).eq('id', id);
    if (error) {
        if (newUploads.length) await admin.storage.from(HERO_BANNERS_BUCKET).remove(newUploads);
        return { error: 'Erro ao atualizar o banner.' };
    }

    if (oldPaths.length) {
        await admin.storage.from(HERO_BANNERS_BUCKET).remove(oldPaths);
    }

    revalidateBanners();
    return { success: true };
}

export async function toggleBannerAction(id: string, isActive: boolean): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin
        .from('hero_banners')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) return { error: 'Erro ao alterar status.' };
    revalidateBanners();
    return { success: true };
}

export async function deleteBannerAction(id: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data: banner } = await admin
        .from('hero_banners')
        .select('image_path, image_path_mobile')
        .eq('id', id)
        .single();

    const { error } = await admin.from('hero_banners').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir o banner.' };

    const paths = [banner?.image_path, banner?.image_path_mobile].filter(Boolean) as string[];
    if (paths.length) {
        await admin.storage.from(HERO_BANNERS_BUCKET).remove(paths);
    }

    revalidateBanners();
    return { success: true };
}

export async function reorderBannersAction(orderedIds: string[]): Promise<Result> {
    await requireRole('admin_geral');
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return { error: 'Dados inválidos.' };

    const admin = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await admin
            .from('hero_banners')
            .update({ sort_order: i, updated_at: new Date().toISOString() })
            .eq('id', orderedIds[i]);
        if (error) return { error: 'Erro ao reordenar os banners.' };
    }

    revalidateBanners();
    return { success: true };
}

export async function updateHeroIntervalAction(seconds: number): Promise<Result> {
    await requireRole('admin_geral');
    const s = Math.round(Number(seconds));
    if (!Number.isFinite(s) || s < HERO_BANNER_INTERVAL.min || s > HERO_BANNER_INTERVAL.max) {
        return { error: `Intervalo inválido (entre ${HERO_BANNER_INTERVAL.min} e ${HERO_BANNER_INTERVAL.max} segundos).` };
    }
    try {
        await updateSystemSettingAdmin(HERO_BANNERS_INTERVAL_KEY, String(s));
    } catch {
        return { error: 'Erro ao salvar o intervalo.' };
    }
    revalidateBanners();
    return { success: true };
}

export async function toggleHeroEnabledAction(enabled: boolean): Promise<Result> {
    await requireRole('admin_geral');
    try {
        await updateSystemSettingAdmin(HERO_BANNERS_ENABLED_KEY, String(enabled));
    } catch {
        return { error: 'Erro ao salvar a configuração.' };
    }
    revalidateBanners();
    return { success: true };
}

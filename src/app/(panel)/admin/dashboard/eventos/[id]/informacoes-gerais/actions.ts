"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Tópicos (General Infos)
 */

export async function createGeneralInfoAction(eventId: string, tenantId: string) {
    const supabase = createAdminClient();

    // Get the last sort order
    const { data: lastItem } = await supabase
        .from('event_general_infos')
        .select('sort_order')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const nextSortOrder = (lastItem?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
        .from('event_general_infos')
        .insert({
            event_id: eventId,
            tenant_id: tenantId,
            title: 'Novo tópico',
            content_type: 'text_media',
            sort_order: nextSortOrder
        })
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { data };
}

export async function updateGeneralInfoAction(infoId: string, eventId: string, data: { title?: string, text_content_json?: any, content?: string }) {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('event_general_infos')
        .update({
            ...data,
            updated_at: new Date().toISOString()
        })
        .eq('id', infoId);

    if (error) return { error: error.message };
    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { success: true };
}

export async function deleteGeneralInfoAction(infoId: string, eventId: string) {
    const supabase = createAdminClient();

    // The database ON DELETE CASCADE will handle the assets table
    // But we need to manually clean up Storage
    const { data: assets } = await supabase
        .from('event_general_info_assets')
        .select('storage_path')
        .eq('info_id', infoId);

    if (assets && assets.length > 0) {
        const paths = assets.map(a => a.storage_path);
        await supabase.storage.from('event-images').remove(paths);
    }

    const { error } = await supabase
        .from('event_general_infos')
        .delete()
        .eq('id', infoId);

    if (error) return { error: error.message };
    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { success: true };
}

export async function reorderGeneralInfosAction(eventId: string, items: { id: string, sort_order: number }[]) {
    const supabase = createAdminClient();

    // Batch update using a loop (Supabase doesn't have a single batch update for different values easily without RPC)
    const updates = items.map(item =>
        supabase
            .from('event_general_infos')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);

    if (firstError) return { error: firstError.error?.message || "Ocorreu um erro ao reordenar." };
    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { success: true };
}

/**
 * Assets (Mídia)
 */

export async function uploadInfoAssetAction(formData: FormData) {
    const supabase = createAdminClient();
    const infoId = formData.get('infoId') as string;
    const eventId = formData.get('eventId') as string;
    const tenantId = formData.get('tenantId') as string;
    const file = formData.get('file') as File;

    if (!file) return { error: 'Arquivo não encontrado' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const storagePath = `tenant/${tenantId}/events/${eventId}/general-infos/${infoId}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(storagePath, file);

    if (uploadError) return { error: uploadError.message };

    // 2. Insert into Database
    const isImage = file.type.startsWith('image/');
    const { data: asset, error: dbError } = await supabase
        .from('event_general_info_assets')
        .insert({
            info_id: infoId,
            event_id: eventId,
            tenant_id: tenantId,
            asset_type: isImage ? 'image' : 'pdf',
            storage_path: storagePath,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
        })
        .select()
        .single();

    if (dbError) {
        // Rollback storage if database fails
        await supabase.storage.from('event-images').remove([storagePath]);
        return { error: dbError.message };
    }

    // 3. Get the guaranteed public URL from the SDK (server-side, env vars always available)
    const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(storagePath);

    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { asset: { ...asset, public_url: publicUrl } };
}

export async function deleteInfoAssetAction(assetId: string, storagePath: string, eventId: string) {
    const supabase = createAdminClient();

    // 1. Remove from Storage
    const { error: storageError } = await supabase.storage
        .from('event-images')
        .remove([storagePath]);

    if (storageError) return { error: storageError.message };

    // 2. Remove from Database
    const { error: dbError } = await supabase
        .from('event_general_info_assets')
        .delete()
        .eq('id', assetId);

    if (dbError) return { error: dbError.message };

    revalidatePath(`/admin/dashboard/eventos/${eventId}/informacoes-gerais`);
    revalidatePath(`/eventos/${eventId}`);
    return { success: true };
}

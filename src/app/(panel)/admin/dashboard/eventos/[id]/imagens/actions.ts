'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    return profile?.role === 'admin_geral';
}

export async function uploadSecondaryImageAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const eventId = formData.get('event_id') as string;
    const slot = formData.get('slot') as '1' | '2';
    const file = formData.get('file') as File;

    if (!eventId || !slot || !file || file.size === 0) return { error: 'Dados inválidos.' };

    const admin = createAdminClient();

    const { data: event } = await admin
        .from('events')
        .select('tenant_id, secondary_image_1_path, secondary_image_2_path')
        .eq('id', eventId)
        .single();

    if (!event) return { error: 'Evento não encontrado.' };

    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `tenant/${event.tenant_id}/events/${eventId}/secondary_${slot}.${ext}`;

    // Remove old file if exists
    const oldPath = slot === '1' ? event.secondary_image_1_path : event.secondary_image_2_path;
    if (oldPath && oldPath !== storagePath) {
        await admin.storage.from('event-images').remove([oldPath]);
    }

    const { error: uploadError } = await admin.storage
        .from('event-images')
        .upload(storagePath, file, { upsert: true });

    if (uploadError) return { error: 'Erro ao fazer upload da imagem.' };

    const field = slot === '1' ? 'secondary_image_1_path' : 'secondary_image_2_path';
    await admin.from('events').update({ [field]: storagePath }).eq('id', eventId);

    revalidatePath(`/admin/dashboard/eventos/${eventId}/imagens`, 'page');
    revalidatePath(`/eventos/${eventId}`, 'page');
    return { success: true };
}

export async function deleteSecondaryImageAction(eventId: string, slot: '1' | '2'): Promise<{ success?: boolean; error?: string }> {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const admin = createAdminClient();

    const { data: event } = await admin
        .from('events')
        .select('secondary_image_1_path, secondary_image_2_path')
        .eq('id', eventId)
        .single();

    if (!event) return { error: 'Evento não encontrado.' };

    const storagePath = slot === '1' ? event.secondary_image_1_path : event.secondary_image_2_path;

    if (storagePath) {
        await admin.storage.from('event-images').remove([storagePath]);
    }

    const field = slot === '1' ? 'secondary_image_1_path' : 'secondary_image_2_path';
    await admin.from('events').update({ [field]: null }).eq('id', eventId);

    revalidatePath(`/admin/dashboard/eventos/${eventId}/imagens`, 'page');
    revalidatePath(`/eventos/${eventId}`, 'page');
    return { success: true };
}

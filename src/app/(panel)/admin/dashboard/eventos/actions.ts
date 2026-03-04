'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'admin_geral';
}

export async function createAdminEventAction(formData: FormData) {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;
    const tenant_id = formData.get('tenant_id') as string;

    // Address fields
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_neighborhood = formData.get('address_neighborhood') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip = (formData.get('address_zip') as string || '').replace(/\D/g, '');

    if (!title || !event_date || !tenant_id) {
        return { error: 'Título, Data e Academia são obrigatórios.' };
    }

    const adminClient = createAdminClient();
    const { data: event, error } = await adminClient
        .from('events')
        .insert({
            title,
            location,
            event_date,
            tenant_id,
            address_street,
            address_number,
            address_neighborhood,
            address_city,
            address_state,
            address_zip,
            status: 'aprovado'
        })
        .select()
        .single();

    if (error) {
        console.error("Erro ao criar evento (admin):", error);
        return { error: 'Erro ao criar evento.' };
    }

    // Handle image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0 && event) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `tenant/${tenant_id}/events/${event.id}/thumb.${fileExt}`;

        const { error: uploadError } = await adminClient.storage
            .from('event-images')
            .upload(filePath, imageFile, { upsert: true });

        if (!uploadError) {
            await adminClient
                .from('events')
                .update({ image_path: filePath })
                .eq('id', event.id);
        }
    }

    revalidatePath('/admin/dashboard/eventos', 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/preview', 'page');
    revalidatePath('/admin/dashboard/equipes-academias/[id]/eventos', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function updateAdminEventAction(formData: FormData) {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;
    const tenant_id = formData.get('tenant_id') as string;

    // Address fields
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_neighborhood = formData.get('address_neighborhood') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip = (formData.get('address_zip') as string || '').replace(/\D/g, '');

    if (!id || !title || !event_date || !tenant_id) {
        return { error: 'Dados incompletos.' };
    }

    const adminClient = createAdminClient();

    // Check if tenant changed to update image path if necessary
    const { data: oldEvent } = await adminClient
        .from('events')
        .select('tenant_id, image_path')
        .eq('id', id)
        .single();

    const { error } = await adminClient
        .from('events')
        .update({
            title,
            location,
            event_date,
            tenant_id, // Allow switching tenant
            address_street,
            address_number,
            address_neighborhood,
            address_city,
            address_state,
            address_zip
        })
        .eq('id', id);

    if (error) {
        return { error: 'Erro ao atualizar evento.' };
    }

    // Handle image removal
    const removeImage = formData.get('remove_image') === 'true';

    if (removeImage && oldEvent?.image_path) {
        const { error: deleteError } = await adminClient.storage.from('event-images').remove([oldEvent.image_path]);
        if (!deleteError) {
            await adminClient.from('events').update({ image_path: null }).eq('id', id);
        } else {
            console.error("Erro ao remover imagem antiga:", deleteError);
        }
    }

    // Handle new image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `tenant/${tenant_id}/events/${id}/thumb.${fileExt}`;

        const { error: uploadError } = await adminClient.storage
            .from('event-images')
            .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
            console.error("Erro no upload da imagem:", uploadError);
            return { error: 'Erro ao fazer upload da nova imagem.' };
        }

        const { error: updateError } = await adminClient
            .from('events')
            .update({ image_path: filePath })
            .eq('id', id);

        if (updateError) {
            console.error("Erro ao atualizar registro do evento com nova imagem:", updateError);
            return { error: 'Erro ao vincular nova imagem ao evento.' };
        }

        // Se o caminho mudou (extensão ou tenant), removemos o antigo apenas se NÃO acabamos de remover
        if (!removeImage && oldEvent?.image_path && oldEvent.image_path !== filePath) {
            await adminClient.storage.from('event-images').remove([oldEvent.image_path]);
        }
    }

    revalidatePath('/admin/dashboard/eventos', 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/preview', 'page');
    revalidatePath('/admin/dashboard/equipes-academias/[id]/eventos', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function deleteAdminEventAction(id: string) {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const adminClient = createAdminClient();

    // Get image path for cleanup
    const { data: event } = await adminClient
        .from('events')
        .select('image_path')
        .eq('id', id)
        .single();

    const { error } = await adminClient
        .from('events')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: 'Erro ao excluir evento.' };
    }

    // Cleanup storage
    if (event?.image_path) {
        await adminClient.storage.from('event-images').remove([event.image_path]);
    }

    revalidatePath('/admin/dashboard/eventos', 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/preview', 'page');
    revalidatePath('/admin/dashboard/equipes-academias/[id]/eventos', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function approveAdminEventAction(id: string) {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('events')
        .update({ status: 'aprovado' })
        .eq('id', id);

    if (error) {
        console.error("Erro ao aprovar evento:", error);
        return { error: 'Erro ao aprovar evento.' };
    }

    revalidatePath('/admin/dashboard/eventos', 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/preview', 'page');
    revalidatePath('/admin/dashboard/equipes-academias/[id]/eventos', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function publishAdminEventAction(id: string) {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('events')
        .update({ status: 'publicado' })
        .eq('id', id);

    if (error) {
        console.error("Erro ao publicar evento:", error);
        return { error: 'Erro ao publicar evento.' };
    }

    revalidatePath('/admin/dashboard/eventos', 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/preview', 'page');
    revalidatePath('/admin/dashboard/equipes-academias/[id]/eventos', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}

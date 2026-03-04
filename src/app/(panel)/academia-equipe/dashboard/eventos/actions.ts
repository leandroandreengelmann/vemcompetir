'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createEventAction(formData: FormData) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;

    // Address fields
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_neighborhood = formData.get('address_neighborhood') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip = (formData.get('address_zip') as string || '').replace(/\D/g, '');

    if (!title || !event_date) return { error: 'Título e Data são obrigatórios.' };

    const supabase = await createClient();
    const { data: event, error } = await supabase
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
            status: 'pendente'
        })
        .select()
        .single();

    if (error) {
        console.error("Erro ao criar evento:", error);
        return { error: 'Erro ao criar evento.' };
    }

    // Handle initial image if present (via updateAction logic or direct upload here)
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0 && event) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `tenant/${tenant_id}/events/${event.id}/thumb.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(filePath, imageFile, { upsert: true });

        if (!uploadError) {
            await supabase
                .from('events')
                .update({ image_path: filePath })
                .eq('id', event.id);
        }
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

export async function updateEventAction(formData: FormData) {
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;

    // Address fields
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_neighborhood = formData.get('address_neighborhood') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip = (formData.get('address_zip') as string || '').replace(/\D/g, '');

    if (!id || !title || !event_date) return { error: 'Dados incompletos.' };

    const supabase = await createClient();
    const { error } = await supabase
        .from('events')
        .update({
            title,
            location,
            event_date,
            address_street,
            address_number,
            address_neighborhood,
            address_city,
            address_state,
            address_zip
        })
        .eq('id', id)
        .eq('tenant_id', tenant_id); // Security check

    if (error) {
        return { error: 'Erro ao atualizar evento.' };
    }

    // Handle image upload
    const imageFile = formData.get('image') as File;
    const removeImage = formData.get('remove_image') === 'true';

    if (removeImage) {
        // Find current image path
        const { data: currentEvent } = await supabase
            .from('events')
            .select('image_path')
            .eq('id', id)
            .single();

        if (currentEvent?.image_path) {
            await supabase.storage.from('event-images').remove([currentEvent.image_path]);
            await supabase.from('events').update({ image_path: null }).eq('id', id);
        }
    } else if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `tenant/${tenant_id}/events/${id}/thumb.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
            console.error("Upload error:", uploadError);
        } else {
            await supabase
                .from('events')
                .update({ image_path: filePath })
                .eq('id', id);
        }
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    revalidatePath(`/academia-equipe/dashboard/eventos/${id}`);
    return { success: true };
}


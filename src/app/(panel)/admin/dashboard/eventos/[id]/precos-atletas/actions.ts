'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export interface AthletePricing {
    id: string;
    event_id: string;
    gym_name: string | null;
    master_name: string | null;
    registration_fee: number;
    active: boolean;
    notes: string | null;
    created_at: string;
}

export async function getAthletePricings(eventId: string): Promise<AthletePricing[]> {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('event_athlete_pricing')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching athlete pricings:', error);
        return [];
    }

    return data || [];
}

export async function upsertAthletePricing(
    eventId: string,
    gymName: string | null,
    masterName: string | null,
    registrationFee: number,
    notes: string | null,
) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_athlete_pricing')
        .upsert({
            event_id: eventId,
            gym_name: gymName || null,
            master_name: masterName || null,
            registration_fee: registrationFee,
            active: true,
            notes,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'event_id,gym_name,master_name',
        });

    if (error) {
        console.error('Error upserting athlete pricing:', error);
        return { error: 'Erro ao salvar preço diferenciado.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-atletas`);
    return { success: true };
}

export async function updateAthletePricing(
    id: string,
    eventId: string,
    registrationFee: number,
    notes: string | null,
) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_athlete_pricing')
        .update({
            registration_fee: registrationFee,
            notes,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating athlete pricing:', error);
        return { error: 'Erro ao atualizar preço.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-atletas`);
    return { success: true };
}

export async function toggleAthletePricing(id: string, active: boolean, eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_athlete_pricing')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Error toggling athlete pricing:', error);
        return { error: 'Erro ao alterar status.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-atletas`);
    return { success: true };
}

export async function deleteAthletePricing(id: string, eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_athlete_pricing')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting athlete pricing:', error);
        return { error: 'Erro ao remover preço diferenciado.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-atletas`);
    return { success: true };
}

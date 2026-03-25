'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function getEventComboBundle(eventId: string) {
    const admin = createAdminClient();
    const { data } = await admin
        .from('event_combo_bundles')
        .select('id, bundle_total, is_active')
        .eq('event_id', eventId)
        .maybeSingle();
    return data ?? null;
}

export async function upsertEventComboBundle(eventId: string, bundleTotal: number) {
    if (!bundleTotal || bundleTotal <= 0) {
        return { error: 'O valor total do combo deve ser maior que zero.' };
    }

    try {
        const { tenant_id, profile } = await requireTenantScope();
        const admin = createAdminClient();

        // Verifica que o evento pertence ao tenant (exceto admin_geral)
        if (profile.role !== 'admin_geral') {
            const { data: event } = await admin
                .from('events')
                .select('tenant_id')
                .eq('id', eventId)
                .single();

            if (!event || event.tenant_id !== tenant_id) {
                return { error: 'Acesso negado.' };
            }
        }

        const { error } = await admin
            .from('event_combo_bundles')
            .upsert(
                {
                    event_id: eventId,
                    bundle_total: bundleTotal,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'event_id' }
            );

        if (error) {
            console.error('[combo] upsertEventComboBundle error:', error);
            return { error: 'Erro ao salvar combo.' };
        }

        revalidatePath(`/admin/dashboard/eventos/${eventId}/categorias`);
        revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/categorias`);
        return { success: true };
    } catch {
        return { error: 'Acesso negado.' };
    }
}

export async function deleteEventComboBundle(eventId: string) {
    try {
        const { tenant_id, profile } = await requireTenantScope();
        const admin = createAdminClient();

        if (profile.role !== 'admin_geral') {
            const { data: event } = await admin
                .from('events')
                .select('tenant_id')
                .eq('id', eventId)
                .single();

            if (!event || event.tenant_id !== tenant_id) {
                return { error: 'Acesso negado.' };
            }
        }

        const { error } = await admin
            .from('event_combo_bundles')
            .delete()
            .eq('event_id', eventId);

        if (error) {
            console.error('[combo] deleteEventComboBundle error:', error);
            return { error: 'Erro ao remover combo.' };
        }

        revalidatePath(`/admin/dashboard/eventos/${eventId}/categorias`);
        revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/categorias`);
        return { success: true };
    } catch {
        return { error: 'Acesso negado.' };
    }
}

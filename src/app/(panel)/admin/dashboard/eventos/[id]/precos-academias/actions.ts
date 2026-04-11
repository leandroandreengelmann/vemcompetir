'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function getTenantPricings(eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('event_tenant_pricing')
        .select(`
            id,
            event_id,
            tenant_id,
            registration_fee,
            promo_registration_fee,
            active,
            notes,
            created_at
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tenant pricings:', error);
        return [];
    }

    // Buscar nomes das academias
    const tenantIds = data.map(d => d.tenant_id);
    if (tenantIds.length === 0) return [];

    const { data: tenants } = await admin
        .from('profiles')
        .select('tenant_id, gym_name, full_name')
        .in('tenant_id', tenantIds)
        .eq('role', 'academia/equipe');

    const tenantNameMap = new Map<string, string>();
    tenants?.forEach(t => {
        if (t.tenant_id && !tenantNameMap.has(t.tenant_id)) {
            tenantNameMap.set(t.tenant_id, t.gym_name || t.full_name || 'Sem nome');
        }
    });

    return data.map(d => ({
        ...d,
        tenant_name: tenantNameMap.get(d.tenant_id) || 'Academia desconhecida',
    }));
}

export async function searchAcademies(query: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('profiles')
        .select('tenant_id, gym_name, full_name')
        .eq('role', 'academia/equipe')
        .not('tenant_id', 'is', null)
        .or(`gym_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching academies:', error);
        return [];
    }

    // Deduplicate by tenant_id
    const seen = new Set<string>();
    return (data || []).filter(d => {
        if (!d.tenant_id || seen.has(d.tenant_id)) return false;
        seen.add(d.tenant_id);
        return true;
    }).map(d => ({
        tenant_id: d.tenant_id!,
        name: d.gym_name || d.full_name || 'Sem nome',
    }));
}

export async function upsertTenantPricing(
    eventId: string,
    tenantId: string,
    registrationFee: number,
    promoRegistrationFee: number | null,
    notes: string | null,
) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_tenant_pricing')
        .upsert({
            event_id: eventId,
            tenant_id: tenantId,
            registration_fee: registrationFee,
            promo_registration_fee: promoRegistrationFee,
            active: true,
            notes,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'event_id,tenant_id',
        });

    if (error) {
        console.error('Error upserting tenant pricing:', error);
        return { error: 'Erro ao salvar preço diferenciado.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-academias`);
    return { success: true };
}

export async function toggleTenantPricing(id: string, active: boolean, eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_tenant_pricing')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Error toggling tenant pricing:', error);
        return { error: 'Erro ao alterar status.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-academias`);
    return { success: true };
}

export async function deleteTenantPricing(id: string, eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_tenant_pricing')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting tenant pricing:', error);
        return { error: 'Erro ao remover preço diferenciado.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/precos-academias`);
    return { success: true };
}

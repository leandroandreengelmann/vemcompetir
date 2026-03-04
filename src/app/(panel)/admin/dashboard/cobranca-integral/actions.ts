'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

const REVALIDATION_PATH = '/admin/dashboard/cobranca-integral';

export async function getNoSplitRulesWithEvents() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    // Get all events with their organizer tenant name
    const { data: events } = await admin
        .from('events')
        .select(`
            id, title, event_date, status, tenant_id,
            tenant:tenants!events_tenant_id_fkey(name)
        `)
        .order('event_date', { ascending: false });

    const { data: rules } = await admin
        .from('event_no_split_rules')
        .select('*');

    const rulesMap = new Map((rules || []).map(r => [r.event_id, r]));

    return (events || []).map((e: any) => ({
        ...e,
        organizer: e.tenant?.name || 'Sem organizador',
        noSplitRule: rulesMap.get(e.id) || null,
    }));
}

export async function getNoSplitRule(eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data } = await admin
        .from('event_no_split_rules')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

    return data;
}

export async function upsertNoSplitRule(eventId: string, payload: {
    is_enabled: boolean;
    start_after_paid: number;
    offsets: number[];
}) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { error } = await admin
        .from('event_no_split_rules')
        .upsert({
            event_id: eventId,
            is_enabled: payload.is_enabled,
            start_after_paid: payload.start_after_paid,
            offsets: payload.offsets,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id' });

    if (error) return { error: error.message };

    revalidatePath(REVALIDATION_PATH);
    return { success: true };
}

export async function getNoSplitPayments(eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    // Get payments marked as no-split for this event
    const { data: payments } = await admin
        .from('payments')
        .select('id, qtd_inscricoes, total_inscricoes_snapshot, created_at, status')
        .eq('event_id', eventId)
        .eq('is_no_split', true)
        .order('created_at', { ascending: false });

    if (!payments || payments.length === 0) return [];

    // Get inscriptions for these payments
    const paymentIds = payments.map(p => p.id);
    const { data: registrations } = await admin
        .from('event_registrations')
        .select(`
            id, price, status, created_at, payment_id,
            athlete:profiles!athlete_id(full_name, cpf),
            category:category_rows!category_id(categoria_completa)
        `)
        .in('payment_id', paymentIds);

    // Group registrations by payment
    const regsByPayment = new Map<string, any[]>();
    (registrations || []).forEach((r: any) => {
        const pid = r.payment_id;
        if (!regsByPayment.has(pid)) regsByPayment.set(pid, []);
        regsByPayment.get(pid)!.push({
            id: r.id,
            athlete: r.athlete?.full_name || 'Desconhecido',
            cpf: r.athlete?.cpf || '',
            category: r.category?.categoria_completa || 'Sem categoria',
            price: Number(r.price || 0),
            status: r.status,
        });
    });

    return payments.map(p => ({
        ...p,
        total: Number(p.total_inscricoes_snapshot || 0),
        registrations: regsByPayment.get(p.id) || [],
    }));
}

export async function getEventPaidCount(eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { count } = await admin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'pago');

    return count || 0;
}

'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type EventFinanceiroSummary = {
    event_id: string;
    event_title: string;
    event_date: string;
    event_status: string;
    organizer_name: string;
    paid_count: number;
    paid_amount: number;
    pending_count: number;
    pending_amount: number;
    cart_count: number;
    isento_count: number;
    platform_commission: number;
    organizer_revenue: number;
};

export type FinanceiroKPIs = {
    total_faturado: number;
    total_pendente: number;
    total_commission: number;
    total_organizer_revenue: number;
    total_events: number;
};

export type FinanceiroFilters = {
    from?: string;   // YYYY-MM-DD
    to?: string;     // YYYY-MM-DD
    status?: string; // 'publicado' | 'aprovado' | '' (todos)
};

export async function getFinanceiroOverview(filters?: FinanceiroFilters): Promise<{
    kpis: FinanceiroKPIs;
    events: EventFinanceiroSummary[];
}> {
    const admin = createAdminClient();

    const allowedStatuses = filters?.status && filters.status !== 'todos'
        ? [filters.status]
        : ['publicado', 'aprovado'];

    let eventsQuery = admin
        .from('events')
        .select('id, title, event_date, tenant_id, status')
        .in('status', allowedStatuses)
        .order('event_date', { ascending: false });

    if (filters?.from) eventsQuery = eventsQuery.gte('event_date', filters.from);
    if (filters?.to)   eventsQuery = eventsQuery.lte('event_date', filters.to + 'T23:59:59');

    const { data: events } = await eventsQuery;

    if (!events?.length) {
        return {
            kpis: {
                total_faturado: 0,
                total_pendente: 0,
                total_commission: 0,
                total_organizer_revenue: 0,
                total_events: 0,
            },
            events: [],
        };
    }

    const eventIds = events.map(e => e.id);
    const tenantIds = [...new Set(events.map(e => e.tenant_id).filter(Boolean))] as string[];

    const [{ data: registrations }, { data: payments }, { data: organizerProfiles }] = await Promise.all([
        admin
            .from('event_registrations')
            .select('event_id, status, price')
            .in('event_id', eventIds),
        admin
            .from('payments')
            .select('id, event_id, fee_saas_gross_snapshot')
            .in('event_id', eventIds)
            .eq('status', 'PAID'),
        admin
            .from('profiles')
            .select('tenant_id, full_name, gym_name')
            .in('tenant_id', tenantIds)
            .eq('is_master', true),
    ]);

    const eventSummaries: EventFinanceiroSummary[] = events.map(event => {
        const regs = registrations?.filter(r => r.event_id === event.id) || [];
        const pays = payments?.filter(p => p.event_id === event.id) || [];
        const org = organizerProfiles?.find(p => p.tenant_id === event.tenant_id);

        const paid = regs.filter(r => ['pago', 'confirmado'].includes(r.status));
        const pending = regs.filter(r => ['aguardando_pagamento', 'pendente'].includes(r.status));
        const cart = regs.filter(r => r.status === 'carrinho');
        const isento = regs.filter(r => r.status === 'isento');

        const paid_amount = paid.reduce((s, r) => s + Number(r.price || 0), 0);
        const platform_commission = pays.reduce((s, p) => s + Number(p.fee_saas_gross_snapshot || 0), 0);

        return {
            event_id: event.id,
            event_title: event.title,
            event_date: event.event_date,
            event_status: event.status,
            organizer_name: org?.gym_name || org?.full_name || 'Desconhecido',
            paid_count: paid.length,
            paid_amount,
            pending_count: pending.length,
            pending_amount: pending.reduce((s, r) => s + Number(r.price || 0), 0),
            cart_count: cart.length,
            isento_count: isento.length,
            platform_commission,
            organizer_revenue: paid_amount - platform_commission,
        };
    });

    const kpis: FinanceiroKPIs = {
        total_faturado: eventSummaries.reduce((s, e) => s + e.paid_amount, 0),
        total_pendente: eventSummaries.reduce((s, e) => s + e.pending_amount, 0),
        total_commission: eventSummaries.reduce((s, e) => s + e.platform_commission, 0),
        total_organizer_revenue: eventSummaries.reduce((s, e) => s + e.organizer_revenue, 0),
        total_events: events.length,
    };

    return { kpis, events: eventSummaries };
}

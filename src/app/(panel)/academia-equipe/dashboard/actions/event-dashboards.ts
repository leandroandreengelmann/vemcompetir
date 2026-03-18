'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';

export type EventSummary = {
    id: string;
    title: string;
    event_date: string | null;
    status: string;
    stats: {
        athletes_total: number;
        categories_active: number;
        paid_count: number;
        pending_count: number;
        paid_amount: number;
        pending_amount: number;
    };
};

export async function getEventsDashboardSummaries(filters: { search?: string; status?: string; sort?: string }) {
    const { tenant_id } = await requireTenantScope();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    let query = adminSupabase
        .from('events')
        .select(`
            id,
            title,
            event_date,
            status,
            event_registrations(count)
        `)
        .eq('tenant_id', tenant_id);

    if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
    }

    if (filters.sort === 'mais_recentes') {
        query = query.order('created_at', { ascending: false });
    } else {
        query = query.order('event_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching event summaries:', error);
        return [];
    }

    // Processar KPIs por evento
    const { getEventFee } = await import('@/lib/fee-calculator');

    const summaries: EventSummary[] = await Promise.all(data.map(async (event: any) => {
        const [feeRes, { data: statsData }] = await Promise.all([
            getEventFee(event.id),
            adminSupabase
                .from('event_registrations')
                .select('status, price, category_id, payment:payments!payment_id(is_no_split)')
                .eq('event_id', event.id)
        ]);

        const fee = feeRes.fee;

        const paid = statsData?.filter(r => r.status === 'paga' || r.status === 'pago' || r.status === 'confirmado') || [];
        const pending = statsData?.filter(r => r.status === 'pendente' || r.status === 'aguardando_pagamento') || [];
        const uniqueCategoriesActive = new Set(paid.map(r => r.category_id)).size;

        const paidFinancial = paid.filter((r: any) => r.payment?.is_no_split !== true);

        return {
            id: event.id,
            title: event.title,
            event_date: event.event_date,
            status: event.status,
            stats: {
                athletes_total: paid.length,
                categories_active: uniqueCategoriesActive,
                paid_count: paidFinancial.length,
                pending_count: pending.length,
                paid_amount: paidFinancial.reduce((acc: any, current: any) => {
                    const price = Number(current.price || 0);
                    const net = price > 0 ? Math.max(0, price - fee) : 0;
                    return acc + net;
                }, 0),
                pending_amount: pending.reduce((acc: any, current: any) => acc + Number(current.price || 0), 0),
            }
        };
    }));

    if (filters.sort === 'mais_inscricoes') {
        return summaries.sort((a, b) => b.stats.athletes_total - a.stats.athletes_total);
    }
    if (filters.sort === 'maior_faturamento') {
        return summaries.sort((a, b) => b.stats.paid_amount - a.stats.paid_amount);
    }

    return summaries;
}

export async function getEventDashboardDetails(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // Validar IDOR
    const { data: eventExists } = await adminSupabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('tenant_id', tenant_id)
        .single();

    if (!eventExists) throw new Error('Evento não encontrado ou acesso negado.');

    // 1. Série temporal (últimos 14 dias)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: registrations } = await adminSupabase
        .from('event_registrations')
        .select('created_at, status')
        .eq('event_id', eventId)
        .gte('created_at', fourteenDaysAgo.toISOString());

    const timeSeries = registrations?.reduce((acc: any, reg) => {
        const date = new Date(reg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!acc[date]) acc[date] = { date, count: 0 };
        acc[date].count += 1;
        return acc;
    }, {});

    // 2. Distribuição por faixa (Top 5)
    const { data: beltData } = await adminSupabase
        .from('event_registrations')
        .select('athlete:profiles!athlete_id(belt_color)')
        .eq('event_id', eventId);

    const beltCounts = beltData?.reduce((acc: any, item: any) => {
        const belt = item.athlete?.belt_color || 'Não informado';
        acc[belt] = (acc[belt] || 0) + 1;
        return acc;
    }, {});

    const topBelts = Object.entries(beltCounts || {})
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return {
        timeSeries: Object.values(timeSeries || {}),
        topBelts
    };
}

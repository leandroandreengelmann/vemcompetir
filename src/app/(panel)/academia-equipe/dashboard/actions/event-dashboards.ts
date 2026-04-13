'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';

export type EventSummary = {
    id: string;
    title: string;
    event_date: string | null;
    status: string;
    stats: {
        total_registrations: number;
        categories_active: number;

        // Contagens por tipo
        paid_count: number;
        scheduled_count: number;
        pending_count: number;
        courtesy_count: number;
        own_event_count: number;
        promo_free_count: number;

        // Valores (receita bruta, sem desconto de taxa)
        paid_amount: number;
        scheduled_amount: number;
        pending_amount: number;

        // Quem pagou (dentre os pagos)
        paid_by_academy: number;
        paid_by_athlete: number;
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
    const summaries: EventSummary[] = await Promise.all(data.map(async (event: any) => {
        const { data: regs } = await adminSupabase
            .from('event_registrations')
            .select('status, price, category_id, payment_id, promo_type_applied')
            .eq('event_id', event.id);

        const allRegs = regs || [];

        // Buscar payments vinculados para diferenciar cortesia vs evento próprio
        const paymentIds = [...new Set(allRegs.filter(r => r.payment_id).map(r => r.payment_id))];
        let paymentsMap: Record<string, { payer_type: string; asaas_payment_id: string }> = {};

        if (paymentIds.length > 0) {
            const { data: payments } = await adminSupabase
                .from('payments')
                .select('id, payer_type, asaas_payment_id')
                .in('id', paymentIds);

            if (payments) {
                paymentsMap = Object.fromEntries(payments.map(p => [p.id, p]));
            }
        }

        // Classificar cada registro
        let paid_count = 0, scheduled_count = 0, pending_count = 0;
        let courtesy_count = 0, own_event_count = 0, promo_free_count = 0;
        let paid_amount = 0, scheduled_amount = 0, pending_amount = 0;
        let paid_by_academy = 0, paid_by_athlete = 0;
        const paidCategoryIds = new Set<string>();

        for (const reg of allRegs) {
            const price = Number(reg.price || 0);
            const payment = reg.payment_id ? paymentsMap[reg.payment_id] : null;

            if (reg.status === 'isento') {
                if (payment?.asaas_payment_id?.startsWith('own_event_')) {
                    own_event_count++;
                } else {
                    courtesy_count++;
                }
            } else if (reg.status === 'agendado') {
                scheduled_count++;
                scheduled_amount += price;
                if (reg.category_id) paidCategoryIds.add(reg.category_id);
                if (payment?.payer_type === 'ACADEMY') paid_by_academy++;
                else paid_by_athlete++;
            } else if (reg.status === 'pago' || reg.status === 'paga' || reg.status === 'confirmado') {
                paid_count++;
                paid_amount += price;
                if (reg.category_id) paidCategoryIds.add(reg.category_id);
                if (price === 0 && reg.promo_type_applied) promo_free_count++;
                if (payment?.payer_type === 'ACADEMY') paid_by_academy++;
                else paid_by_athlete++;
            } else if (reg.status === 'pendente' || reg.status === 'aguardando_pagamento') {
                pending_count++;
                pending_amount += price;
            }
        }

        return {
            id: event.id,
            title: event.title,
            event_date: event.event_date,
            status: event.status,
            stats: {
                total_registrations: allRegs.length,
                categories_active: paidCategoryIds.size,
                paid_count,
                scheduled_count,
                pending_count,
                courtesy_count,
                own_event_count,
                promo_free_count,
                paid_amount,
                scheduled_amount,
                pending_amount,
                paid_by_academy,
                paid_by_athlete,
            }
        };
    }));

    if (filters.sort === 'mais_inscricoes') {
        return summaries.sort((a, b) => b.stats.total_registrations - a.stats.total_registrations);
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

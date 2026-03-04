'use server';

import { createAdminClient } from '@/lib/supabase/admin';

const adminClient = createAdminClient();

// ─── KPIs de Acesso ────────────────────────────────────────────────────────

export async function getAccessKPIs() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfPrevMonth = new Date(startOfMonth);
    startOfPrevMonth.setMonth(startOfMonth.getMonth() - 1);

    const [today, week, month, prevMonth] = await Promise.all([
        adminClient
            .from('site_analytics')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfToday.toISOString()),
        adminClient
            .from('site_analytics')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfWeek.toISOString()),
        adminClient
            .from('site_analytics')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString()),
        adminClient
            .from('site_analytics')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfPrevMonth.toISOString())
            .lt('created_at', startOfMonth.toISOString()),
    ]);

    const mesAtual = month.count ?? 0;
    const mesAnterior = prevMonth.count ?? 0;
    const variacao = mesAnterior > 0
        ? Math.round(((mesAtual - mesAnterior) / mesAnterior) * 100)
        : 0;

    return {
        hoje: today.count ?? 0,
        semana: week.count ?? 0,
        mes: mesAtual,
        variacaoMes: variacao,
    };
}

// ─── Tendência de Acessos (últimos N dias) ─────────────────────────────────

export async function getAccessTrend(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await adminClient
        .from('site_analytics')
        .select('created_at')
        .gte('created_at', since.toISOString())
        .eq('event_type', 'page_view')
        .order('created_at', { ascending: true });

    if (!data) return [];

    // Agrupa por dia
    const byDay = new Map<string, number>();
    data.forEach((row) => {
        const day = new Date(row.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        });
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
    });

    return Array.from(byDay.entries()).map(([date, views]) => ({ date, views }));
}

// ─── Ranking de Eventos ────────────────────────────────────────────────────

export async function getTopEvents(limit = 10) {
    const { data } = await adminClient
        .from('site_analytics')
        .select('event_id, event_type')
        .not('event_id', 'is', null);

    if (!data) return [];

    const { data: events } = await adminClient
        .from('events')
        .select('id, title');

    const eventMap = new Map(events?.map((e) => [e.id, e.title]) ?? []);

    const countMap = new Map<string, { views: number; clicks: number }>();
    data.forEach((row) => {
        if (!row.event_id) return;
        const current = countMap.get(row.event_id) ?? { views: 0, clicks: 0 };
        if (row.event_type === 'page_view') current.views++;
        if (row.event_type === 'event_click') current.clicks++;
        countMap.set(row.event_id, current);
    });

    return Array.from(countMap.entries())
        .map(([id, stats]) => ({
            eventId: id,
            title: eventMap.get(id) ?? 'Evento desconhecido',
            ...stats,
        }))
        .sort((a, b) => b.views + b.clicks - (a.views + a.clicks))
        .slice(0, limit);
}

// ─── Feed de Atividade Recente ─────────────────────────────────────────────

export async function getRecentActivityFeed(limit = 50) {
    const { data } = await adminClient
        .from('site_analytics')
        .select('id, session_id, user_id, event_type, path, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (!data) return [];

    // Buscar perfis dos usuários identificados
    const userIds = [...new Set(data.filter((r) => r.user_id).map((r) => r.user_id!))] as string[];
    const profileMap = new Map<string, string>();

    if (userIds.length > 0) {
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
        profiles?.forEach((p) => profileMap.set(p.id, p.full_name ?? 'Usuário'));
    }

    return data.map((row) => ({
        id: row.id,
        name: row.user_id ? (profileMap.get(row.user_id) ?? 'Atleta') : 'Visitante',
        isIdentified: !!row.user_id,
        eventType: row.event_type,
        path: row.path,
        time: row.created_at,
    }));
}

// ─── Breakdown Regional ────────────────────────────────────────────────────

export async function getRegionalBreakdown() {
    const { data } = await adminClient
        .from('site_analytics')
        .select('region');

    if (!data) return [];

    const regionMap = new Map<string, number>();
    data.forEach((row) => {
        const region = row.region ?? 'Desconhecida';
        regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    });

    return Array.from(regionMap.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
}

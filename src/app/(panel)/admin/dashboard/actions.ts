'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getDashboardKPIs() {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Total de atletas
    const { count: totalAtletas } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'atleta');

    // 2. Entidades cadastradas
    const { count: totalEntidades } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['academia', 'academia/equipe', 'equipe']);

    // 3. Total de eventos e Pendentes
    const { data: eventosData } = await adminClient
        .from('events')
        .select('id, status');

    const totalEventos = eventosData?.length || 0;
    const eventosPendentes = eventosData?.filter(e => e.status === 'pendente').length || 0;

    // 4. Receita — buscar todas as inscrições válidas com status
    const { data: validRegistrations } = await adminClient
        .from('event_registrations')
        .select('price, status')
        .neq('status', 'carrinho');

    const receitaTotalBruta = validRegistrations?.reduce((acc, r) => acc + Number(r.price || 0), 0) || 0;

    const receitaConfirmada = validRegistrations
        ?.filter(r => r.status === 'pago' || r.status === 'confirmado')
        .reduce((acc, r) => acc + Number(r.price || 0), 0) || 0;

    const receitaPendente = validRegistrations
        ?.filter(r => r.status === 'pendente' || r.status === 'aguardando_pagamento')
        .reduce((acc, r) => acc + Number(r.price || 0), 0) || 0;

    return {
        totalAtletas: totalAtletas || 0,
        totalEntidades: totalEntidades || 0,
        totalEventos,
        eventosPendentes,
        receitaTotalBruta,
        receitaConfirmada,
        receitaPendente
    };
}


export async function getRevenueByEvent() {
    const adminClient = createAdminClient();

    // Buscar todos os eventos aprovados/publicados
    const { data: events } = await adminClient
        .from('events')
        .select('id, title, event_date, status')
        .in('status', ['aprovado', 'publicado'])
        .order('event_date', { ascending: false });

    if (!events) return [];

    // Buscar as inscrições ativas
    const { data: registrations } = await adminClient
        .from('event_registrations')
        .select('event_id, price')
        .neq('status', 'carrinho');

    const ranking = events.map(event => {
        const eventRegs = registrations?.filter(r => r.event_id === event.id) || [];
        const receita = eventRegs.reduce((sum, r) => sum + Number(r.price || 0), 0);
        return {
            id: event.id,
            title: event.title,
            date: event.event_date,
            inscritos: eventRegs.length,
            receita: receita
        };
    });

    // Ordenar do maior faturamento para o menor
    return ranking.sort((a, b) => b.receita - a.receita);
}

export async function getRevenueOverTime() {
    const adminClient = createAdminClient();

    // Fetch valid registrations with their creation date (or update date if payment date is missing)
    const { data: registrations } = await adminClient
        .from('event_registrations')
        .select('created_at, price')
        .neq('status', 'carrinho');

    if (!registrations) return [];

    // Grouping logic by month (e.g. "Jan 2026", "Fev 2026")
    const monthsMap = new Map<string, { faturamento: number, inscricoes: number, rawDate: Date }>();

    registrations.forEach(reg => {
        const d = new Date(reg.created_at);
        // Ex: "fev", "mar" (Utilizando o locale pt-BR)
        const monthYear = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        // Map as key
        const existing = monthsMap.get(monthYear) || { faturamento: 0, inscricoes: 0, rawDate: new Date(d.getFullYear(), d.getMonth(), 1) };

        monthsMap.set(monthYear, {
            faturamento: existing.faturamento + Number(reg.price || 0),
            inscricoes: existing.inscricoes + 1,
            rawDate: existing.rawDate
        });
    });

    // Converter para array e ordenar cronologicamente
    const chartData = Array.from(monthsMap.entries()).map(([month, data]) => ({
        month,
        faturamento: data.faturamento,
        inscricoes: data.inscricoes,
        rawDate: data.rawDate
    })).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    // Retorna apenas os meses (os nomes) e os valores p/ o chart
    return chartData.map(d => ({
        month: d.month.replace('.', '').toUpperCase(), // FEV 2026
        faturamento: d.faturamento,
        inscricoes: d.inscricoes
    }));
}

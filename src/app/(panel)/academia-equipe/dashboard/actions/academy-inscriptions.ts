'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { formatFullCategoryName } from '@/lib/category-utils';
import { classifyRegistration, fetchPaymentsMap } from './registration-classifier';

export async function getAcademyInscriptions(filters: { status?: string; search?: string; eventId?: string; page?: number }) {
    const { tenant_id } = await requireTenantScope();
    const adminSupabase = createAdminClient();
    const pageSize = 20;
    const page = filters.page || 1;

    const needsPostFilter = filters.status === 'cortesia'
        || filters.status === 'pacote'
        || filters.status === 'evento_proprio';

    // Buscar ids dos atletas vinculados à academia (profiles.tenant_id = tenant_id)
    const { data: academyAthletes } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role', 'atleta');
    const athleteIds = (academyAthletes || []).map((a: any) => a.id);

    const hasSearch = !!filters.search;

    let query = adminSupabase
        .from('event_registrations')
        .select(`
            *,
            athlete:profiles!athlete_id${hasSearch ? '!inner' : ''}(full_name, cpf, belt_color),
            event:events!event_id(title, event_date),
            category:category_rows!category_id(categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg)
        `, { count: needsPostFilter ? undefined : 'exact' });

    // OR: inscrição do tenant (cortesias a atletas externos) OU atleta da academia
    if (athleteIds.length > 0) {
        query = query.or(`tenant_id.eq.${tenant_id},athlete_id.in.(${athleteIds.join(',')})`);
    } else {
        query = query.eq('tenant_id', tenant_id);
    }

    if (filters.status && filters.status !== 'todas' && !needsPostFilter) {
        if (filters.status === 'paga') {
            query = query.in('status', ['paga', 'pago', 'confirmado', 'pago_em_mao', 'pix_direto']);
        } else if (filters.status === 'pendente') {
            query = query.in('status', ['pendente', 'aguardando_pagamento']);
        } else {
            query = query.eq('status', filters.status);
        }
    }

    if (needsPostFilter) {
        query = query.in('status', ['isento', 'isento_evento_proprio', 'pago_em_mao', 'pix_direto']);
    }

    if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`, { referencedTable: 'athlete' });
    }

    if (filters.eventId) {
        query = query.eq('event_id', filters.eventId);
    }

    if (needsPostFilter) {
        const { data: allData, error } = await query.order('created_at', { ascending: false });
        const allItems = allData || [];

        const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
        const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

        const filtered = allItems.filter((item: any) => {
            const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
            const { tipo } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
            if (filters.status === 'evento_proprio') return tipo === 'evento_proprio' || tipo === 'isento_evento_proprio' || tipo === 'pago_em_mao' || tipo === 'pix_direto';
            return tipo === filters.status;
        });

        const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

        const processedData = paginated.map((item: any) => {
            if (item.category) item.category.categoria_completa = formatFullCategoryName(item.category);
            const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
            const { tipo, payer_type, manual_method } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
            return { ...item, tipo, payer_type, manual_method };
        });

        return { data: processedData, count: filtered.length, pageSize, error };
    }

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    const allItems = data || [];

    const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
    const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

    const processedData = allItems.map((item: any) => {
        if (item.category) item.category.categoria_completa = formatFullCategoryName(item.category);
        const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
        const { tipo, payer_type, manual_method } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
        return { ...item, tipo, payer_type, manual_method };
    });

    return { data: processedData, count, pageSize, error };
}

export async function getAcademyEventsList() {
    const { tenant_id } = await requireTenantScope();
    const adminSupabase = createAdminClient();

    const { data: academyAthletes } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role', 'atleta');
    const athleteIds = (academyAthletes || []).map((a: any) => a.id);

    let query = adminSupabase
        .from('event_registrations')
        .select('event_id, event:events!event_id(title, event_date)')
        .not('event_id', 'is', null);

    if (athleteIds.length > 0) {
        query = query.or(`tenant_id.eq.${tenant_id},athlete_id.in.(${athleteIds.join(',')})`);
    } else {
        query = query.eq('tenant_id', tenant_id);
    }

    const { data } = await query;

    // Deduplicate by event_id
    const eventsMap = (data || []).reduce((acc: any, item: any) => {
        if (!acc[item.event_id]) {
            acc[item.event_id] = {
                id: item.event_id,
                title: item.event?.title || 'Evento',
                event_date: item.event?.event_date,
            };
        }
        return acc;
    }, {});

    return Object.values(eventsMap).sort((a: any, b: any) => {
        if (!a.event_date || !b.event_date) return 0;
        return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });
}

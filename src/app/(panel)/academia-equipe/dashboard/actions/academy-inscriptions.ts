'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { formatFullCategoryName } from '@/lib/category-utils';

export async function getAcademyInscriptions(filters: { status?: string; search?: string; eventId?: string; page?: number }) {
    const { tenant_id } = await requireTenantScope();
    const adminSupabase = createAdminClient();
    const pageSize = 20;
    const page = filters.page || 1;

    const hasSearch = !!filters.search;

    let query = adminSupabase
        .from('event_registrations')
        .select(`
            *,
            athlete:profiles!athlete_id${hasSearch ? '!inner' : ''}(full_name, cpf, belt_color),
            event:events!event_id(title, event_date),
            category:category_rows!category_id(categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg)
        `, { count: 'exact' })
        .eq('tenant_id', tenant_id);

    if (filters.status && filters.status !== 'todas') {
        if (filters.status === 'paga') {
            query = query.in('status', ['paga', 'pago', 'confirmado']);
        } else if (filters.status === 'pendente') {
            query = query.in('status', ['pendente', 'aguardando_pagamento']);
        } else {
            query = query.eq('status', filters.status);
        }
    }

    if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`, { referencedTable: 'athlete' });
    }

    if (filters.eventId) {
        query = query.eq('event_id', filters.eventId);
    }

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    const processedData = (data || []).map((item: any) => {
        if (item.category) {
            item.category.categoria_completa = formatFullCategoryName(item.category);
        }
        return item;
    });

    return { data: processedData, count, pageSize, error };
}

export async function getAcademyEventsList() {
    const { tenant_id } = await requireTenantScope();
    const adminSupabase = createAdminClient();

    const { data } = await adminSupabase
        .from('event_registrations')
        .select('event_id, event:events!event_id(title, event_date)')
        .eq('tenant_id', tenant_id)
        .not('event_id', 'is', null);

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

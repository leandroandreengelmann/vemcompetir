'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { getEventFee } from '@/lib/fee-calculator';
import { formatFullCategoryName } from '@/lib/category-utils';
import { classifyRegistration, fetchPaymentsMap } from './registration-classifier';

// 1a. Summary de inscrições (KPIs sem paginação)
export async function getEventReportInscricoesSummary(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data: regs } = await adminSupabase
        .from('event_registrations')
        .select('status, price, payment_id, promo_type_applied, manual_payment_method, is_courtesy')
        .eq('event_id', eventId);

    const allRegs = regs || [];
    const paymentIds = [...new Set(allRegs.filter(r => r.payment_id).map(r => r.payment_id))];
    const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

    let paid_count = 0, scheduled_count = 0, pending_count = 0;
    let courtesy_count = 0, pacote_count = 0, own_event_count = 0, promo_free_count = 0;
    let paid_amount = 0, scheduled_amount = 0, pending_amount = 0;
    let paid_by_academy = 0, paid_by_athlete = 0;

    for (const reg of allRegs) {
        const price = Number(reg.price || 0);
        const payment = reg.payment_id ? paymentsMap[reg.payment_id] : null;
        const { tipo } = classifyRegistration(reg.status, payment, (reg as any).manual_payment_method, (reg as any).is_courtesy);

        if (tipo === 'cortesia') courtesy_count++;
        else if (tipo === 'pacote') pacote_count++;
        else if (tipo === 'evento_proprio' || tipo === 'isento_evento_proprio') own_event_count++;
        else if (tipo === 'pago_em_mao' || tipo === 'pix_direto') {
            own_event_count++;
            paid_count++;
            paid_amount += price;
        } else if (tipo === 'agendado') {
            scheduled_count++;
            scheduled_amount += price;
            if (payment?.payer_type === 'ACADEMY') paid_by_academy++; else paid_by_athlete++;
        } else if (tipo === 'pago') {
            paid_count++;
            paid_amount += price;
            if (price === 0 && reg.promo_type_applied) promo_free_count++;
            if (payment?.payer_type === 'ACADEMY') paid_by_academy++; else paid_by_athlete++;
        } else if (tipo === 'pendente') {
            pending_count++;
            pending_amount += price;
        }
    }

    return {
        total_registrations: allRegs.length,
        paid_count, scheduled_count, pending_count,
        courtesy_count, pacote_count, own_event_count, promo_free_count,
        paid_amount, scheduled_amount, pending_amount,
        paid_by_academy, paid_by_athlete,
    };
}

// 1b. Inscrições paginadas
export async function getEventReportInscricoes(eventId: string, filters: { status?: string; search?: string; categoryId?: string; page?: number }) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();
    const pageSize = 20;
    const page = filters.page || 1;

    // Verificar IDOR
    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const hasSearch = !!filters.search;

    // Filtros que precisam post-filtrar
    const needsPostFilter = filters.status === 'cortesia' || filters.status === 'pacote' || filters.status === 'evento_proprio' || filters.status === 'sem_receita' || filters.status === 'promo_gratis';

    let query = adminSupabase
        .from('event_registrations')
        .select(`
            *,
            athlete:profiles!athlete_id${hasSearch ? '!inner' : ''}(full_name, cpf, belt_color, gym_name),
            category:category_rows!category_id(categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg)
        `, { count: needsPostFilter ? undefined : 'exact' })
        .eq('event_id', eventId);

    if (filters.status && filters.status !== 'todas' && !needsPostFilter) {
        if (filters.status === 'paga') {
            query = query.in('status', ['paga', 'pago', 'confirmado', 'pago_em_mao', 'pix_direto']);
        } else if (filters.status === 'pagas_todas') {
            query = query.in('status', ['paga', 'pago', 'confirmado', 'agendado', 'pago_em_mao', 'pix_direto']);
        } else if (filters.status === 'pendente') {
            query = query.in('status', ['pendente', 'aguardando_pagamento']);
        } else {
            query = query.eq('status', filters.status);
        }
    }

    if (needsPostFilter) {
        if (filters.status === 'promo_gratis') {
            query = query.in('status', ['paga', 'pago', 'confirmado']);
        } else if (filters.status === 'evento_proprio' || filters.status === 'sem_receita') {
            query = query.in('status', ['isento', 'isento_evento_proprio', 'pago_em_mao', 'pix_direto']);
        } else {
            query = query.eq('status', 'isento');
        }
    }

    if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`, { referencedTable: 'athlete' });
    }

    if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
    }

    if (needsPostFilter) {
        // Buscar todos os isentos sem paginação para post-filtrar
        const { data: allData, error } = await query.order('created_at', { ascending: false });
        const allItems = allData || [];

        // Buscar payments para diferenciar cortesia vs evento próprio
        const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
        const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

        const filtered = allItems.filter((item: any) => {
            const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
            const { tipo } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
            if (filters.status === 'sem_receita') return tipo === 'cortesia' || tipo === 'pacote' || tipo === 'evento_proprio' || tipo === 'isento_evento_proprio';
            if (filters.status === 'evento_proprio') return tipo === 'evento_proprio' || tipo === 'isento_evento_proprio' || tipo === 'pago_em_mao' || tipo === 'pix_direto';
            if (filters.status === 'promo_gratis') return Number(item.price || 0) === 0 && !!item.promo_type_applied;
            return tipo === filters.status;
        });

        const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

        const processedData = paginatedData.map((item: any) => {
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

    // Buscar payments para enriquecer com tipo e payer_type
    const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
    const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

    const processedData = allItems.map((item: any) => {
        if (item.category) item.category.categoria_completa = formatFullCategoryName(item.category);
        const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
        const { tipo, payer_type, manual_method } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
        return { ...item, tipo, payer_type, manual_method };
    });

    return {
        data: processedData,
        count: count,
        pageSize,
        error
    };
}

// 2. Atletas Únicos
export async function getEventReportAtletas(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Validar IDOR...
    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            athlete_id,
            athlete:profiles!athlete_id(full_name, cpf, belt_color, gym_name),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId);

    // Agrupar por atleta
    const athletesMap = data?.reduce((acc: any, item: any) => {
        const id = item.athlete_id;
        if (!acc[id]) {
            acc[id] = {
                ...item.athlete,
                categories: []
            };
        }

        let cat = item.category?.categoria_completa || 'Sem categoria';
        if (cat.toLowerCase().includes('absoluto')) {
            const parts = cat.split(' • ');
            if (parts.length >= 4) {
                cat = parts.slice(-4).join(' • ');
            }
        }

        acc[id].categories.push(cat);
        return acc;
    }, {});

    return {
        data: Object.values(athletesMap || {}),
        error
    };
}

// 3. Categorias
export async function getEventReportCategorias(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            status,
            category_id,
            payment_id,
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', ['carrinho', 'pendente', 'aguardando_pagamento', 'paga', 'pago', 'confirmado', 'isento']);

    const categoryMap = (data || []).reduce((acc: any, item: any) => {
        let cat = item.category?.categoria_completa || 'Sem categoria';

        if (cat.toLowerCase().includes('absoluto')) {
            const parts = cat.split(' • ');
            if (parts.length >= 4) {
                cat = parts.slice(-4).join(' • ');
            }
        }

        const st = item.status;

        if (!acc[cat]) {
            acc[cat] = { name: cat, count: 0, cart: 0, pending: 0, paid: 0 };
        }

        acc[cat].count += 1;

        if (st === 'carrinho') acc[cat].cart += 1;
        else if (st === 'pendente' || st === 'aguardando_pagamento') acc[cat].pending += 1;
        else if (st === 'paga' || st === 'pago' || st === 'confirmado' || st === 'isento') acc[cat].paid += 1;

        return acc;
    }, {});

    return {
        data: Object.values(categoryMap || {}),
        error
    };
}

// 4. Financeiro
export async function getEventReportFinanceiro(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            status,
            price,
            created_at,
            payment_id,
            promo_type_applied,
            is_courtesy,
            manual_payment_method,
            athlete:profiles!athlete_id(full_name),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId);

    const allRegs = data || [];

    // Buscar payments para classificação
    const paymentIds = [...new Set(allRegs.filter(r => r.payment_id).map(r => r.payment_id))];
    const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

    // Classificar e processar cada registro
    let paid_count = 0, scheduled_count = 0, pending_count = 0;
    let courtesy_count = 0, pacote_count = 0, own_event_count = 0, promo_free_count = 0;
    let paid_amount = 0, scheduled_amount = 0, pending_amount = 0;
    let paid_by_academy = 0, paid_by_athlete = 0;

    const processedData = allRegs.map((item: any) => {
        let cat = item.category?.categoria_completa || 'Sem categoria';
        if (cat.toLowerCase().includes('absoluto')) {
            const parts = cat.split(' • ');
            if (parts.length >= 4) cat = parts.slice(-4).join(' • ');
        }

        const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
        const { tipo, payer_type, manual_method } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
        const price = Number(item.price || 0);

        // Acumular summary
        if (tipo === 'cortesia') courtesy_count++;
        else if (tipo === 'pacote') pacote_count++;
        else if (tipo === 'evento_proprio' || tipo === 'isento_evento_proprio') own_event_count++;
        else if (tipo === 'pago_em_mao' || tipo === 'pix_direto') {
            own_event_count++;
            paid_count++;
            paid_amount += price;
        } else if (tipo === 'agendado') {
            scheduled_count++;
            scheduled_amount += price;
            if (payment?.payer_type === 'ACADEMY') paid_by_academy++; else paid_by_athlete++;
        } else if (tipo === 'pago') {
            paid_count++;
            paid_amount += price;
            if (price === 0 && item.promo_type_applied) promo_free_count++;
            if (payment?.payer_type === 'ACADEMY') paid_by_academy++; else paid_by_athlete++;
        } else if (tipo === 'pendente') {
            pending_count++;
            pending_amount += price;
        }

        return {
            ...item,
            athlete: item.athlete?.full_name || 'Desconhecido',
            category: cat,
            tipo,
            payer_type,
        };
    });

    return {
        summary: {
            total_registrations: allRegs.length,
            paid_count, scheduled_count, pending_count,
            courtesy_count, pacote_count, own_event_count, promo_free_count,
            paid_amount, scheduled_amount, pending_amount,
            paid_by_academy, paid_by_athlete,
        },
        data: processedData,
        error
    };
}

export async function getEventCategoryDetails(eventId: string, categoryName: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            id,
            status,
            created_at,
            athlete:profiles!athlete_id(full_name, cpf, belt_color, gym_name),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', ['carrinho', 'pendente', 'aguardando_pagamento', 'paga', 'pago', 'confirmado', 'isento']);

    if (error) {
        console.error('Error fetching category details:', error);
        return { data: [], error };
    }

    // Filter by the reconstructed category name
    const processedData = (data || []).filter((item: any) => {
        let cat = item.category?.categoria_completa || 'Sem categoria';

        if (cat.toLowerCase().includes('absoluto')) {
            const parts = cat.split(' • ');
            if (parts.length >= 4) {
                cat = parts.slice(-4).join(' • ');
            }
        }

        return cat === categoryName;
    }).map((item: any) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        athlete: item.athlete?.full_name || 'Desconhecido',
        gym: item.athlete?.gym_name || 'Sem Equipe'
    }));

    return { data: processedData, error: null };
}

// 6. Paid athletes for bracket generation
export async function getCategoryBracketAthletes(eventId: string, categoryName: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase.from('events').select('id, owner_tenant_id:tenant_id').eq('id', eventId).single();
    if (event?.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            athlete:profiles!athlete_id(full_name, gym_name),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', ['paga', 'pago', 'confirmado', 'isento']);

    if (error) {
        console.error('Error fetching bracket athletes:', error);
        return { data: [], error };
    }

    const athletes = (data || [])
        .filter((item: any) => {
            let cat = item.category?.categoria_completa || 'Sem categoria';
            if (cat.toLowerCase().includes('absoluto')) {
                const parts = cat.split(' • ');
                if (parts.length >= 4) cat = parts.slice(-4).join(' • ');
            }
            return cat === categoryName;
        })
        .map((item: any) => ({
            name: item.athlete?.full_name || 'Desconhecido',
            team: item.athlete?.gym_name || 'Sem Equipe',
        }));

    return { data: athletes, error: null };
}

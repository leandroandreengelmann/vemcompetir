'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { getEventFee } from '@/lib/fee-calculator';
import { formatFullCategoryName } from '@/lib/category-utils';

// 1. Inscrições
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

    let query = adminSupabase
        .from('event_registrations')
        .select(`
            *,
            athlete:profiles!athlete_id${hasSearch ? '!inner' : ''}(full_name, cpf, belt_color, gym_name),
            category:category_rows!category_id(categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg)
        `, { count: 'exact' })
        .eq('event_id', eventId);

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

    if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
    }

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    const processedData = (data || [])
        .map((item: any) => {
            if (item.category) {
                item.category.categoria_completa = formatFullCategoryName(item.category);
            }
            return item;
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
        .in('status', ['carrinho', 'pendente', 'aguardando_pagamento', 'paga', 'pago', 'confirmado']);

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
        else if (st === 'paga' || st === 'pago' || st === 'confirmado') acc[cat].paid += 1;

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

    const [eventFeeRes, { data, error }] = await Promise.all([
        getEventFee(eventId),
        adminSupabase
            .from('event_registrations')
            .select(`
                status,
                price,
                created_at,
                payment_id,
                athlete:profiles!athlete_id(full_name),
                category:category_rows!category_id(categoria_completa)
            `)
            .eq('event_id', eventId)
    ]);

    const fee = eventFeeRes.fee;

    const processedData = (data || [])
        .map((item: any) => {
            let cat = item.category?.categoria_completa || 'Sem categoria';

            if (cat.toLowerCase().includes('absoluto')) {
                const parts = cat.split(' • ');
                if (parts.length >= 4) {
                    cat = parts.slice(-4).join(' • ');
                }
            }

            return {
                ...item,
                athlete: item.athlete?.full_name || 'Desconhecido',
                category: cat
            };
        });

    const paid = processedData.filter((r: any) => r.status === 'paga' || r.status === 'pago' || r.status === 'confirmado');
    const pending = processedData.filter((r: any) => r.status === 'pendente' || r.status === 'aguardando_pagamento');
    const cart = processedData.filter((r: any) => r.status === 'carrinho');

    const paid_amount = paid.reduce((acc: number, r: any) => {
        const val = Number(r.price || 0);
        const liquid = val > 0 ? Math.max(0, val - fee) : 0;
        return acc + liquid;
    }, 0);

    const pending_amount = pending.reduce((acc: number, r: any) => acc + Number(r.price || 0), 0);
    const cart_amount = cart.reduce((acc: number, r: any) => acc + Number(r.price || 0), 0);

    return {
        summary: {
            paid_amount,
            pending_amount,
            cart_amount,
            paid_count: paid.length,
            pending_count: pending.length,
            cart_count: cart.length
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
        .in('status', ['carrinho', 'pendente', 'aguardando_pagamento', 'paga', 'pago', 'confirmado']);

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
        .in('status', ['paga', 'pago', 'confirmado']);

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

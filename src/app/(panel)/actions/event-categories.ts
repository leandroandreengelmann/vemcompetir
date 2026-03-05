'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export async function linkCategoryTables(eventId: string, tableIds: string[]) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Security check: if not admin, must own the event
    if (profile.role !== 'admin_geral') {
        const { data: event } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('tenant_id', tenant_id)
            .single();

        if (!event) return { error: 'Evento não encontrado ou sem permissão.' };
    }

    // Insert associations
    const toInsert = tableIds.map(tableId => ({
        event_id: eventId,
        category_table_id: tableId
        // tenant_id will be handled by the trigger
    }));

    const { error } = await supabase
        .from('event_category_tables')
        .upsert(toInsert, { onConflict: 'event_id, category_table_id' });

    if (error) {
        console.error('Error linking category tables:', error);
        return { error: 'Erro ao vincular categorias.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/categorias`);
    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/categorias`);
    return { success: true };
}

export async function unlinkCategoryTable(eventId: string, tableId: string) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Security check: if not admin, must own the event
    if (profile.role !== 'admin_geral') {
        const { data: event } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('tenant_id', tenant_id)
            .single();

        if (!event) return { error: 'Evento não encontrado ou sem permissão.' };
    }

    const { error } = await supabase
        .from('event_category_tables')
        .delete()
        .eq('event_id', eventId)
        .eq('category_table_id', tableId);

    if (error) {
        console.error('Error unlinking category table:', error);
        return { error: 'Erro ao desvincular categoria.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/categorias`);
    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/categorias`);
    return { success: true };
}

export async function getEventCategoryTables(eventId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_category_tables')
        .select(`
            category_table_id,
            category_tables (
                id,
                name,
                description,
                category_rows (count)
            )
        `)
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching event category tables:', error);
        return [];
    }

    return data.map((item: any) => ({
        ...item.category_tables,
        count: item.category_tables?.category_rows?.[0]?.count || 0
    }));
}

export async function getAvailableCategoryTables() {
    const { profile } = await requireRole(['admin_geral', 'academia/equipe']);
    const supabase = await createClient();

    // Fetch all tables (catalog)
    const { data, error } = await supabase
        .from('category_tables')
        .select(`
            *,
            category_rows(count)
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching available tables:', error);
        return [];
    }

    return data.map((item: any) => ({
        ...item,
        count: item.category_rows?.[0]?.count || 0
    }));
}


export async function updateEventCategoryTablePrice(eventId: string, tableId: string, price: number) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Security check: if not admin, must own the event
    if (profile.role !== 'admin_geral') {
        const { data: event } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('tenant_id', tenant_id)
            .single();

        if (!event) return { error: 'Evento não encontrado ou sem permissão.' };
    }

    const { error } = await supabase
        .from('event_category_tables')
        .update({ registration_fee: price })
        .eq('event_id', eventId)
        .eq('category_table_id', tableId);

    if (error) {
        console.error('Error updating table price:', error);
        return { error: 'Erro ao atualizar preço do lote.' };
    }

    revalidatePath(`/admin/dashboard/eventos/${eventId}/categorias`);
    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/categorias`);
    return { success: true };
}

export async function updateEventCategoryIndividualPrice(eventId: string, categoryId: string, price: number | null) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Security check: if not admin, must own the event
    if (profile.role !== 'admin_geral') {
        const { data: event } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('tenant_id', tenant_id)
            .single();

        if (!event) return { error: 'Evento não encontrado ou sem permissão.' };
    }

    if (price === null) {
        // Delete override
        const { error } = await supabase
            .from('event_category_overrides')
            .delete()
            .eq('event_id', eventId)
            .eq('category_id', categoryId);

        if (error) return { error: 'Erro ao remover preço individual.' };
    } else {
        // Intelligent Save: Fetch global price first
        // 1. Get the table_id for this category
        const { data: catData } = await supabase
            .from('category_rows')
            .select('table_id')
            .eq('id', categoryId)
            .single();

        if (!catData) return { error: 'Categoria não encontrada.' };

        // 2. Get global price for this table in this event
        const { data: tableData } = await supabase
            .from('event_category_tables')
            .select('registration_fee')
            .eq('event_id', eventId)
            .eq('category_table_id', catData.table_id)
            .single();

        const globalPrice = tableData?.registration_fee || 0;

        // 3. If price matches global, just delete the override (acts as a reset)
        if (price === globalPrice) {
            await supabase
                .from('event_category_overrides')
                .delete()
                .eq('event_id', eventId)
                .eq('category_id', categoryId);

            return { success: true, reset: true };
        }

        // 4. Otherwise upsert override
        const { error } = await supabase
            .from('event_category_overrides')
            .upsert({
                event_id: eventId,
                category_id: categoryId,
                registration_fee: price,
                updated_at: new Date().toISOString()
            }, { onConflict: 'event_id, category_id' });

        if (error) {
            console.error('Error updating individual price:', error);
            return { error: 'Erro ao atualizar preço individual.' };
        }
    }

    return { success: true };
}

export async function getEventCategoriesWithPrices(
    eventId: string,
    tableId: string,
    page: number = 1,
    pageSize: number = 50,
    search: string = ''
) {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Get default price for the table
    const { data: tableData } = await supabase
        .from('event_category_tables')
        .select('registration_fee')
        .eq('event_id', eventId)
        .eq('category_table_id', tableId)
        .single();

    const defaultPrice = tableData?.registration_fee || 0;

    // 2. Get total count for this table (with filter if search exists)
    let countQuery = supabase
        .from('category_rows')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId);

    if (search) {
        countQuery = countQuery.ilike('categoria_completa', `%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    // 3. Get categories (paginated)
    let categoriesQuery = supabase
        .from('category_rows')
        .select('*')
        .eq('table_id', tableId)
        .order('categoria_completa', { ascending: true })
        .range(from, to);

    if (search) {
        categoriesQuery = categoriesQuery.ilike('categoria_completa', `%${search}%`);
    }

    const { data: categories } = await categoriesQuery;

    if (!categories) return { categories: [], totalCount: 0, overridesCount: 0, defaultPrice };

    // 4. Get overrides for these specific categories to calculate final prices
    const categoryIds = categories.map(c => c.id);
    const { data: pageOverrides } = await supabase
        .from('event_category_overrides')
        .select('category_id, registration_fee')
        .eq('event_id', eventId)
        .in('category_id', categoryIds);

    const pageOverridesMap = new Map(pageOverrides?.map(o => [o.category_id, o.registration_fee]));

    // 5. Get TOTAL overrides count for this table (for the summary card)
    // ONLY count categories where registration_fee is DIFFERENT from defaultPrice
    const { count: overridesCount } = await supabase
        .from('event_category_overrides')
        .select('category_id, category_rows!inner(table_id)', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('category_rows.table_id', tableId)
        .neq('registration_fee', defaultPrice);

    // 6. Get enrolled athlete counts and previews
    const supabaseAdmin = createAdminClient();
    const { data: countsData } = await supabaseAdmin
        .from('event_registrations')
        .select(`
            category_id,
            athlete:profiles!athlete_id(full_name)
        `)
        .eq('event_id', eventId)
        .in('category_id', categoryIds)
        .in('status', ['pago', 'isento', 'confirmado'])
        .order('created_at', { ascending: true }); // Important to get the first ones consistently

    const countMap = new Map<string, number>();
    const previewMap = new Map<string, string[]>();

    countsData?.forEach(row => {
        const catId = row.category_id;
        const name = (row.athlete as any)?.full_name || 'Competidor';

        countMap.set(catId, (countMap.get(catId) || 0) + 1);

        if (!previewMap.has(catId)) {
            previewMap.set(catId, []);
        }

        const previews = previewMap.get(catId)!;
        if (previews.length < 3) {
            // Pick first name or short name for preview
            const shortName = name.split(' ').slice(0, 2).join(' ');
            previews.push(shortName);
        }
    });

    return {
        categories: categories.map(cat => {
            const overridePrice = pageOverridesMap.get(cat.id);
            // Intelligent override detection: only treat as override if price differs from default
            const isDifferent = overridePrice !== undefined && overridePrice !== defaultPrice;
            const finalOverridePrice = isDifferent ? overridePrice : null;

            return {
                ...cat,
                base_price: defaultPrice,
                override_price: finalOverridePrice,
                registration_fee: finalOverridePrice ?? defaultPrice,
                is_override: isDifferent,
                registered_count: countMap.get(cat.id) || 0,
                preview_athletes: previewMap.get(cat.id) || []
            };
        }),
        totalCount: totalCount || 0,
        overridesCount: overridesCount || 0,
        defaultPrice
    };
}

/**
 * Unified search for athlete:
 * Searches across all category_rows of all category_tables linked to the event.
 * Now includes pricing logic.
 */
export async function searchEventCategories(eventId: string, query: string) {
    const supabase = await createClient();

    // 1. Get linked category table IDs and their default prices
    const { data: linkedTables, error: linkError } = await supabase
        .from('event_category_tables')
        .select('category_table_id, registration_fee')
        .eq('event_id', eventId);

    if (linkError || !linkedTables || linkedTables.length === 0) return [];

    const tableIds = linkedTables.map(lt => lt.category_table_id);
    const tablePriceMap = new Map(linkedTables.map(lt => [lt.category_table_id, lt.registration_fee]));

    // 2. Search category_rows
    let supabaseQuery = supabase
        .from('category_rows')
        .select('*')
        .in('table_id', tableIds)
        .order('categoria_completa', { ascending: true })
        .limit(100);

    if (query) {
        supabaseQuery = supabaseQuery.ilike('categoria_completa', `%${query}%`);
    }

    const { data: rows, error: searchError } = await supabaseQuery;

    if (searchError || !rows) {
        console.error('Error searching categories:', searchError);
        return [];
    }

    // 3. Get all overrides for this event
    const { data: overrides } = await supabase
        .from('event_category_overrides')
        .select('category_id, registration_fee')
        .eq('event_id', eventId);

    const overridesMap = new Map(overrides?.map(o => [o.category_id, o.registration_fee]));

    // 3.5 Get enrolled athlete counts and previews for this event
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client to bypass RLS and read all athlete profiles for previews
    const supabaseAdmin = createAdminClient();
    const { data: countsData } = await supabaseAdmin
        .from('event_registrations')
        .select(`
            category_id,
            athlete_id,
            athlete:profiles!athlete_id(full_name)
        `)
        .eq('event_id', eventId)
        .in('status', ['pago', 'isento', 'confirmado'])
        .order('created_at', { ascending: true });

    const countMap = new Map<string, number>();
    const previewMap = new Map<string, string[]>();
    const myEnrolledCategoryIds = new Set<string>();

    countsData?.forEach(row => {
        const catId = row.category_id;
        const name = (row.athlete as any)?.full_name || 'Competidor';

        countMap.set(catId, (countMap.get(catId) || 0) + 1);

        if (!previewMap.has(catId)) {
            previewMap.set(catId, []);
        }

        const previews = previewMap.get(catId)!;
        if (previews.length < 3) {
            const shortName = name.split(' ').slice(0, 2).join(' ');
            previews.push(shortName);
        }

        if (user && row.athlete_id === user.id) {
            myEnrolledCategoryIds.add(catId);
        }
    });

    // 4. Merge prices and counts, and filter out already enrolled categories
    return rows
        .filter(row => !myEnrolledCategoryIds.has(row.id))
        .map(row => {
            const defaultPrice = tablePriceMap.get(row.table_id) || 0;
            const overridePrice = overridesMap.get(row.id);
            const registeredCount = countMap.get(row.id) || 0;

            return {
                ...row,
                registration_fee: overridePrice ?? defaultPrice,
                registered_count: registeredCount,
                preview_athletes: previewMap.get(row.id) || []
            };
        });
}

/**
 * Returns names and basic details of registered athletes for a specific category.
 * Used for lazy loading in the UI expansion segment for categories.
 */
export async function getCategoryEnrolledAthletes(eventId: string, categoryId: string) {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from('event_registrations')
        .select(`
            athlete_id,
            athlete:profiles!athlete_id(full_name, belt_color, gym_name)
        `)
        .eq('event_id', eventId)
        .eq('category_id', categoryId)
        .in('status', ['pago', 'isento', 'confirmado']);

    if (error || !data) {
        console.error('Error fetching enrolled athletes:', error);
        return [];
    }

    return data.map((reg: any) => ({
        id: reg.athlete_id,
        name: reg.athlete?.full_name || 'Competidor Anônimo',
        belt: reg.athlete?.belt_color || 'Faixa não informada',
        gym: reg.athlete?.gym_name || 'Sem Equipe'
    }));
}

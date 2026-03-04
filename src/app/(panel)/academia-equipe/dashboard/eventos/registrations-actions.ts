'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { checkEligibility, parseAgeRangeFromText, isMasterLivre, normalizeText } from '@/lib/registration-logic';

export async function registerAthleteAction(
    eventId: string,
    athleteId: string,
    categoryId: string
) {
    const { profile, tenant_id } = await requireTenantScope();

    if (!profile) return { error: 'Não autorizado.' };

    const supabase = await createClient();

    // Check if already registered
    const { data: existing } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId)
        .eq('category_id', categoryId)
        .single();

    if (existing) {
        return { error: 'Atleta já inscrito nesta categoria.' };
    }

    const { error } = await supabase
        .from('event_registrations')
        .insert({
            event_id: eventId,
            athlete_id: athleteId,
            category_id: categoryId,
            registered_by: profile.id,
            tenant_id: tenant_id,
            status: 'pendente'
        });

    if (error) {
        console.error('Registration error:', error);
        return { error: 'Erro ao realizar inscrição.' };
    }

    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
    revalidatePath(`/academia-equipe/dashboard/eventos/disponiveis`);
    return { success: true };
}

export async function removeRegistrationAction(registrationId: string) {
    const { profile } = await requireTenantScope();
    const supabase = await createClient();

    // Verify ownership or permission
    const { data: registration } = await supabase
        .from('event_registrations')
        .select('registered_by, event_id, tenant_id')
        .eq('id', registrationId)
        .single();

    if (!registration) return { error: 'Inscrição não encontrada.' };

    // Allow removal if:
    // 1. User created the registration
    // 2. User is the organizer of the event (via tenant check on event, simplified here to just query)

    // Check if user is the registration owner
    const isOwner = registration.registered_by === profile.id;

    // Check if user is the event organizer
    const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', registration.event_id)
        .single();

    const isOrganizer = event?.tenant_id === profile.tenant_id;

    if (!isOwner && !isOrganizer) {
        return { error: 'Sem permissão para remover esta inscrição.' };
    }

    const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);

    if (error) {
        return { error: 'Erro ao remover inscrição.' };
    }

    revalidatePath(`/academia-equipe/dashboard/eventos/${registration.event_id}/inscricoes`);
    return { success: true };
}

export async function registerBatchAction(
    eventId: string,
    registrations: { athleteId: string, categoryId: string }[]
) {
    const { profile, tenant_id } = await requireTenantScope();

    if (!profile) return { error: 'Não autorizado.' };

    const supabase = await createClient();

    // 1. Check for duplicates in the batch itself
    const uniqueRegistrations = registrations.filter((reg, index, self) =>
        index === self.findIndex((t) => (
            t.athleteId === reg.athleteId && t.categoryId === reg.categoryId
        ))
    );

    if (uniqueRegistrations.length === 0) return { error: 'Nenhuma inscrição válida enviada.' };

    // 2. Check for existing registrations in DB
    const { data: existingRegistrations } = await supabase
        .from('event_registrations')
        .select('athlete_id, category_id')
        .eq('event_id', eventId)
        .in('athlete_id', uniqueRegistrations.map(r => r.athleteId));

    const existingSet = new Set(
        existingRegistrations?.map(r => `${r.athlete_id}-${r.category_id}`) || []
    );

    // Filter out athletes already registered IN THAT CATEGORY
    const newRegistrations = uniqueRegistrations.filter(r => !existingSet.has(`${r.athleteId}-${r.categoryId}`));

    if (newRegistrations.length === 0) {
        return { error: 'Todos os atletas selecionados já estão inscritos nas categorias indicadas.' };
    }

    // 3. Prepare inserts
    const inserts = newRegistrations.map(reg => ({
        event_id: eventId,
        athlete_id: reg.athleteId,
        category_id: reg.categoryId,
        registered_by: profile.id,
        tenant_id: tenant_id,
        status: 'pendente'
    }));

    const { error } = await supabase
        .from('event_registrations')
        .insert(inserts);

    if (error) {
        console.error('Batch registration error:', error);
        return { error: 'Erro ao realizar inscrições em lote.' };
    }

    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
    revalidatePath(`/academia-equipe/dashboard/eventos/disponiveis`);

    return {
        success: true,
        count: newRegistrations.length,
        skipped: uniqueRegistrations.length - newRegistrations.length
    };
}


/**
 * Enhanced Category Match Action using Robust Logic
 */
export async function getEligibleCategoriesAction(
    eventId: string,
    athleteId: string
) {
    const supabase = await createClient();

    // 1. Fetch Athlete Profile
    const { data: athlete } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', athleteId)
        .single();

    if (!athlete) return { error: 'Atleta não encontrado' };

    // 2. Fetch Event (for date)
    const { data: event } = await supabase
        .from('events')
        .select('event_date')
        .eq('id', eventId)
        .single();

    // 3. Fetch all categories for this event
    const { data: linkedTables } = await supabase
        .from('event_category_tables')
        .select('category_table_id, registration_fee')
        .eq('event_id', eventId);

    if (!linkedTables || linkedTables.length === 0) return { suggestions: [], all: [] };

    const tableIds = linkedTables.map(lt => lt.category_table_id);
    const tablePriceMap = new Map(linkedTables.map(lt => [lt.category_table_id, lt.registration_fee]));

    let allCategories: any[] = [];
    let page = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: categories, error } = await supabase
            .from('category_rows')
            .select('*')
            .in('table_id', tableIds)
            .range(page * limit, (page + 1) * limit - 1);

        if (error || !categories || categories.length === 0) {
            hasMore = false;
        } else {
            allCategories = [...allCategories, ...categories];
            if (categories.length < limit) {
                hasMore = false;
            } else {
                page++;
            }
        }
    }

    const categories = allCategories;

    if (!categories || categories.length === 0) return { suggestions: [], all: [] };

    // 4. Overrides
    const { data: overrides } = await supabase
        .from('event_category_overrides')
        .select('category_id, registration_fee')
        .eq('event_id', eventId);

    const overridesMap = new Map(overrides?.map(o => [o.category_id, o.registration_fee]));

    // 5. Process Eligibility
    const processed = await Promise.all(categories.map(async (cat: any) => {
        const match = await checkEligibility(athlete, cat, event?.event_date || null);

        let score = 0;
        const masterLivre = await isMasterLivre(cat.divisao_idade, cat.peso_min_kg, cat.peso_max_kg);
        if (!masterLivre) {
            const ageRange = await parseAgeRangeFromText(cat.divisao_idade, cat.categoria_completa, cat.idade);
            if (ageRange.parse_ok && !ageRange.wildcard) score += 1;
            if (cat.peso_min_kg !== null || cat.peso_max_kg !== null) score += 1;
        }

        const price = overridesMap.get(cat.id) ?? tablePriceMap.get(cat.table_id) ?? 0;

        return {
            ...cat,
            registration_fee: price,
            match,
            score
        };
    }));

    // Split into Suggestions (Matches) and All
    const suggestions = processed
        .filter(p => p.match.eligible)
        .sort((a, b) => b.score - a.score || a.categoria_completa.localeCompare(b.categoria_completa));

    // For "All" tab: sort by title
    const all = processed.sort((a, b) => a.categoria_completa.localeCompare(b.categoria_completa));

    return { suggestions, all };
}

export async function getAvailableEventsAction() {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Fetch published events
    // We might want to exclude events from the current tenant if they are already in "Meus Eventos",
    // but the user might want to see them here too. 
    // Let's return all published events.

    // Check what is the status string. Assuming 'publicado' based on previous context.
    // If 'status' column is not consistent, we might need to adjust.
    // Earlier inspection showed 'pendente', 'aprovado'. 
    // Let's assume 'publicado' is the target status for availability.
    // Or maybe 'aprovado' if published process is not fully implemented.
    // PROPOSAL: Fetch both 'aprovado' and 'publicado'.

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['aprovado', 'publicado'])
        .gte('event_date', new Date().toISOString()) // Only future events?
        .order('event_date', { ascending: true });

    if (error) return [];

    return data;
}

export async function getEventRegistrationsAction(eventId: string) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // 1. Check if user is the event organizer
    const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', eventId)
        .single();

    const isOrganizer = event?.tenant_id === tenant_id;

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // 2. Build Query
    let query = (isOrganizer ? adminSupabase : supabase)
        .from('event_registrations')
        .select(`
            id,
            status,
            created_at,
            registered_by,
            athlete:profiles!athlete_id (
                id,
                full_name,
                belt_color,
                weight,
                sexo,
                birth_date
            ),
            category:category_rows!category_id (
                id,
                divisao_idade,
                categoria_peso,
                sexo,
                faixa,
                peso_max_kg,
                categoria_completa
            ),
            registered_by_profile:profiles!registered_by (
                full_name,
                gym_name
            )
        `)
        .eq('event_id', eventId);

    // 3. Apply Filter if NOT organizer
    if (!isOrganizer) {
        // Participants only see their own registrations
        query = query.eq('tenant_id', tenant_id);
    }

    // Exclude cart items
    query = query.neq('status', 'carrinho');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching registrations:", JSON.stringify(error, null, 2));
        return [];
    }

    return data;
}

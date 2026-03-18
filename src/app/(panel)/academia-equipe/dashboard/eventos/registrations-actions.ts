'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { checkEligibility, parseAgeRangeFromText, isMasterLivre, normalizeText } from '@/lib/registration-logic';
import { createAdminClient } from '@/lib/supabase/admin';

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

    if (!linkedTables || linkedTables.length === 0) return { suggestions: [], all: [], enrolledCategories: [] };

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

    if (!categories || categories.length === 0) return { suggestions: [], all: [], enrolledCategories: [] };

    // 4. Overrides
    const { data: overrides } = await supabase
        .from('event_category_overrides')
        .select('category_id, registration_fee')
        .eq('event_id', eventId);

    const overridesMap = new Map(overrides?.map(o => [o.category_id, o.registration_fee]));

    // 4.5 Get enrolled athlete counts and previews
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

        // Add to count and previews
        countMap.set(catId, (countMap.get(catId) || 0) + 1);

        if (!previewMap.has(catId)) {
            previewMap.set(catId, []);
        }

        const previews = previewMap.get(catId)!;
        if (previews.length < 3) {
            const shortName = name.split(' ').slice(0, 2).join(' ');
            previews.push(shortName);
        }

        if (row.athlete_id === athleteId) {
            myEnrolledCategoryIds.add(catId);
        }
    });

    // Fetch enrolled registrations for this athlete with status (including pending)
    const { data: enrolledRegsData } = await supabaseAdmin
        .from('event_registrations')
        .select('category_id, status')
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId)
        .in('status', ['pago', 'isento', 'confirmado', 'aguardando_pagamento', 'pendente']);

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
        const registeredCount = countMap.get(cat.id) || 0;
        const previewAthletes = previewMap.get(cat.id) || [];

        return {
            ...cat,
            registration_fee: price,
            registered_count: registeredCount,
            preview_athletes: previewAthletes,
            match,
            score
        };
    }));

    // Build enrolledCategories: categories the athlete is already registered in (any status)
    const enrolledCategoryMap = new Map<string, string>(
        enrolledRegsData?.map(r => [r.category_id, r.status]) || []
    );
    const enrolledCategories = processed
        .filter(p => enrolledCategoryMap.has(p.id))
        .map(p => ({
            id: p.id,
            categoria_completa: p.categoria_completa,
            faixa: p.faixa,
            divisao: p.divisao,
            peso: p.peso,
            categoria_peso: p.categoria_peso,
            peso_min_kg: p.peso_min_kg,
            peso_max_kg: p.peso_max_kg,
            status: enrolledCategoryMap.get(p.id)!,
        }));

    // Filter out categories where the athlete is already enrolled (any status)
    const results = processed.filter(p => !myEnrolledCategoryIds.has(p.id) && !enrolledCategoryMap.has(p.id));

    // Split into Suggestions (Matches) and All
    const suggestions = results
        .filter(p => p.match.eligible)
        .sort((a, b) => b.score - a.score || a.categoria_completa.localeCompare(b.categoria_completa));

    // For "All" tab: sort by title
    const all = results.sort((a, b) => a.categoria_completa.localeCompare(b.categoria_completa));

    return { suggestions, all, enrolledCategories };
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

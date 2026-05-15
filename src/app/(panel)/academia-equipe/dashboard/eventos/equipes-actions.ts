'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';

export interface ScoringConfig {
    gold: number;
    silver: number;
    bronze: number;
    lines_per_column: number;
}

/** Normalizes a gym name for grouping (lowercase, no accents). */
function normalizeGymName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export interface TeamSummary {
    /** Display name (original, most frequent casing) */
    team_name: string;
    /** Normalized key used for routing */
    team_slug: string;
    master_name: string | null;
    total_athletes: number;
    is_organizer: boolean;
}

export interface TeamAthlete {
    id: string;
    full_name: string;
    gym_name: string | null;
    belt_color: string | null;
    sexo: string | null;
    birth_date: string | null;
    weight: number | null;
    master_name: string | null;
    registrations: {
        id: string;
        status: string;
        category: {
            categoria_completa: string | null;
            faixa: string | null;
            divisao_idade: string | null;
        } | null;
    }[];
}

/**
 * Returns teams (grouped by normalized gym_name) participating in a given event.
 * Only the event organizer can call this — returns [] if not authorized.
 */
export async function getTeamsByEventAction(eventId: string): Promise<TeamSummary[]> {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Guard: only the organizer of this event can see the teams list
    const { data: event } = await supabase
        .from('events')
        .select('tenant_id, title')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) return [];

    // Fetch registrations (just athlete_ids) without profile join — avoids RLS cross-tenant block
    const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select('athlete_id')
        .eq('event_id', eventId)
        .neq('status', 'carrinho');

    if (error || !registrations) return [];

    // Fetch athlete profiles via admin client to bypass cross-tenant RLS
    const athleteIds = [...new Set(registrations.map(r => r.athlete_id))];
    const { data: athleteProfiles } = await adminClient
        .from('profiles')
        .select('id, gym_name, master_name')
        .in('id', athleteIds);

    const profileMap = new Map((athleteProfiles ?? []).map(p => [p.id, p]));

    // Organizer's own gym_name (to mark as organizer)
    const { data: organizerProfile } = await supabase
        .from('profiles')
        .select('gym_name')
        .eq('id', profile.id)
        .single();

    const organizerGymNorm = organizerProfile?.gym_name
        ? normalizeGymName(organizerProfile.gym_name)
        : null;

    // Group by normalized gym_name
    const teamMap = new Map<string, {
        display_name: string;
        master_name: string | null;
        athlete_ids: Set<string>;
    }>();

    for (const reg of registrations) {
        const athlete = profileMap.get(reg.athlete_id);
        const raw = athlete?.gym_name || 'Sem equipe';
        const slug = normalizeGymName(raw);

        if (!teamMap.has(slug)) {
            teamMap.set(slug, {
                display_name: raw,
                master_name: athlete?.master_name ?? null,
                athlete_ids: new Set(),
            });
        }
        const entry = teamMap.get(slug)!;
        entry.athlete_ids.add(reg.athlete_id);
    }

    const teams: TeamSummary[] = [];

    for (const [slug, data] of teamMap.entries()) {
        if (data.athlete_ids.size === 0) continue;
        teams.push({
            team_name: data.display_name,
            team_slug: slug,
            master_name: data.master_name,
            total_athletes: data.athlete_ids.size,
            is_organizer: organizerGymNorm !== null && slug === organizerGymNorm,
        });
    }

    // Sort: organizer first, then by count desc
    teams.sort((a, b) => {
        if (a.is_organizer && !b.is_organizer) return -1;
        if (!a.is_organizer && b.is_organizer) return 1;
        return b.total_athletes - a.total_athletes;
    });

    return teams;
}

/**
 * Returns athletes (with their registrations) from a specific team in an event.
 * Only the event organizer can call this.
 */
export async function getAthletesByTeamAction(
    eventId: string,
    teamSlug: string
): Promise<TeamAthlete[]> {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Guard: only the organizer of this event can see details
    const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) return [];

    // Fetch registrations + categories without athlete profile join (avoids cross-tenant RLS block)
    const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(`
            id,
            status,
            athlete_id,
            category:category_rows!category_id (
                categoria_completa,
                faixa,
                divisao_idade
            )
        `)
        .eq('event_id', eventId)
        .neq('status', 'carrinho');

    if (error || !registrations) return [];

    // Fetch athlete profiles via admin client to bypass cross-tenant RLS
    const athleteIds = [...new Set(registrations.map(r => r.athlete_id))];
    const { data: athleteProfiles } = await adminClient
        .from('profiles')
        .select('id, full_name, gym_name, master_name, belt_color, sexo, birth_date, weight')
        .in('id', athleteIds);

    const profileMap = new Map((athleteProfiles ?? []).map(p => [p.id, p]));


    // Filter by normalized gym_name matching teamSlug
    const athleteMap = new Map<string, TeamAthlete>();

    for (const reg of registrations) {
        const athlete = profileMap.get(reg.athlete_id);
        if (!athlete) continue;

        const slug = normalizeGymName(athlete.gym_name || 'Sem equipe');
        if (slug !== teamSlug) continue;

        const category = Array.isArray(reg.category) ? reg.category[0] : reg.category;

        if (!athleteMap.has(athlete.id)) {
            athleteMap.set(athlete.id, {
                id: athlete.id,
                full_name: athlete.full_name,
                gym_name: athlete.gym_name ?? null,
                belt_color: athlete.belt_color,
                sexo: athlete.sexo,
                birth_date: athlete.birth_date,
                weight: athlete.weight,
                master_name: athlete.master_name,
                registrations: [],
            });
        }

        athleteMap.get(athlete.id)!.registrations.push({
            id: reg.id,
            status: reg.status ?? 'pendente',
            category: category ? {
                categoria_completa: category.categoria_completa,
                faixa: category.faixa,
                divisao_idade: category.divisao_idade,
            } : null,
        });

    }

    return Array.from(athleteMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'pt-BR')
    );
}

/**
 * Saves scoring point configuration for a given event.
 */
export async function saveScoringConfigAction(
    eventId: string,
    config: ScoringConfig
): Promise<{ success: boolean; error?: string }> {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) {
        return { success: false, error: 'Não autorizado' };
    }

    const { error } = await supabase
        .from('events')
        .update({ scoring_config: config })
        .eq('id', eventId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

/**
 * Gets scoring point configuration for a given event.
 */
export async function getScoringConfigAction(eventId: string): Promise<ScoringConfig> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('events')
        .select('scoring_config')
        .eq('id', eventId)
        .single();

    return (data?.scoring_config as ScoringConfig) ?? {
        gold: 12,
        silver: 5,
        bronze: 3,
    };
}

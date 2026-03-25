'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUnder18 } from '@/lib/guardian-declarations';

export type TermsModalData = {
    term: {
        id: string;
        version: number;
        content: string;
        isMinorTerm: boolean;
    };
    athleteName: string;
    isMinor: boolean;
    guardian?: {
        name: string | null;
        cpf: string | null;
        relationship: string | null;
        phone: string | null;
    };
    event: {
        title: string;
        address: string;
        cityState: string;
        startDate: string;
        endDate: string;
    };
};

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const ACTIVE_REGISTRATION_STATUSES = ['carrinho', 'aguardando_pagamento', 'pago', 'pendente', 'confirmado', 'isento'] as const;

export async function checkTermsAcceptanceAction(eventId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if acceptance record exists
    const { data: acceptance } = await supabase
        .from('athlete_term_acceptances')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();

    if (!acceptance) return false;

    // Option C: acceptance only counts if athlete has at least one active registration.
    // If all prior registrations were cancelled/expired, they must accept again.
    const { data: activeReg } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('event_id', eventId)
        .in('status', ACTIVE_REGISTRATION_STATUSES)
        .maybeSingle();

    return !!activeReg;
}

export async function getTermsModalDataAction(eventId: string): Promise<TermsModalData | { error: string }> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const [profileResult, eventResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, birth_date')
            .eq('id', user.id)
            .single(),
        supabase
            .from('events')
            .select('title, address_street, address_number, address_neighborhood, address_city, address_state, event_date, event_end_date')
            .eq('id', eventId)
            .single(),
    ]);

    if (!profileResult.data) return { error: 'Perfil não encontrado.' };
    if (!eventResult.data) return { error: 'Evento não encontrado.' };

    const ev = eventResult.data;
    const addressParts = [ev.address_street, ev.address_number, ev.address_neighborhood].filter(Boolean);
    const address = addressParts.join(', ') || 'Endereço não informado';
    const cityState = [ev.address_city, ev.address_state].filter(Boolean).join('/') || 'Cidade não informada';
    const startDate = formatDate(ev.event_date);
    const endDate = ev.event_end_date ? formatDate(ev.event_end_date) : startDate;

    const minor = isUnder18(profileResult.data.birth_date);

    if (minor) {
        // Fetch minor_event template and guardian data in parallel
        const [minorTermResult, declarationResult] = await Promise.all([
            adminClient
                .from('guardian_term_templates')
                .select('id, version, content')
                .eq('is_active', true)
                .eq('type', 'minor_event')
                .single(),
            adminClient
                .from('athlete_guardian_declarations')
                .select('responsible_name, responsible_cpf, responsible_relationship, responsible_phone')
                .eq('athlete_id', user.id)
                .maybeSingle(),
        ]);

        if (!minorTermResult.data) return { error: 'Termo para atleta menor não encontrado. Contacte o administrador.' };

        return {
            term: { ...minorTermResult.data, isMinorTerm: true },
            athleteName: profileResult.data.full_name || 'Atleta',
            isMinor: true,
            guardian: declarationResult.data
                ? {
                    name: declarationResult.data.responsible_name,
                    cpf: declarationResult.data.responsible_cpf,
                    relationship: declarationResult.data.responsible_relationship,
                    phone: declarationResult.data.responsible_phone,
                }
                : undefined,
            event: { title: ev.title, address, cityState, startDate, endDate },
        };
    }

    // Adult flow — standard terms_of_service
    const termResult = await supabase
        .from('terms_of_service')
        .select('id, version, content')
        .eq('is_active', true)
        .single();

    if (!termResult.data) return { error: 'Termo de responsabilidade não encontrado.' };

    return {
        term: { ...termResult.data, isMinorTerm: false },
        athleteName: profileResult.data.full_name || 'Atleta',
        isMinor: false,
        event: { title: ev.title, address, cityState, startDate, endDate },
    };
}

// ──────────────────────────────────────────────────────────────
// Academy flow: check/fetch/accept terms for a specific athlete
// ──────────────────────────────────────────────────────────────

/** Returns the subset of athleteIds that haven't accepted the term for this event yet (or whose acceptance is invalid per Option C). */
export async function checkAthletesNeedingTermsAction(
    eventId: string,
    athleteIds: string[]
): Promise<string[]> {
    if (!athleteIds.length) return [];
    const adminClient = createAdminClient();

    // Filter those who already accepted AND have an active registration (Option C)
    const [acceptancesResult, activeRegsResult] = await Promise.all([
        adminClient
            .from('athlete_term_acceptances')
            .select('athlete_id')
            .eq('event_id', eventId)
            .in('athlete_id', athleteIds),
        adminClient
            .from('event_registrations')
            .select('athlete_id')
            .eq('event_id', eventId)
            .in('athlete_id', athleteIds)
            .in('status', ACTIVE_REGISTRATION_STATUSES),
    ]);

    const alreadyAccepted = new Set((acceptancesResult.data ?? []).map(r => r.athlete_id));
    const hasActiveReg = new Set((activeRegsResult.data ?? []).map(r => r.athlete_id));

    // Need terms if: no acceptance OR no active registration
    return athleteIds.filter(id => !alreadyAccepted.has(id) || !hasActiveReg.has(id));
}

/** Gets term modal data for a specific athlete (used by academy registering on behalf of athlete). */
export async function getTermsModalDataForAthleteAction(
    athleteId: string,
    eventId: string
): Promise<TermsModalData | { error: string }> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify caller is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const [profileResult, eventResult] = await Promise.all([
        adminClient
            .from('profiles')
            .select('full_name, birth_date')
            .eq('id', athleteId)
            .single(),
        adminClient
            .from('events')
            .select('title, address_street, address_number, address_neighborhood, address_city, address_state, event_date, event_end_date')
            .eq('id', eventId)
            .single(),
    ]);

    if (!profileResult.data) return { error: 'Perfil do atleta não encontrado.' };
    if (!eventResult.data) return { error: 'Evento não encontrado.' };

    const ev = eventResult.data;
    const addressParts = [ev.address_street, ev.address_number, ev.address_neighborhood].filter(Boolean);
    const address = addressParts.join(', ') || 'Endereço não informado';
    const cityState = [ev.address_city, ev.address_state].filter(Boolean).join('/') || 'Cidade não informada';
    const startDate = formatDate(ev.event_date);
    const endDate = ev.event_end_date ? formatDate(ev.event_end_date) : startDate;

    // Minor check — for academy flow this should always be true (called after checkMinorAthletesNeedingTermsAction)
    const minor = isUnder18(profileResult.data.birth_date);

    if (minor) {
        const [minorTermResult, declarationResult] = await Promise.all([
            adminClient
                .from('guardian_term_templates')
                .select('id, version, content')
                .eq('is_active', true)
                .eq('type', 'minor_event')
                .single(),
            adminClient
                .from('athlete_guardian_declarations')
                .select('responsible_name, responsible_cpf, responsible_relationship, responsible_phone')
                .eq('athlete_id', athleteId)
                .maybeSingle(),
        ]);

        if (!minorTermResult.data) return { error: 'Termo para atleta menor não encontrado. Contacte o administrador.' };

        return {
            term: { ...minorTermResult.data, isMinorTerm: true },
            athleteName: profileResult.data.full_name || 'Atleta',
            isMinor: true,
            guardian: declarationResult.data
                ? {
                    name: declarationResult.data.responsible_name,
                    cpf: declarationResult.data.responsible_cpf,
                    relationship: declarationResult.data.responsible_relationship,
                    phone: declarationResult.data.responsible_phone,
                }
                : undefined,
            event: { title: ev.title, address, cityState, startDate, endDate },
        };
    }

    // Fallback: adult term (shouldn't reach here in academy flow for minors)
    const termResult = await adminClient
        .from('terms_of_service')
        .select('id, version, content')
        .eq('is_active', true)
        .single();

    if (!termResult.data) return { error: 'Termo de responsabilidade não encontrado.' };

    return {
        term: { ...termResult.data, isMinorTerm: false },
        athleteName: profileResult.data.full_name || 'Atleta',
        isMinor: false,
        event: { title: ev.title, address, cityState, startDate, endDate },
    };
}

/** Accept term on behalf of an athlete (academy flow — bypasses RLS via adminClient). */
export async function acceptTermForAthleteAction(
    athleteId: string,
    termId: string,
    eventId: string,
    snapshot: {
        athleteName: string;
        eventTitle: string;
        eventAddress: string;
        eventCity: string;
        startDate: string;
        endDate: string;
    },
    isMinorTerm = false
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const adminClient = createAdminClient();

    const row: Record<string, unknown> = {
        athlete_id: athleteId,
        event_id: eventId,
        term_type: isMinorTerm ? 'minor' : 'standard',
        athlete_name_snapshot: snapshot.athleteName,
        event_title_snapshot: snapshot.eventTitle,
        event_address_snapshot: snapshot.eventAddress,
        event_city_snapshot: snapshot.eventCity,
        event_start_date_snapshot: snapshot.startDate || null,
        event_end_date_snapshot: snapshot.endDate || null,
    };

    if (isMinorTerm) {
        row.minor_term_id = termId;
        row.term_id = null;
    } else {
        row.term_id = termId;
        row.minor_term_id = null;
    }

    const { error } = await adminClient
        .from('athlete_term_acceptances')
        .upsert(row, { onConflict: 'athlete_id,event_id', ignoreDuplicates: true });

    if (error) return { error: 'Erro ao registrar aceite do termo.' };
    return {};
}

export async function acceptTermAction(
    termId: string,
    eventId: string,
    snapshot: {
        athleteName: string;
        eventTitle: string;
        eventAddress: string;
        eventCity: string;
        startDate: string;
        endDate: string;
    },
    isMinorTerm = false
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const row: Record<string, unknown> = {
        athlete_id: user.id,
        event_id: eventId,
        term_type: isMinorTerm ? 'minor' : 'standard',
        athlete_name_snapshot: snapshot.athleteName,
        event_title_snapshot: snapshot.eventTitle,
        event_address_snapshot: snapshot.eventAddress,
        event_city_snapshot: snapshot.eventCity,
        event_start_date_snapshot: snapshot.startDate || null,
        event_end_date_snapshot: snapshot.endDate || null,
    };

    if (isMinorTerm) {
        row.minor_term_id = termId;
        row.term_id = null;
    } else {
        row.term_id = termId;
        row.minor_term_id = null;
    }

    const { error } = await supabase
        .from('athlete_term_acceptances')
        .upsert(row, { onConflict: 'athlete_id,event_id', ignoreDuplicates: true });

    if (error) return { error: 'Erro ao registrar aceite do termo.' };
    return {};
}

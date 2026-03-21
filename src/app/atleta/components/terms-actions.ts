'use server';

import { createClient } from '@/lib/supabase/server';

export type TermsModalData = {
    term: { id: string; version: number; content: string };
    athleteName: string;
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
    // Trata tanto date (YYYY-MM-DD) quanto timestamptz
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export async function checkTermsAcceptanceAction(eventId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
        .from('athlete_term_acceptances')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();

    return !!data;
}

export async function getTermsModalDataAction(eventId: string): Promise<TermsModalData | { error: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const [termResult, profileResult, eventResult] = await Promise.all([
        supabase
            .from('terms_of_service')
            .select('id, version, content')
            .eq('is_active', true)
            .single(),
        supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single(),
        supabase
            .from('events')
            .select('title, address_street, address_number, address_neighborhood, address_city, address_state, event_date, event_end_date')
            .eq('id', eventId)
            .single(),
    ]);

    if (!termResult.data) return { error: 'Termo de responsabilidade não encontrado.' };
    if (!profileResult.data) return { error: 'Perfil não encontrado.' };
    if (!eventResult.data) return { error: 'Evento não encontrado.' };

    const ev = eventResult.data;

    const addressParts = [
        ev.address_street,
        ev.address_number,
        ev.address_neighborhood,
    ].filter(Boolean);
    const address = addressParts.join(', ') || 'Endereço não informado';

    const cityState = [ev.address_city, ev.address_state].filter(Boolean).join('/') || 'Cidade não informada';

    const startDate = formatDate(ev.event_date);
    const endDate = ev.event_end_date ? formatDate(ev.event_end_date) : startDate;

    return {
        term: termResult.data,
        athleteName: profileResult.data.full_name || 'Atleta',
        event: {
            title: ev.title,
            address,
            cityState,
            startDate,
            endDate,
        },
    };
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
    }
): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { error } = await supabase
        .from('athlete_term_acceptances')
        .upsert(
            {
                athlete_id: user.id,
                term_id: termId,
                event_id: eventId,
                athlete_name_snapshot: snapshot.athleteName,
                event_title_snapshot: snapshot.eventTitle,
                event_address_snapshot: snapshot.eventAddress,
                event_city_snapshot: snapshot.eventCity,
                event_start_date_snapshot: snapshot.startDate || null,
                event_end_date_snapshot: snapshot.endDate || null,
            },
            { onConflict: 'athlete_id,event_id', ignoreDuplicates: true }
        );

    if (error) return { error: 'Erro ao registrar aceite do termo.' };
    return {};
}

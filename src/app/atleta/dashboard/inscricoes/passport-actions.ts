'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRegistrationCode } from '@/lib/passport-utils';
import { formatFullCategoryName } from '@/lib/category-utils';

export type PassportStatus = 'pago' | 'confirmado' | 'isento';

export interface PassportData {
    registrationId: string;
    event_id: string;
    registration_code: string;
    athlete_name: string;
    belt_color: string;
    gym_name: string;
    event_title: string;
    event_date: string;
    event_location: string;
    categoria_completa: string;
    status: PassportStatus;
    passport_bg_from: string | null;
    passport_bg_via: string | null;
    passport_text_color: string | null;
    passport_font: string | null;
    passport_border_radius: number | null;
}

type PassportActionResult =
    | { data: PassportData }
    | { error: string };

export async function getPassportDataAction(registrationId: string): Promise<PassportActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado.' };

    const admin = createAdminClient();

    const { data: reg, error } = await admin
        .from('event_registrations')
        .select(`
            id,
            status,
            registration_code,
            tenant_id,
            registered_by,
            event:events(id, title, event_date, location, address_city, address_state, passport_bg_from, passport_bg_via, passport_text_color, passport_font, passport_border_radius),
            category:category_rows(categoria_completa, faixa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            athlete:profiles!athlete_id(full_name, belt_color, gym_name, tenant_id)
        `)
        .eq('id', registrationId)
        .single();

    if (error || !reg) return { error: 'Inscrição não encontrada.' };

    // Authorization: must be the athlete OR the academy that registered them
    const isAthlete = (reg.athlete as any)?.tenant_id === null
        ? reg.registered_by === user.id
        : false;

    const { data: callerProfile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    const isAthleteOwner = reg.registered_by === user.id || (callerProfile?.role === 'atleta');
    const isAcademyOwner = callerProfile?.tenant_id && (
        reg.tenant_id === callerProfile.tenant_id ||
        (reg.event as any)?.tenant_id === callerProfile.tenant_id
    );

    if (!isAthleteOwner && !isAcademyOwner) {
        return { error: 'Sem permissão para ver este passaporte.' };
    }

    if (!['pago', 'confirmado', 'isento'].includes(reg.status)) {
        return { error: 'Passaporte disponível apenas para inscrições confirmadas.' };
    }

    // Lazy-generate registration_code if not yet set
    let code = reg.registration_code;
    if (!code) {
        const event = reg.event as any;
        const year = event?.event_date
            ? new Date(event.event_date).getFullYear()
            : new Date().getFullYear();

        // Retry up to 3 times on uniqueness collision
        for (let attempt = 0; attempt < 3; attempt++) {
            const candidate = generateRegistrationCode(event?.title || 'EVT', year);
            const { error: updateError } = await admin
                .from('event_registrations')
                .update({ registration_code: candidate })
                .eq('id', registrationId);

            if (!updateError) {
                code = candidate;
                break;
            }
            // If uniqueness violation (23505), retry; else bail
            if ((updateError as any).code !== '23505') break;
        }

        if (!code) return { error: 'Erro ao gerar código de inscrição.' };
    }

    const event = reg.event as any;
    const athlete = reg.athlete as any;
    const category = reg.category as any;

    const location = [event?.address_city, event?.address_state]
        .filter(Boolean).join(' - ') || event?.location || '';

    const formattedCategory = formatFullCategoryName({
        categoria_completa: category?.categoria_completa,
        faixa: category?.faixa,
        divisao: category?.divisao_idade,
        categoria_peso: category?.categoria_peso,
        peso_min_kg: category?.peso_min_kg,
        peso_max_kg: category?.peso_max_kg,
    });

    return {
        data: {
            registrationId: reg.id,
            event_id: event?.id || '',
            registration_code: code,
            athlete_name: athlete?.full_name || 'Atleta',
            belt_color: athlete?.belt_color || 'branca',
            gym_name: athlete?.gym_name || '',
            event_title: event?.title || '',
            event_date: event?.event_date || '',
            event_location: location,
            categoria_completa: formattedCategory,
            status: reg.status as PassportStatus,
            passport_bg_from: event?.passport_bg_from ?? null,
            passport_bg_via: event?.passport_bg_via ?? null,
            passport_text_color: event?.passport_text_color ?? null,
            passport_font: event?.passport_font ?? null,
            passport_border_radius: event?.passport_border_radius ?? null,
        }
    };
}

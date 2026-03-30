import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';
import CheckagemClient from './CheckagemClient';

export default async function CheckagemPage() {
    const { profile, tenant_id } = await requireTenantScope();
    if (!profile) redirect('/login');

    const adminClient = createAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Eventos que permitem troca e ainda estão no prazo
    const { data: events } = await adminClient
        .from('events')
        .select('id, title, event_date, category_change_deadline_days, tenant_id')
        .gt('category_change_deadline_days', 0)
        .gte('event_date', today.toISOString());

    const eligibleEvents = (events || []).filter((ev) => {
        const eventDate = new Date(ev.event_date);
        const deadline = new Date(eventDate);
        deadline.setDate(deadline.getDate() - ev.category_change_deadline_days);
        return today <= deadline;
    });

    // Separar eventos próprios (academia é organizadora) dos demais
    const ownedEventIds = eligibleEvents
        .filter((e) => e.tenant_id === tenant_id)
        .map((e) => e.id);

    const otherEventIds = eligibleEvents
        .filter((e) => e.tenant_id !== tenant_id)
        .map((e) => e.id);

    const STATUSES = ['pago', 'paga', 'confirmado', 'isento'];
    const SELECT_FIELDS = `
        id,
        status,
        event_id,
        tenant_id,
        category_id,
        athlete:profiles!athlete_id (full_name, belt_color),
        category:category_rows!category_id (id, categoria_completa, faixa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
        registered_by_profile:profiles!registered_by (full_name, gym_name)
    `;

    // Eventos próprios: todos os atletas inscritos
    const { data: ownedRegs } = ownedEventIds.length > 0
        ? await adminClient
            .from('event_registrations')
            .select(SELECT_FIELDS)
            .in('event_id', ownedEventIds)
            .in('status', STATUSES)
            .order('event_id')
        : { data: [] };

    // Eventos de outros: apenas atletas da academia
    const { data: otherRegs } = otherEventIds.length > 0
        ? await adminClient
            .from('event_registrations')
            .select(SELECT_FIELDS)
            .in('event_id', otherEventIds)
            .eq('tenant_id', tenant_id)
            .in('status', STATUSES)
            .order('event_id')
        : { data: [] };

    const allRegistrations = [...(ownedRegs || []), ...(otherRegs || [])];

    const eventMap = Object.fromEntries(eligibleEvents.map((e) => [e.id, e]));

    const registrations = allRegistrations.map((reg: any) => ({
        ...reg,
        athlete: Array.isArray(reg.athlete) ? reg.athlete[0] : reg.athlete,
        category: Array.isArray(reg.category) ? reg.category[0] : reg.category,
        registered_by_profile: Array.isArray(reg.registered_by_profile) ? reg.registered_by_profile[0] : reg.registered_by_profile,
    }));

    return (
        <CheckagemClient
            registrations={registrations}
            eventMap={eventMap}
            currentTenantId={tenant_id!}
            ownedEventIds={ownedEventIds}
        />
    );
}

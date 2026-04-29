import { createAdminClient } from './supabase/admin';
import { dispatchNotification } from './evolution';

function brl(value: number): string {
    return value.toFixed(2).replace('.', ',');
}

function formatDateBr(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const APP_LINK = 'https://vemcompetir.com.br/atleta/dashboard/inscricoes';

export async function dispatchPaymentNotifications(opts: {
    paymentId: string;
    eventId: string | null;
    organizerTenantId: string | null;
    confirmedValue: number;
}) {
    const admin = createAdminClient();

    const { data: registrations } = await admin
        .from('event_registrations')
        .select('id, athlete_id, category_id, event_id')
        .eq('payment_id', opts.paymentId);

    if (!registrations || registrations.length === 0) return;

    const athleteIds = Array.from(new Set(registrations.map((r) => r.athlete_id).filter(Boolean)));
    const eventIds = Array.from(new Set(registrations.map((r) => r.event_id).filter(Boolean)));

    const [athletesRes, eventsRes, configRes] = await Promise.all([
        athleteIds.length
            ? admin.from('profiles').select('id, full_name, phone').in('id', athleteIds)
            : Promise.resolve({ data: [] as any[] }),
        eventIds.length
            ? admin.from('events').select('id, title, event_date, address_city, address_state, tenant_id').in('id', eventIds)
            : Promise.resolve({ data: [] as any[] }),
        admin.from('evolution_config').select('admin_notify_phone').limit(1).maybeSingle(),
    ]);

    const athletes = new Map((athletesRes.data ?? []).map((a) => [a.id, a]));
    const events = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));

    const primaryEvent = opts.eventId ? events.get(opts.eventId) : (eventsRes.data ?? [])[0];
    const eventTitle = primaryEvent?.title ?? 'Evento';
    const eventDate = formatDateBr(primaryEvent?.event_date);
    const eventLocation = primaryEvent?.address_city
        ? `${primaryEvent.address_city}/${primaryEvent.address_state ?? ''}`.replace(/\/$/, '')
        : '';

    let organizerName = '';
    let organizerPhone: string | null = null;
    const tenantId = opts.organizerTenantId ?? primaryEvent?.tenant_id ?? null;
    if (tenantId) {
        const { data: tenant } = await admin
            .from('tenants')
            .select('name, owner_id')
            .eq('id', tenantId)
            .single();
        if (tenant) {
            organizerName = tenant.name ?? '';
            if (tenant.owner_id) {
                const { data: owner } = await admin
                    .from('profiles')
                    .select('phone')
                    .eq('id', tenant.owner_id)
                    .single();
                organizerPhone = owner?.phone ?? null;
            }
        }
    }

    for (const reg of registrations) {
        const athlete = athletes.get(reg.athlete_id);
        if (!athlete?.phone) continue;

        await dispatchNotification({
            templateKey: 'payment_confirmed',
            recipientPhone: athlete.phone,
            recipientRole: 'atleta',
            recipientId: athlete.id,
            vars: {
                nome: athlete.full_name ?? 'Atleta',
                atleta: athlete.full_name ?? 'Atleta',
                evento: eventTitle,
                valor: brl(opts.confirmedValue),
                data_evento: eventDate,
                local: eventLocation,
                link: APP_LINK,
            },
            relatedEntityType: 'event_registration',
            relatedEntityId: reg.id,
            idempotencyKey: `payment_confirmed:${reg.id}`,
        });
    }

    const total = registrations.length;
    const athletesList = registrations
        .map((r) => athletes.get(r.athlete_id)?.full_name)
        .filter(Boolean)
        .join(', ');

    const valorTotal = brl(opts.confirmedValue);

    if (organizerPhone) {
        await dispatchNotification({
            templateKey: 'organizer_new_registration',
            recipientPhone: organizerPhone,
            recipientRole: 'organizador',
            vars: {
                organizador: organizerName,
                evento: eventTitle,
                total_inscricoes: String(total),
                atleta: athletesList,
                valor: valorTotal,
                data_evento: eventDate,
                link: APP_LINK,
            },
            relatedEntityType: 'payment',
            relatedEntityId: opts.paymentId,
            idempotencyKey: `organizer_new:${opts.paymentId}`,
        });
    }

    const { data: cfg } = configRes;
    if (cfg?.admin_notify_phone) {
        await dispatchNotification({
            templateKey: 'admin_new_registration',
            recipientPhone: cfg.admin_notify_phone,
            recipientRole: 'admin',
            vars: {
                organizador: organizerName,
                evento: eventTitle,
                total_inscricoes: String(total),
                atleta: athletesList,
                valor: valorTotal,
                data_evento: eventDate,
                local: eventLocation,
                link: APP_LINK,
            },
            relatedEntityType: 'payment',
            relatedEntityId: opts.paymentId,
            idempotencyKey: `admin_new:${opts.paymentId}`,
        });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNotification } from '@/lib/evolution';
import { auditLog } from '@/lib/audit-log';

function formatDateBr(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const admin = createAdminClient();

        const now = new Date();
        const start = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        const { data: events } = await admin
            .from('events')
            .select('id, title, event_date, address_city, address_state')
            .gte('event_date', start.toISOString())
            .lte('event_date', end.toISOString())
            .eq('status', 'publicado');

        if (!events || events.length === 0) {
            return NextResponse.json({ message: 'No events on D-3', processed: 0 });
        }

        let dispatched = 0;
        let skipped = 0;

        for (const ev of events) {
            const { data: regs } = await admin
                .from('event_registrations')
                .select('id, athlete_id')
                .eq('event_id', ev.id)
                .in('status', ['pago', 'agendado']);


            if (!regs || regs.length === 0) continue;

            const athleteIds = Array.from(new Set(regs.map((r) => r.athlete_id).filter(Boolean)));
            if (athleteIds.length === 0) continue;

            const { data: athletes } = await admin
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', athleteIds);

            const profileMap = new Map((athletes ?? []).map((a) => [a.id, a]));
            const eventDate = formatDateBr(ev.event_date);
            const eventLocation = ev.address_city
                ? `${ev.address_city}/${ev.address_state ?? ''}`.replace(/\/$/, '')
                : '';

            for (const reg of regs) {
                const athlete = profileMap.get(reg.athlete_id);
                if (!athlete?.phone) {
                    skipped++;
                    continue;
                }

                const result = await dispatchNotification({
                    templateKey: 'event_reminder_d3',
                    recipientPhone: athlete.phone,
                    recipientRole: 'atleta',
                    recipientId: athlete.id,
                    vars: {
                        nome: athlete.full_name ?? 'Atleta',
                        atleta: athlete.full_name ?? 'Atleta',
                        evento: ev.title ?? 'Evento',
                        data_evento: eventDate,
                        local: eventLocation,
                        link: 'https://vemcompetir.com.br/atleta/dashboard/inscricoes',
                    },
                    relatedEntityType: 'event_registration',
                    relatedEntityId: reg.id,
                    idempotencyKey: `reminder_d3:${reg.id}`,
                });

                if (result.ok) dispatched++;
                else skipped++;
            }
        }

        auditLog('CRON_EVENT_REMINDER_D3', { dispatched, skipped, events: events.length });
        return NextResponse.json({ ok: true, dispatched, skipped, events: events.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        auditLog('CRON_EVENT_REMINDER_D3_ERROR', { error: message }, 'error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

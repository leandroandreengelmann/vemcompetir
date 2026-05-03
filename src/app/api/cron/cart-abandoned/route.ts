import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNotification } from '@/lib/evolution';
import { auditLog } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const admin = createAdminClient();

        const now = new Date();
        const olderThan = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const newerThan = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        const { data: regs } = await admin
            .from('event_registrations')
            .select('id, athlete_id, event_id, price, updated_at, created_at')
            .eq('status', 'carrinho')
            .lte('updated_at', olderThan.toISOString())
            .gte('updated_at', newerThan.toISOString());

        if (!regs || regs.length === 0) {
            return NextResponse.json({ message: 'No abandoned carts', processed: 0 });
        }

        const byAthlete = new Map<string, { athleteId: string; eventIds: Set<string>; itemCount: number; total: number }>();
        for (const r of regs) {
            if (!r.athlete_id) continue;
            const cur = byAthlete.get(r.athlete_id) ?? { athleteId: r.athlete_id, eventIds: new Set(), itemCount: 0, total: 0 };
            if (r.event_id) cur.eventIds.add(r.event_id);
            cur.itemCount++;
            cur.total += Number(r.price ?? 0);
            byAthlete.set(r.athlete_id, cur);
        }

        const athleteIds = Array.from(byAthlete.keys());
        const eventIds = Array.from(new Set(regs.map((r) => r.event_id).filter(Boolean)));

        const [athletesRes, eventsRes] = await Promise.all([
            admin.from('profiles').select('id, full_name, phone').in('id', athleteIds),
            eventIds.length
                ? admin.from('events').select('id, title').in('id', eventIds)
                : Promise.resolve({ data: [] as any[] }),
        ]);

        const profileMap = new Map((athletesRes.data ?? []).map((a) => [a.id, a]));
        const eventMap = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));

        const dayKey = now.toISOString().slice(0, 10);
        let dispatched = 0;
        let skipped = 0;

        for (const [athleteId, info] of byAthlete) {
            const athlete = profileMap.get(athleteId);
            if (!athlete?.phone) {
                skipped++;
                continue;
            }

            const eventTitles = Array.from(info.eventIds)
                .map((id) => eventMap.get(id)?.title)
                .filter(Boolean)
                .join(', ');

            const result = await dispatchNotification({
                templateKey: 'cart_abandoned',
                recipientPhone: athlete.phone,
                recipientRole: 'atleta',
                recipientId: athleteId,
                vars: {
                    nome: athlete.full_name ?? 'Atleta',
                    atleta: athlete.full_name ?? 'Atleta',
                    evento: eventTitles || 'seu evento',
                    total_inscricoes: String(info.itemCount),
                    valor: info.total.toFixed(2).replace('.', ','),
                    link: 'https://vemcompetir.com.br/atleta/dashboard/cesta',
                },
                relatedEntityType: 'profile',
                relatedEntityId: athleteId,
                idempotencyKey: `cart_abandoned:${athleteId}:${dayKey}`,
            });

            if (result.ok) dispatched++;
            else skipped++;
        }

        auditLog('CRON_CART_ABANDONED', { dispatched, skipped, athletes: byAthlete.size });
        return NextResponse.json({ ok: true, dispatched, skipped, athletes: byAthlete.size });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        auditLog('CRON_CART_ABANDONED_ERROR', { error: message }, 'error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

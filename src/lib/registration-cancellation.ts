/**
 * Helpers de cancelamento de inscrição (uso no servidor).
 * Quem cancelou, quando e por quê vêm de registration_status_history.
 */

/** Status de inscrição cancelada ('cancelado' é o atual; 'cancelada' vem do Financeiro antigo). */
export const CANCELLED_STATUSES_LIST = ['cancelado', 'cancelada'];

export interface CancellationInfo {
    cancelledAt: string;
    reason: string | null;
    cancelledByName: string;
    cancelledByGym: string | null;
}

/** Último cancelamento registrado de cada inscrição (quem, quando, motivo). */
export async function getCancellationInfoMap(admin: any, registrationIds: string[]): Promise<Record<string, CancellationInfo>> {
    if (registrationIds.length === 0) return {};
    const { data: hist } = await admin
        .from('registration_status_history')
        .select('registration_id, reason, changed_by, created_at, to_status')
        .in('registration_id', registrationIds)
        .in('to_status', CANCELLED_STATUSES_LIST)
        .order('created_at', { ascending: false });

    const latest = new Map<string, any>();
    for (const h of (hist ?? []) as any[]) if (!latest.has(h.registration_id)) latest.set(h.registration_id, h);

    const userIds = [...new Set([...latest.values()].map(h => h.changed_by).filter(Boolean))];
    const { data: people } = userIds.length
        ? await admin.from('profiles').select('id, full_name, gym_name').in('id', userIds)
        : { data: [] };
    const personById = new Map(((people ?? []) as any[]).map(p => [p.id, p]));

    const out: Record<string, CancellationInfo> = {};
    for (const [regId, h] of latest) {
        const p = personById.get(h.changed_by);
        out[regId] = {
            cancelledAt: h.created_at,
            reason: h.reason ?? null,
            cancelledByName: p?.full_name || p?.gym_name || 'Organização do evento',
            cancelledByGym: p?.gym_name ?? null,
        };
    }
    return out;
}


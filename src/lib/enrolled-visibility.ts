/**
 * Uso somente no servidor (server actions / server components).
 *
 * Visibilidade da lista de atletas inscritos por categoria (events.show_enrolled_athletes).
 *
 * Quando o organizador desliga a opção, quem está se inscrevendo não recebe nomes nem
 * contagem de inscritos. O próprio organizador (tenant dono do evento) e o admin geral
 * continuam vendo.
 */

/** Retorna os ids, dentre `eventIds`, cujos inscritos estão ocultos para este visitante. */
export async function getHiddenEnrolledEventIds(
    adminClient: any,
    eventIds: string[],
    viewer: { tenantId?: string | null; role?: string | null } = {},
): Promise<Set<string>> {
    const ids = [...new Set(eventIds.filter(Boolean))];
    if (ids.length === 0 || viewer.role === 'admin_geral') return new Set();

    const { data } = await adminClient
        .from('events')
        .select('id, tenant_id, show_enrolled_athletes')
        .in('id', ids);

    // Só a equipe organizadora (não os atletas dela) mantém a visão dos inscritos
    const isStaff = !!viewer.role && viewer.role !== 'atleta';

    const hidden = new Set<string>();
    for (const ev of (data ?? []) as { id: string; tenant_id: string | null; show_enrolled_athletes: boolean | null }[]) {
        const isOrganizer = isStaff && !!viewer.tenantId && ev.tenant_id === viewer.tenantId;
        if (ev.show_enrolled_athletes === false && !isOrganizer) {
            hidden.add(ev.id);
        }
    }
    return hidden;
}

export async function isEnrolledHidden(
    adminClient: any,
    eventId: string,
    viewer: { tenantId?: string | null; role?: string | null } = {},
): Promise<boolean> {
    return (await getHiddenEnrolledEventIds(adminClient, [eventId], viewer)).has(eventId);
}

/** Lê tenant e role do usuário logado (ou vazio se não houver sessão). */
export async function getViewerScope(supabase: any): Promise<{ tenantId: string | null; role: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { tenantId: null, role: null };
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .maybeSingle();
    return { tenantId: profile?.tenant_id ?? null, role: profile?.role ?? null };
}

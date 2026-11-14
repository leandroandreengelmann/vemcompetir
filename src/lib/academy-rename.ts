/**
 * Propagação de troca de nome de academia para os atletas dela (uso no servidor).
 *
 * O nome da equipe do atleta (profiles.gym_name) é uma cópia em texto. Quando a
 * academia muda de nome, só os atletas VINCULADOS a ela (tenant_id) que ainda estão
 * com um dos nomes ANTIGOS da academia são atualizados. Atletas de outras equipes
 * que a academia apenas inscreveu (ex.: "inscrever atleta externo") ficam intactos.
 */

function normalizeName(name: string | null | undefined): string {
    return (name ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Lê o tenant e os nomes atuais da academia (antes de renomear). */
export async function captureAcademyNames(admin: any, academyProfileId: string): Promise<{ tenantId: string | null; names: string[] }> {
    const { data: profile } = await admin
        .from('profiles')
        .select('tenant_id, full_name, gym_name')
        .eq('id', academyProfileId)
        .maybeSingle();

    if (!profile?.tenant_id) return { tenantId: null, names: [] };

    const { data: tenant } = await admin.from('tenants').select('name').eq('id', profile.tenant_id).maybeSingle();

    const names = [profile.full_name, profile.gym_name, tenant?.name].filter((n): n is string => !!n && !!n.trim());
    return { tenantId: profile.tenant_id, names };
}

/** Atualiza a equipe dos atletas da academia que estavam com um nome antigo. Retorna quantos mudaram. */
export async function propagateAcademyRename(
    admin: any,
    tenantId: string | null,
    oldNames: string[],
    newName: string | null | undefined,
): Promise<number> {
    const target = (newName ?? '').trim();
    if (!tenantId || !target) return 0;

    const newNorm = normalizeName(target);
    const oldNorms = new Set(oldNames.map(normalizeName).filter(n => n && n !== newNorm));
    if (oldNorms.size === 0) return 0;

    const { data: athletes } = await admin
        .from('profiles')
        .select('id, gym_name')
        .eq('tenant_id', tenantId)
        .eq('role', 'atleta')
        .not('gym_name', 'is', null);

    const ids = ((athletes ?? []) as { id: string; gym_name: string }[])
        .filter(a => oldNorms.has(normalizeName(a.gym_name)))
        .map(a => a.id);

    if (ids.length === 0) return 0;

    const { error } = await admin
        .from('profiles')
        .update({ gym_name: target, updated_at: new Date().toISOString() })
        .in('id', ids);

    if (error) {
        console.error('propagateAcademyRename error:', error);
        return 0;
    }
    return ids.length;
}

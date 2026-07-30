import { createAdminClient } from '@/lib/supabase/admin';

export interface AcademyWithMasters {
    tenantId: string;
    name: string;
    masters: { id: string; full_name: string }[];
}

/**
 * Retorna as academias que têm conta no sistema (tenants) E possuem ao menos um
 * professor/mestre cadastrado (profiles.is_master = true). Usado para restringir
 * a quais academias é possível vincular um atleta externo.
 */
export async function getAcademiesWithMasters(): Promise<AcademyWithMasters[]> {
    const admin = createAdminClient();

    // Mestres vinculados a um tenant (academia com conta)
    const { data: masterProfiles } = await admin
        .from('profiles')
        .select('id, full_name, tenant_id')
        .eq('is_master', true)
        .not('tenant_id', 'is', null);

    if (!masterProfiles || masterProfiles.length === 0) return [];

    const tenantIds = [...new Set(masterProfiles.map(m => m.tenant_id as string))];

    const { data: tenants } = await admin
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);

    const nameById = new Map((tenants || []).map(t => [t.id, t.name]));

    const byTenant = new Map<string, AcademyWithMasters>();
    for (const m of masterProfiles) {
        const tid = m.tenant_id as string;
        // Só inclui se o tenant existe de fato (conta no sistema)
        const name = nameById.get(tid);
        if (!name) continue;
        if (!byTenant.has(tid)) {
            byTenant.set(tid, { tenantId: tid, name, masters: [] });
        }
        byTenant.get(tid)!.masters.push({ id: m.id, full_name: m.full_name || 'Mestre' });
    }

    return [...byTenant.values()]
        .map(a => ({
            ...a,
            masters: a.masters.sort((x, y) => x.full_name.localeCompare(y.full_name, 'pt-BR')),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

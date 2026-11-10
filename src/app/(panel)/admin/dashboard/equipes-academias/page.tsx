import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/SectionHeader";
import EquipesAcademiasList, { type Entidade } from './components/EquipesAcademiasList';

export const dynamic = 'force-dynamic';

const ENTITY_ROLE = 'academia/equipe';

/** Lê TODOS os usuários do Auth (a API pagina; uma página só cortava a lista). */
async function listAllAuthUsers(adminClient: ReturnType<typeof createAdminClient>): Promise<User[]> {
    const perPage = 1000;
    const all: User[] = [];
    for (let page = 1; page <= 50; page++) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(error.message);
        all.push(...data.users);
        if (data.users.length < perPage) break;
    }
    return all;
}

export default async function EquipesAcademiasPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();

    const [authUsers, { data: entityProfiles }] = await Promise.all([
        listAllAuthUsers(adminClient),
        adminClient.from('profiles').select('*').eq('role', ENTITY_ROLE),
    ]);

    // Entidade = perfil com role academia/equipe OU usuário com essa role no metadata do Auth
    const authById = new Map(authUsers.map(u => [u.id, u]));
    const entityIds = new Set<string>([
        ...(entityProfiles ?? []).map(p => p.id),
        ...authUsers.filter(u => u.user_metadata?.role === ENTITY_ROLE).map(u => u.id),
    ]);

    const missingProfileIds = [...entityIds].filter(id => !(entityProfiles ?? []).some(p => p.id === id));
    const { data: extraProfiles } = missingProfileIds.length
        ? await adminClient.from('profiles').select('*').in('id', missingProfileIds)
        : { data: [] as any[] };

    const profiles = [...(entityProfiles ?? []), ...(extraProfiles ?? [])];
    const profileById = new Map(profiles.map(p => [p.id, p]));

    const tenantIds = [...new Set(profiles.map(p => p.tenant_id).filter(Boolean))] as string[];

    const [{ data: tenants }, { data: allMembers }] = await Promise.all([
        tenantIds.length
            ? adminClient.from('tenants').select('id, use_own_asaas_api, asaas_api_key_last4').in('id', tenantIds)
            : Promise.resolve({ data: [] as any[] }),
        tenantIds.length
            ? adminClient.from('profiles').select('full_name, tenant_id, is_master, role').in('tenant_id', tenantIds)
            : Promise.resolve({ data: [] as any[] }),
    ]);

    const entidades: Entidade[] = [...entityIds].map(id => {
        const authUser = authById.get(id);
        const profile = profileById.get(id);
        const tId = profile?.tenant_id;

        const members = (allMembers ?? []).filter(m => m.tenant_id === tId);
        const master = members.find(m => m.is_master);
        const tenant = (tenants ?? []).find(t => t.id === tId);

        return {
            id,
            full_name: authUser?.user_metadata?.full_name || profile?.full_name || profile?.gym_name || 'Sem nome',
            email: authUser?.email || '-',
            created_at: authUser?.created_at || profile?.created_at || null,
            master_name: master?.full_name || null,
            athlete_count: members.filter(m => m.role === 'atleta').length,
            use_own_asaas_api: tenant?.use_own_asaas_api ?? false,
            asaas_api_key_last4: tenant?.asaas_api_key_last4 ?? null,
        };
    }).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Equipes / Academias"
                description="Gerencie as equipes e academias cadastradas na plataforma."
                rightElement={
                    <Button asChild pill>
                        <Link href="/admin/dashboard/equipes-academias/novo">
                            <PlusIcon size={20} weight="bold" className="mr-2" />
                            Nova Entidade
                        </Link>
                    </Button>
                }
            />

            <EquipesAcademiasList entidades={entidades} />
        </div>
    );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon, UserCircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FilteredAthletesTable } from './filtered-athletes-table';

export default async function AthleteManagementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: orgProfile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    const isAdmin = orgProfile?.role === 'admin_geral';
    const isAcademy = orgProfile?.role === 'academia/equipe';

    if (!isAdmin && !isAcademy) redirect('/login');

    if (isAcademy && !orgProfile.tenant_id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Você não está vinculado a uma organização.
            </div>
        );
    }

    const tenantFilter = isAcademy ? orgProfile.tenant_id : null;
    const { data: athletesWithEmails } = await supabase
        .rpc('list_athletes_with_auth', { p_tenant_id: tenantFilter });

    const adminClient = createAdminClient();

    // Contagem agregada de inscrições por atleta (para o indicador no botão de inscrições)
    const athleteIds = (athletesWithEmails ?? []).map((a: any) => a.id);
    const registrationCounts = new Map<string, { total: number; pago: number; pendente: number }>();
    if (athleteIds.length > 0) {
        const { data: regs } = await adminClient
            .from('event_registrations')
            .select('athlete_id, status')
            .in('athlete_id', athleteIds)
            .neq('status', 'cancelado');

        for (const r of regs ?? []) {
            const entry = registrationCounts.get(r.athlete_id) ?? { total: 0, pago: 0, pendente: 0 };
            entry.total += 1;
            if (r.status === 'pago' || r.status === 'confirmado' || r.status === 'isento') entry.pago += 1;
            else if (r.status === 'pendente' || r.status === 'carrinho' || r.status === 'agendado') entry.pendente += 1;
            registrationCounts.set(r.athlete_id, entry);
        }
    }
    const registrationCountsObj: Record<string, { total: number; pago: number; pendente: number }> = {};
    registrationCounts.forEach((v, k) => { registrationCountsObj[k] = v; });

    // --- Novas seções: vinculados e sugestões (somente para academias) ---
    let linkedAthletes: any[] = [];
    let suggestedAthletes: any[] = [];
    let tenantName: string | null = null;
    let academyMasters: { id: string; full_name: string }[] = [];

    if (isAcademy && orgProfile.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', orgProfile.tenant_id)
            .single();

        tenantName = tenant?.name ?? null;

        // Busca mestres oficiais da academia
        const { data: masters } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', orgProfile.tenant_id)
            .eq('is_master', true)
            .order('full_name');

        academyMasters = masters ?? [];

        if (tenantName) {
            // Atletas que colocaram o nome exato da academia (case-insensitive) e não têm tenant_id
            const { data: linked } = await adminClient
                .from('profiles')
                .select('id, full_name, belt_color, gym_name, master_name, phone, cpf, created_at, avatar_url, nationality')
                .eq('role', 'atleta')
                .is('tenant_id', null)
                .ilike('gym_name', tenantName)
                .order('created_at', { ascending: false });

            linkedAthletes = linked ?? [];

            // Atletas com nome parecido via similaridade de trigramas (tolera typos, acentos, variações)
            // Exclui os que já aparecem em linkedAthletes (match exato)
            const linkedIds = new Set((linked ?? []).map((a: any) => a.id));

            const { data: similar } = await adminClient
                .rpc('search_athletes_by_gym_similarity', {
                    p_gym_name: tenantName,
                    p_threshold: 0.25,
                });

            const seen = new Set<string>();
            suggestedAthletes = (similar ?? []).filter((a: any) => {
                if (linkedIds.has(a.id) || seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
            });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-panel-lg font-bold tracking-tight">
                        {isAdmin ? 'Gestão Global de Atletas' : 'Meus Atletas'}
                    </h1>
                    <p className="text-muted-foreground text-panel-sm mt-1">
                        {isAdmin
                            ? 'Visualize e gerencie todos os atletas cadastrados na plataforma.'
                            : 'Gerencie os atletas da sua equipe/organização.'}
                    </p>
                </div>
                {isAcademy && (
                    <Button pill asChild>
                        <Link href="/academia-equipe/dashboard/atletas/novo">
                            <PlusIcon size={24} weight="duotone" className="mr-2" />
                            Novo Atleta
                        </Link>
                    </Button>
                )}
            </div>

            {/* Card principal — prévia recolhida com filtros */}
            <Card className="min-w-0 max-w-full">
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Lista de Atletas</CardTitle>
                </CardHeader>
                <CardContent className="p-0 min-w-0 max-w-full">
                    <FilteredAthletesTable
                        variant="main"
                        athletes={athletesWithEmails ?? []}
                        isAdmin={isAdmin}
                        isAcademy={isAcademy}
                        registrationCounts={registrationCountsObj}
                    />
                </CardContent>
            </Card>
            {/* Seções de descoberta — somente para academias */}
            {isAcademy && tenantName && (
                <>
                    {/* Atletas Vinculados — colocaram o nome exato */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <UserCircleIcon size={20} weight="duotone" className="text-primary" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-panel-md font-semibold">Atletas Vinculados</CardTitle>
                                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs px-2 py-0.5">Novo</Badge>
                                    </div>
                                    <CardDescription className="mt-0.5">
                                        Atletas que se cadastraram e escolheram esta academia. Clique em &ldquo;Este é meu atleta&rdquo; para oficializar.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <FilteredAthletesTable
                                variant="linked"
                                athletes={linkedAthletes}
                                academyMasters={academyMasters}
                            />
                        </CardContent>
                    </Card>

                    {/* Sugestões — nome parecido */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MagnifyingGlassIcon size={20} weight="duotone" className="text-muted-foreground" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-panel-md font-semibold">Sugestões de Atletas</CardTitle>
                                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs px-2 py-0.5">Novo</Badge>
                                    </div>
                                    <CardDescription className="mt-0.5">
                                        Atletas que digitaram um nome parecido com o da sua academia. Verifique e oficialize os que forem seus.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <FilteredAthletesTable
                                variant="suggested"
                                athletes={suggestedAthletes}
                                academyMasters={academyMasters}
                            />
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

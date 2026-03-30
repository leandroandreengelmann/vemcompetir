import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon, PencilSimpleIcon, EyeIcon, UserCircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from "@/components/ui/badge";
import { getBeltStyle } from '@/lib/belt-theme';
import { formatCPF, formatPhone } from '@/lib/validation';
import { GenerateAccessButton } from './generate-access-button';
import { ClaimAthleteButton } from './claim-athlete-button';
import { UnclaimAthleteButton } from './unclaim-athlete-button';

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

    // Fetch list of athletes
    let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'atleta');

    // If academy role, filter by tenant_id
    if (isAcademy) {
        query = query.eq('tenant_id', orgProfile.tenant_id);
    }

    const { data: athletes } = await query.order('updated_at', { ascending: false });

    // Fetch emails via admin client
    const adminClient = createAdminClient();
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

    const athletesWithEmails = athletes?.map(a => {
        const authUser = authUsers.find(u => u.id === a.id);
        return {
            ...a,
            email: authUser?.email || '-',
            created_at: a.created_at || authUser?.created_at
        };
    });

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
                .select('id, full_name, belt_color, gym_name, master_name, phone, cpf, created_at')
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

            suggestedAthletes = (similar ?? []).filter((a: any) => !linkedIds.has(a.id));
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

            {/* Card principal — não alterado */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Lista de Atletas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Faixa</TableHead>
                                <TableHead>E-mail</TableHead>
                                {isAdmin && <TableHead>Academia / Equipe</TableHead>}
                                <TableHead>Data de Cadastro</TableHead>
                                <TableHead className="text-right pr-6 w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!athletesWithEmails || athletesWithEmails.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                                        Nenhum atleta encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                athletesWithEmails.map((athlete) => {
                                    const hasOwnAccount = !athlete.email?.includes('@dummy.competir.com');
                                    return (
                                        <TableRow key={athlete.id}>
                                            <TableCell className="pl-6 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {athlete.full_name}
                                                    {hasOwnAccount && (
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            Conta própria
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    style={getBeltStyle(athlete.belt_color || '')}
                                                    className="text-panel-sm font-semibold uppercase tracking-wide"
                                                >
                                                    {athlete.belt_color || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {athlete.email?.includes('@dummy.competir.com') ? (
                                                    <GenerateAccessButton athleteId={athlete.id} athleteName={athlete.full_name} />
                                                ) : (
                                                    athlete.email
                                                )}
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell className="font-medium text-primary/80">
                                                    {athlete.gym_name || '-'}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-muted-foreground">
                                                {athlete.created_at
                                                    ? format(new Date(athlete.created_at), "dd/MM/yy", { locale: ptBR })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button pill variant="ghost" size="icon" asChild className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                                <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}/perfil`}>
                                                                    <EyeIcon size={24} weight="duotone" />
                                                                    <span className="sr-only">Ver Perfil</span>
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Ver perfil completo</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button pill variant="ghost" size="icon" asChild className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                                <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}`}>
                                                                    <PencilSimpleIcon size={24} weight="duotone" />
                                                                    <span className="sr-only">Editar</span>
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Editar dados do atleta</TooltipContent>
                                                    </Tooltip>
                                                    {isAcademy && hasOwnAccount && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <UnclaimAthleteButton athleteId={athlete.id} athleteName={athlete.full_name} />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">Desvincular atleta</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
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
                                        Atletas que se cadastraram e escolheram esta academia. Clique em "Este é meu atleta" para oficializar.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Nome</TableHead>
                                        <TableHead>Faixa</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Academia informada</TableHead>
                                        <TableHead>Mestre informado</TableHead>
                                        <TableHead className="text-right pr-6">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {linkedAthletes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                Nenhum atleta vinculado encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        linkedAthletes.map((athlete) => (
                                            <TableRow key={athlete.id}>
                                                <TableCell className="pl-6 font-medium">{athlete.full_name}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        style={getBeltStyle(athlete.belt_color || '')}
                                                        className="text-panel-sm font-semibold uppercase tracking-wide"
                                                    >
                                                        {athlete.belt_color || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {athlete.phone ? formatPhone(athlete.phone) : '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {athlete.cpf ? formatCPF(athlete.cpf) : '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{athlete.gym_name || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground">{athlete.master_name || '-'}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <ClaimAthleteButton athleteId={athlete.id} athleteName={athlete.full_name} currentMasterName={athlete.master_name ?? null} masters={academyMasters} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Nome</TableHead>
                                        <TableHead>Faixa</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Academia informada</TableHead>
                                        <TableHead>Mestre informado</TableHead>
                                        <TableHead className="text-right pr-6">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suggestedAthletes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                Nenhuma sugestão encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        suggestedAthletes.map((athlete) => (
                                            <TableRow key={athlete.id}>
                                                <TableCell className="pl-6 font-medium">{athlete.full_name}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        style={getBeltStyle(athlete.belt_color || '')}
                                                        className="text-panel-sm font-semibold uppercase tracking-wide"
                                                    >
                                                        {athlete.belt_color || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {athlete.phone ? formatPhone(athlete.phone) : '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {athlete.cpf ? formatCPF(athlete.cpf) : '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{athlete.gym_name || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground">{athlete.master_name || '-'}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <ClaimAthleteButton athleteId={athlete.id} athleteName={athlete.full_name} currentMasterName={athlete.master_name ?? null} masters={academyMasters} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

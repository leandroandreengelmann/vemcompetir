import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    PackageIcon, CurrencyCircleDollarIcon, TicketIcon, CheckCircleIcon, UserIcon,
} from '@phosphor-icons/react/dist/ssr';
import { CreatePackageButton } from '../academias-afiliadas/CreatePackageButton';

export default async function PacotesInscricoesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile.tenant_id) {
        redirect('/academia-equipe/dashboard');
    }

    const adminClient = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: ownedEvents }, { data: allTenants }, { data: packages }] = await Promise.all([
        adminClient
            .from('events')
            .select('id, title, event_date')
            .eq('tenant_id', profile.tenant_id)
            .gte('event_date', today.toISOString())
            .order('event_date'),
        adminClient
            .from('tenants')
            .select('id, name')
            .neq('id', profile.tenant_id)
            .order('name'),
        adminClient
            .from('inscription_packages')
            .select(`
                id, total_credits, used_credits, excluded_divisions, price_paid, notes, created_at,
                event:events!event_id(id, title),
                assigned_tenant:tenants!assigned_to_tenant_id(id, name),
                registrations:event_registrations!package_id(
                    id,
                    status,
                    athlete:profiles!athlete_id(full_name, belt_color),
                    category:category_rows!category_id(categoria_completa)
                )
            `)
            .eq('created_by_tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false }),
    ]);

    // Redireciona se não tiver nenhum evento ativo
    if (!ownedEvents || ownedEvents.length === 0) {
        redirect('/academia-equipe/dashboard');
    }

    // Resumo financeiro
    const pkgs = packages ?? [];
    const totalReceita = pkgs.reduce((sum, p: any) => sum + (Number(p.price_paid) || 0), 0);
    const totalCreditos = pkgs.reduce((sum, p: any) => sum + (p.total_credits || 0), 0);
    const totalUsados = pkgs.reduce((sum, p: any) => sum + (p.used_credits || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-panel-lg font-black tracking-tight">Pacotes de Inscrição</h1>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Ceda inscrições dos seus eventos para outras academias.
                    </p>
                </div>
                <CreatePackageButton
                    ownedEvents={(ownedEvents ?? []) as any}
                    allTenants={(allTenants ?? []).map((t: any) => ({ id: t.id, name: t.name }))}
                />
            </div>

            {/* Resumo financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10">
                                <CurrencyCircleDollarIcon size={20} weight="duotone" className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Total arrecadado</p>
                                <p className="text-panel-lg font-black tabular-nums">
                                    {totalReceita > 0
                                        ? `R$ ${totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <TicketIcon size={20} weight="duotone" className="text-primary" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Créditos cedidos</p>
                                <p className="text-panel-lg font-black tabular-nums">{totalCreditos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10">
                                <CheckCircleIcon size={20} weight="duotone" className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Créditos utilizados</p>
                                <p className="text-panel-lg font-black tabular-nums">
                                    {totalUsados}
                                    {totalCreditos > 0 && (
                                        <span className="text-panel-sm font-normal text-muted-foreground ml-1.5">
                                            ({Math.round((totalUsados / totalCreditos) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PackageIcon size={20} weight="duotone" className="text-primary" />
                            Pacotes Criados
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                            {pkgs.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Data</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Evento</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Academia</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Excluídas</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Créditos</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pkgs.length > 0 ? (
                                pkgs.map((pkg: any) => {
                                    const ev = Array.isArray(pkg.event) ? pkg.event[0] : pkg.event;
                                    const assignedTenant = Array.isArray(pkg.assigned_tenant) ? pkg.assigned_tenant[0] : pkg.assigned_tenant;
                                    const registrations: any[] = pkg.registrations ?? [];
                                    const remaining = pkg.total_credits - pkg.used_credits;
                                    return (
                                        <>
                                            <TableRow key={pkg.id}>
                                                <TableCell className="pl-6 text-panel-sm text-muted-foreground whitespace-nowrap">
                                                    {new Date(pkg.created_at).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="text-panel-sm font-medium">{ev?.title ?? '-'}</TableCell>
                                                <TableCell className="text-panel-sm text-muted-foreground">{assignedTenant?.name ?? '-'}</TableCell>
                                                <TableCell className="text-panel-sm text-muted-foreground">
                                                    {pkg.excluded_divisions?.length > 0 ? pkg.excluded_divisions.join(', ') : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={remaining === 0 ? 'secondary' : 'outline'} className="rounded-full tabular-nums">
                                                        {pkg.used_credits} / {pkg.total_credits}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-panel-sm text-right pr-6">
                                                    {pkg.price_paid > 0
                                                        ? <span className="font-semibold text-emerald-600">R$ {Number(pkg.price_paid).toFixed(2)}</span>
                                                        : <span className="text-muted-foreground">Grátis</span>}
                                                </TableCell>
                                            </TableRow>
                                            {registrations.length > 0 && (
                                                <TableRow key={`${pkg.id}-regs`} className="hover:bg-transparent">
                                                    <TableCell colSpan={6} className="pl-6 pr-6 pb-4 pt-0">
                                                        <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-primary/20 ml-1">
                                                            {registrations.map((reg: any) => {
                                                                const athlete = Array.isArray(reg.athlete) ? reg.athlete[0] : reg.athlete;
                                                                const category = Array.isArray(reg.category) ? reg.category[0] : reg.category;
                                                                return (
                                                                    <div key={reg.id} className="flex items-center gap-2 text-panel-sm text-muted-foreground">
                                                                        <UserIcon size={13} weight="duotone" className="text-primary shrink-0" />
                                                                        <span className="font-medium text-foreground">{athlete?.full_name ?? '—'}</span>
                                                                        <span className="text-muted-foreground/60">·</span>
                                                                        <span className="truncate">{category?.categoria_completa ?? '—'}</span>
                                                                        <Badge variant="outline" className="rounded-full text-[10px] ml-auto shrink-0">
                                                                            {reg.status}
                                                                        </Badge>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-panel-sm text-muted-foreground italic">
                                        Nenhum pacote criado ainda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

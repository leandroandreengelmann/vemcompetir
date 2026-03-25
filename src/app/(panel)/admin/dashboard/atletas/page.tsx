import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { UsersIcon, CalendarBlankIcon, TrendUpIcon } from '@phosphor-icons/react/dist/ssr';
import { AthletesFilters } from './components/athletes-filters';

interface PageProps {
    searchParams: Promise<{ de?: string; ate?: string }>;
}

function formatCpf(cpf?: string | null) {
    if (!cpf) return '-';
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function getInitials(name: string) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type BeltStyle = { bg: string; text: string; border: string; dot: string };

function getBeltStyle(belt?: string | null): BeltStyle {
    const normalized = belt?.toLowerCase().trim() ?? '';
    const map: Record<string, BeltStyle> = {
        'branca':          { bg: 'bg-white',        text: 'text-gray-700',   border: 'border-gray-300',  dot: 'bg-gray-300' },
        'cinza':           { bg: 'bg-gray-400',      text: 'text-white',      border: 'border-gray-400',  dot: 'bg-gray-400' },
        'cinza e branca':  { bg: 'bg-gray-200',      text: 'text-gray-700',   border: 'border-gray-300',  dot: 'bg-gray-400' },
        'amarela':         { bg: 'bg-yellow-400',    text: 'text-yellow-900', border: 'border-yellow-400',dot: 'bg-yellow-400' },
        'laranja':         { bg: 'bg-orange-500',    text: 'text-white',      border: 'border-orange-500',dot: 'bg-orange-500' },
        'verde':           { bg: 'bg-green-600',     text: 'text-white',      border: 'border-green-600', dot: 'bg-green-600' },
        'azul':            { bg: 'bg-blue-600',      text: 'text-white',      border: 'border-blue-600',  dot: 'bg-blue-600' },
        'roxa':            { bg: 'bg-purple-600',    text: 'text-white',      border: 'border-purple-600',dot: 'bg-purple-600' },
        'marrom':          { bg: 'bg-amber-800',     text: 'text-white',      border: 'border-amber-800', dot: 'bg-amber-800' },
        'preta':           { bg: 'bg-gray-900',      text: 'text-white',      border: 'border-gray-900',  dot: 'bg-gray-900' },
        'vermelha':        { bg: 'bg-red-600',       text: 'text-white',      border: 'border-red-600',   dot: 'bg-red-600' },
        'vermelha e preta':{ bg: 'bg-red-800',       text: 'text-white',      border: 'border-red-800',   dot: 'bg-red-800' },
    };
    return map[normalized] ?? { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' };
}

const avatarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-600', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-600', 'bg-indigo-500', 'bg-rose-500',
];
function getAvatarColor(id: string) {
    const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    return avatarColors[n % avatarColors.length];
}

export default async function AdminAthletesPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();
    const params = await searchParams;
    const now = new Date();

    const startDate = params.de ? startOfDay(parseISO(params.de)) : startOfMonth(now);
    const endDate   = params.ate ? endOfDay(parseISO(params.ate)) : endOfDay(now);

    const { data: athletes } = await adminClient
        .from('profiles')
        .select('id, full_name, cpf, belt_color, created_at, gym_name, tenant_id, tenants(name)')
        .eq('role', 'atleta')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

    const todayStart = startOfDay(now).toISOString();
    const weekStart  = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const todayEnd   = endOfDay(now).toISOString();

    const [{ count: countToday }, { count: countWeek }, { count: countMonth }] = await Promise.all([
        adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'atleta').gte('created_at', todayStart).lte('created_at', todayEnd),
        adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'atleta').gte('created_at', weekStart).lte('created_at', todayEnd),
        adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'atleta').gte('created_at', monthStart).lte('created_at', todayEnd),
    ]);

    const list = (athletes ?? []) as unknown as Array<{
        id: string;
        full_name: string;
        cpf?: string;
        belt_color?: string;
        created_at: string;
        gym_name?: string;
        tenant_id?: string;
        tenants?: { name: string } | null;
    }>;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Atletas"
                description="Monitore os novos cadastros de atletas na plataforma."
            />

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="relative overflow-hidden border-none shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium text-muted-foreground">Novos Hoje</CardTitle>
                        <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <CalendarBlankIcon size={18} weight="duotone" className="text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">{countToday ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">cadastros hoje</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
                        <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <TrendUpIcon size={18} weight="duotone" className="text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">{countWeek ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">desde segunda-feira</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium text-muted-foreground">Este Mês</CardTitle>
                        <div className="size-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <UsersIcon size={18} weight="duotone" className="text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">{countMonth ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {format(now, 'MMMM yyyy', { locale: ptBR })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <AthletesFilters currentDe={params.de} currentAte={params.ate} />

            {/* Tabela */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Atletas no Período
                        </div>
                        <span className="text-panel-sm font-normal text-muted-foreground">
                            {list.length} {list.length === 1 ? 'atleta' : 'atletas'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 w-12" />
                                <TableHead>Atleta</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead className="text-center w-40">Faixa</TableHead>
                                <TableHead>Academia</TableHead>
                                <TableHead className="text-right pr-6">Cadastro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.length > 0 ? list.map((athlete) => {
                                const academyName = athlete.tenants?.name ?? athlete.gym_name ?? null;
                                const belt = getBeltStyle(athlete.belt_color);
                                const avatarColor = getAvatarColor(athlete.id);

                                return (
                                    <TableRow key={athlete.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="pl-6">
                                            <div className={`size-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                                {getInitials(athlete.full_name ?? '?')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-panel-sm">{athlete.full_name}</span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-panel-sm font-mono">
                                            {formatCpf(athlete.cpf)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {athlete.belt_color ? (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${belt.bg} ${belt.text} ${belt.border} shadow-sm`}>
                                                    <span className={`size-2 rounded-full ${belt.dot} opacity-80`} />
                                                    {athlete.belt_color.charAt(0).toUpperCase() + athlete.belt_color.slice(1).toLowerCase()}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-panel-sm">
                                            {academyName
                                                ? <span className="font-medium">{academyName}</span>
                                                : <span className="text-muted-foreground italic text-xs">Sem academia</span>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="text-panel-sm font-medium">
                                                    {format(new Date(athlete.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(athlete.created_at), "HH:mm", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <UsersIcon size={32} weight="duotone" className="opacity-30" />
                                            <p className="text-panel-sm italic">Nenhum atleta cadastrado neste período.</p>
                                        </div>
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

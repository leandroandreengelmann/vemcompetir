import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    MoneyIcon,
    HourglassIcon,
    HandCoinsIcon,
    BuildingsIcon,
    ArrowRightIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getFinanceiroOverview } from './actions';
import { FinanceiroFilters } from './FinanceiroFilters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const EVENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    publicado: {
        label: 'Publicado',
        className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    },
    aprovado: {
        label: 'Aprovado',
        className: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
    },
    pendente: {
        label: 'Pendente',
        className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    },
    rejeitado: {
        label: 'Rejeitado',
        className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300 dark:border-red-500/30',
    },
    encerrado: {
        label: 'Encerrado',
        className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
    },
};

export default async function FinanceiroPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') redirect('/login');

    const { from = '', to = '', status = 'todos' } = await searchParams;
    const { kpis, events } = await getFinanceiroOverview({ from, to, status });

    const kpiCards = [
        {
            label: 'Total Faturado',
            value: formatBRL(kpis.total_faturado),
            sub: 'Inscrições pagas e confirmadas',
            Icon: MoneyIcon,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10',
            bar: 'bg-emerald-500/20',
        },
        {
            label: 'Aguardando Pagamento',
            value: formatBRL(kpis.total_pendente),
            sub: 'PIX gerado, aguardando confirmação',
            Icon: HourglassIcon,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
            bar: 'bg-amber-500/20',
        },
        {
            label: 'Comissão Plataforma',
            value: formatBRL(kpis.total_commission),
            sub: 'Taxa SaaS sobre pagamentos confirmados',
            Icon: HandCoinsIcon,
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-500/10',
            bar: 'bg-sky-500/20',
        },
        {
            label: 'Repasse Organizadores',
            value: formatBRL(kpis.total_organizer_revenue),
            sub: 'Faturado menos comissão da plataforma',
            Icon: BuildingsIcon,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10',
            bar: 'bg-violet-500/20',
        },
    ];

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Financeiro"
                description={`Panorama financeiro completo — ${kpis.total_events} evento${kpis.total_events !== 1 ? 's' : ''} encontrado${kpis.total_events !== 1 ? 's' : ''}`}
            />

            <FinanceiroFilters from={from} to={to} status={status} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <Card key={i} className="border-none shadow-sm overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1.5">
                                    <p className="text-panel-sm font-medium text-muted-foreground">{card.label}</p>
                                    <h3 className="text-panel-lg font-black tracking-tight">{card.value}</h3>
                                    <p className="text-panel-sm text-muted-foreground">{card.sub}</p>
                                </div>
                                <div className={`p-3 rounded-2xl ${card.bg} ${card.color} shrink-0`}>
                                    <card.Icon size={20} weight="duotone" />
                                </div>
                            </div>
                        </CardContent>
                        <div className={`h-1 w-full ${card.bar}`} />
                    </Card>
                ))}
            </div>

            {/* Events Table */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    <div className="px-6 py-5 border-b border-border/50">
                        <h3 className="text-panel-md font-semibold">Eventos com Inscrições</h3>
                        <p className="text-panel-sm text-muted-foreground mt-0.5">
                            Clique em &quot;Detalhes&quot; para ver atletas, status individual e comissões por evento
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="pl-6">Evento</TableHead>
                                    <TableHead>Organizador</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-center">Pagas</TableHead>
                                    <TableHead className="text-right">Valor Pago</TableHead>
                                    <TableHead className="text-center">Pendentes</TableHead>
                                    <TableHead className="text-right">Valor Pend.</TableHead>
                                    <TableHead className="text-center">Carrinho</TableHead>
                                    <TableHead className="text-center">Isentos</TableHead>
                                    <TableHead className="text-right">Comissão</TableHead>
                                    <TableHead className="text-right">Repasse</TableHead>
                                    <TableHead className="w-[100px] pr-6" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map(ev => (
                                    <TableRow key={ev.event_id} className="border-border/50">
                                        <TableCell className="pl-6 font-medium max-w-[200px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="truncate">{ev.event_title}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={`w-fit text-[10px] uppercase font-bold tracking-wide ${
                                                        EVENT_STATUS_CONFIG[ev.event_status]?.className ?? ''
                                                    }`}
                                                >
                                                    {EVENT_STATUS_CONFIG[ev.event_status]?.label ?? ev.event_status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-panel-sm">
                                            {ev.organizer_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-panel-sm whitespace-nowrap">
                                            {ev.event_date
                                                ? format(new Date(ev.event_date.slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="rounded-full font-bold bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">
                                                {ev.paid_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                            {formatBRL(ev.paid_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="rounded-full font-bold bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300">
                                                {ev.pending_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                                            {formatBRL(ev.pending_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="rounded-full font-bold bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300">
                                                {ev.cart_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="rounded-full font-bold bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300">
                                                {ev.isento_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                                            {formatBRL(ev.platform_commission)}
                                        </TableCell>
                                        <TableCell className="text-right text-violet-600 dark:text-violet-400 font-semibold whitespace-nowrap">
                                            {formatBRL(ev.organizer_revenue)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="outline" pill asChild className="gap-1.5 font-semibold">
                                                <Link href={`/admin/dashboard/financeiro/${ev.event_id}`}>
                                                    Detalhes
                                                    <ArrowRightIcon size={20} weight="duotone" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {events.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                            Nenhum evento ativo encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

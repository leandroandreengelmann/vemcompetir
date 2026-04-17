'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { listFinancialTransactions, listTenantEventsForFinanceiro } from '../actions';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MagnifyingGlassIcon,
    CaretLeftIcon,
    CaretRightIcon,
    ArrowLeftIcon,
    ArrowsClockwiseIcon,
    ReceiptIcon,
    ChartLineUpIcon,
} from '@phosphor-icons/react';
import { StatusChangeDialog } from './StatusChangeDialog';
import { PeriodFilter } from '../_components/PeriodFilter';
import { resolvePeriod, periodToIsoFilter } from '../_components/period';

function formatCPF(cpf?: string | null) {
    if (!cpf) return '—';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function TransacoesPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tipo, setTipo] = useState('todas');
    const [eventId, setEventId] = useState('todos');
    const [page, setPage] = useState(1);
    const [events, setEvents] = useState<any[]>([]);
    const [dialogTarget, setDialogTarget] = useState<any | null>(null);

    const periodFilter = useMemo(() => {
        const period = resolvePeriod({
            preset: searchParams.get('preset') ?? undefined,
            from: searchParams.get('from') ?? undefined,
            to: searchParams.get('to') ?? undefined,
        });
        return periodToIsoFilter(period);
    }, [searchParams]);

    useEffect(() => {
        listTenantEventsForFinanceiro().then((list: any) => setEvents(list));
    }, []);

    useEffect(() => {
        setPage(1);
    }, [periodFilter.from, periodFilter.to]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listFinancialTransactions({
                search,
                tipo,
                eventId: eventId === 'todos' ? undefined : eventId,
                page,
                from: periodFilter.from,
                to: periodFilter.to,
            });
            setData(res.data);
            setCount(res.count ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, tipo, eventId, page, periodFilter.from, periodFilter.to]);

    useEffect(() => {
        const timer = setTimeout(() => { load(); }, 300);
        return () => clearTimeout(timer);
    }, [load]);

    const totalPages = Math.ceil(count / 20);

    const renderBadge = (row: any) => {
        const t = row.tipo;
        if (t === 'cortesia') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-pink-500/10 text-pink-700 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-300">CORTESIA</Badge>;
        }
        if (t === 'pacote') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300">PACOTE</Badge>;
        }
        if (t === 'evento_proprio' || t === 'isento_evento_proprio') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300">ISENTO - EVENTO PRÓPRIO</Badge>;
        }
        if (t === 'pago_em_mao') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300">PAGO EM MÃO</Badge>;
        }
        if (t === 'pix_direto') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300">PIX DIRETO</Badge>;
        }
        if (t === 'agendado') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300">AGENDADO</Badge>;
        }
        if (t === 'pago') {
            const sub = row.payer_type === 'ACADEMY' ? 'pela academia' : row.payer_type === 'ATHLETE' ? 'pelo atleta' : null;
            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300">PAGO</Badge>
                    {sub && <span className="text-panel-sm text-muted-foreground">{sub}</span>}
                </div>
            );
        }
        if (t === 'pendente') {
            return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300">PENDENTE</Badge>;
        }
        return <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300">NA CESTA</Badge>;
    };

    const isRevenueTipo = (t: string) => ['pago', 'agendado', 'pago_em_mao', 'pix_direto'].includes(t);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Transações"
                description="Todas as inscrições dos eventos da sua academia, com valor e status."
                icon={ChartLineUpIcon as any}
                rightElement={
                    <div className="flex items-center gap-2">
                        <PeriodFilter />
                        <Link href="/academia-equipe/dashboard/financeiro">
                            <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                                <ArrowLeftIcon size={16} weight="duotone" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                }
            />

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-72 group">
                                <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Buscar por nome ou CPF..."
                                    variant="lg"
                                    className="pl-11 bg-background border-input shadow-sm"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <Select value={tipo} onValueChange={(val) => { setTipo(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[200px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todos os Tipos</SelectItem>
                                    <SelectItem value="receita">Apenas Receita</SelectItem>
                                    <SelectItem value="pago">Pagos</SelectItem>
                                    <SelectItem value="agendado">Agendados</SelectItem>
                                    <SelectItem value="cortesia">Cortesia</SelectItem>
                                    <SelectItem value="pacote">Pacote de Inscrições</SelectItem>
                                    <SelectItem value="evento_proprio">Evento Próprio</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={eventId} onValueChange={(val) => { setEventId(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[220px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Evento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Eventos</SelectItem>
                                    {events.map((ev: any) => (
                                        <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9 pill" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                <CaretLeftIcon size={16} weight="duotone" />
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground px-2">
                                Página {page} de {totalPages || 1}
                            </span>
                            <Button variant="outline" size="sm" className="h-9 pill" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                <CaretRightIcon size={16} weight="duotone" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11">Atleta</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 hidden md:table-cell">CPF</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Evento</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Tipo</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            {[...Array(6)].map((_, j) => (
                                                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-panel-sm">
                                            Nenhuma transação encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row: any) => (
                                        <TableRow key={row.registration_id} className="hover:bg-muted/30 transition-colors border-border/50">
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-panel-sm">{row.athlete_name}</span>
                                                    {row.athlete_gym && <span className="text-panel-sm text-muted-foreground">{row.athlete_gym}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-panel-sm text-muted-foreground">{formatCPF(row.athlete_cpf)}</TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-panel-sm font-semibold">{row.event_title}</span>
                                                    <span className="text-panel-sm text-muted-foreground">{formatDate(row.event_date)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{renderBadge(row)}</TableCell>
                                            <TableCell className="text-right font-bold text-panel-sm">
                                                {formatCurrency(row.price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        pill
                                                        className="h-9 gap-1 text-panel-sm font-semibold"
                                                        onClick={() => setDialogTarget(row)}
                                                    >
                                                        <ArrowsClockwiseIcon size={14} weight="duotone" />
                                                        Status
                                                    </Button>
                                                    {isRevenueTipo(row.tipo) && (
                                                        row.has_receipt ? (
                                                            <Button asChild size="sm" variant="ghost" pill className="h-9 gap-1 text-panel-sm font-semibold">
                                                                <Link href={`/academia-equipe/dashboard/financeiro/recibos?registration=${row.registration_id}`}>
                                                                    <ReceiptIcon size={14} weight="duotone" />
                                                                    Recibo
                                                                </Link>
                                                            </Button>
                                                        ) : (
                                                            <Button asChild size="sm" variant="outline" pill className="h-9 gap-1 text-panel-sm font-semibold">
                                                                <Link href={`/academia-equipe/dashboard/financeiro/recibos/novo?registration=${row.registration_id}`}>
                                                                    <ReceiptIcon size={14} weight="duotone" />
                                                                    Emitir
                                                                </Link>
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <StatusChangeDialog
                target={dialogTarget}
                onClose={() => setDialogTarget(null)}
                onUpdated={() => {
                    setDialogTarget(null);
                    load();
                }}
            />
        </div>
    );
}

'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportInscricoes, getEventReportInscricoesSummary } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon, EyeIcon, ArrowLeftIcon,
    CheckCircleIcon, HourglassIcon, HandHeartIcon, CurrencyCircleDollarIcon, ClockIcon, UsersIcon, TagIcon, InfoIcon
} from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { RegistrationDetailsDialog } from './RegistrationDetailsDialog';

function formatCPF(cpf?: string) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type Summary = {
    total_registrations: number;
    paid_count: number;
    scheduled_count: number;
    pending_count: number;
    courtesy_count: number;
    own_event_count: number;
    promo_free_count: number;
    paid_amount: number;
    scheduled_amount: number;
    pending_amount: number;
    paid_by_academy: number;
    paid_by_athlete: number;
};

export default function InscricoesReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            return url.searchParams.get('status') || 'todas';
        }
        return 'todas';
    });
    const [page, setPage] = useState(1);
    const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);

    useEffect(() => {
        getEventReportInscricoesSummary(eventId).then(setSummary).catch(console.error);
    }, [eventId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, page]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportInscricoes(eventId, { search, status, page });
            setData(res.data);
            setCount(res.count ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(count / 20);

    const renderStatusBadge = (reg: any) => {
        const tipo = reg.tipo;
        const payerType = reg.payer_type;

        if (tipo === 'cortesia') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                    PACOTE DE INSCRIÇÕES
                </Badge>
            );
        }
        if (tipo === 'evento_proprio') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                    EVENTO PRÓPRIO
                </Badge>
            );
        }
        if (tipo === 'agendado') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                    AGENDADO
                </Badge>
            );
        }
        if (tipo === 'pago') {
            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        PAGO
                    </Badge>
                    {payerType && (
                        <span className="text-panel-sm text-muted-foreground font-medium">
                            {payerType === 'ACADEMY' ? 'pela academia' : 'pelo atleta'}
                        </span>
                    )}
                </div>
            );
        }
        if (tipo === 'pendente') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    PENDENTE
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                NA CESTA
            </Badge>
        );
    };

    const renderBeltBadge = (belt: string) => {
        if (!belt) return null;

        const lowerBelt = belt.toLowerCase();
        let bgClass = "bg-muted text-muted-foreground border-border";

        if (lowerBelt.includes('branca')) bgClass = "bg-white text-slate-800 border-slate-200 shadow-sm";
        else if (lowerBelt.includes('azul')) bgClass = "bg-blue-500 text-white border-blue-600 shadow-sm";
        else if (lowerBelt.includes('roxa')) bgClass = "bg-purple-500 text-white border-purple-600 shadow-sm";
        else if (lowerBelt.includes('marrom')) bgClass = "bg-amber-800 text-white border-amber-900 shadow-sm";
        else if (lowerBelt.includes('preta')) bgClass = "bg-slate-900 text-white border-slate-950 shadow-sm dark:bg-black dark:border-slate-800";
        else if (lowerBelt.includes('colorida')) bgClass = "bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none shadow-sm";
        else if (lowerBelt.includes('cinza')) bgClass = "bg-gray-400 text-white border-gray-500 shadow-sm";
        else if (lowerBelt.includes('amarela')) bgClass = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm";
        else if (lowerBelt.includes('laranja')) bgClass = "bg-orange-500 text-white border-orange-600 shadow-sm";
        else if (lowerBelt.includes('verde')) bgClass = "bg-green-600 text-white border-green-700 shadow-sm";

        return (
            <Badge variant="outline" className={cn("text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5 mt-1", bgClass)}>
                {belt}
            </Badge>
        );
    };

    const semReceita = (summary?.courtesy_count ?? 0) + (summary?.own_event_count ?? 0);
    const confirmados = (summary?.paid_count ?? 0) + (summary?.scheduled_count ?? 0);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Relatório de Inscrições"
                description="Consulte todos os registros de atletas neste evento."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            {/* KPIs Summary */}
            {summary && (
                <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-4">
                        {/* Mini-cards de contagem (clicáveis como filtro) */}
                        <div className={cn("grid grid-cols-1 gap-2", summary.promo_free_count > 0 ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3")}>
                            <button
                                type="button"
                                onClick={() => { setStatus(status === 'pagas_todas' ? 'todas' : 'pagas_todas'); setPage(1); }}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all cursor-pointer",
                                    status === 'pagas_todas'
                                        ? "bg-emerald-500/15 dark:bg-emerald-400/15 ring-2 ring-emerald-500/30"
                                        : "bg-emerald-500/5 dark:bg-emerald-400/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10"
                                )}
                            >
                                <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 shrink-0">
                                    <CheckCircleIcon size={24} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Pagas</span>
                                    <span className="text-panel-md font-black tabular-nums leading-none mt-1">{confirmados}</span>
                                    <span className="text-panel-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(summary.paid_amount + summary.scheduled_amount)}</span>
                                    {summary.scheduled_count > 0 && (
                                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">{summary.paid_count} recebido, {summary.scheduled_count} agendado</span>
                                    )}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatus(status === 'pendente' ? 'todas' : 'pendente'); setPage(1); }}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all cursor-pointer",
                                    status === 'pendente'
                                        ? "bg-amber-500/15 dark:bg-amber-400/15 ring-2 ring-amber-500/30"
                                        : "bg-amber-500/5 dark:bg-amber-400/5 hover:bg-amber-500/10 dark:hover:bg-amber-400/10"
                                )}
                            >
                                <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 shrink-0">
                                    <HourglassIcon size={24} weight="duotone" className="text-amber-500 dark:text-amber-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Pendentes</span>
                                    <span className="text-panel-md font-black tabular-nums leading-none mt-1">{summary.pending_count}</span>
                                    {summary.pending_count > 0 && (
                                        <>
                                            <span className="text-panel-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(summary.pending_amount)}</span>
                                            <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">aguardando PIX</span>
                                        </>
                                    )}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatus(status === 'sem_receita' ? 'todas' : 'sem_receita'); setPage(1); }}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all cursor-pointer",
                                    status === 'sem_receita'
                                        ? "bg-slate-500/15 dark:bg-slate-400/15 ring-2 ring-slate-500/30"
                                        : "bg-slate-500/5 dark:bg-slate-400/5 hover:bg-slate-500/10 dark:hover:bg-slate-400/10"
                                )}
                            >
                                <div className="p-2 rounded-xl bg-slate-500/10 dark:bg-slate-400/10 shrink-0">
                                    <HandHeartIcon size={24} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Sem receita</span>
                                    <span className="text-panel-md font-black tabular-nums leading-none mt-1">{semReceita}</span>
                                    {semReceita > 0 && (
                                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">
                                            {summary.courtesy_count > 0 && `${summary.courtesy_count} via pacote`}
                                            {summary.courtesy_count > 0 && summary.own_event_count > 0 && ', '}
                                            {summary.own_event_count > 0 && `${summary.own_event_count} ev. próprio`}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* 2ª Categoria Grátis (condicional) */}
                            {summary.promo_free_count > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { setStatus(status === 'promo_gratis' ? 'todas' : 'promo_gratis'); setPage(1); }}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all cursor-pointer",
                                        status === 'promo_gratis'
                                            ? "bg-violet-500/15 dark:bg-violet-400/15 ring-2 ring-violet-500/30"
                                            : "bg-violet-500/5 dark:bg-violet-400/5 hover:bg-violet-500/10 dark:hover:bg-violet-400/10"
                                    )}
                                >
                                    <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 shrink-0">
                                        <TagIcon size={24} weight="duotone" className="text-violet-500 dark:text-violet-400" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">2ª Grátis</span>
                                        <span className="text-panel-md font-black tabular-nums leading-none mt-1">{summary.promo_free_count}</span>
                                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">2ª categoria grátis</span>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Financeiro */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                            <CurrencyCircleDollarIcon size={20} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                                            <span className="text-panel-sm text-muted-foreground font-medium">Receita Confirmada</span>
                                            <InfoIcon size={14} weight="duotone" className="text-muted-foreground/50" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="start" className="max-w-[260px] text-sm">
                                        Valor bruto total dos pagamentos PIX já confirmados e recebidos na conta.
                                    </TooltipContent>
                                </Tooltip>
                                <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(summary.paid_amount)}</span>
                            </div>

                            {summary.scheduled_count > 0 && (
                                <div className="flex items-center justify-between">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                                <ClockIcon size={20} weight="duotone" className="text-blue-500 dark:text-blue-400" />
                                                <span className="text-panel-sm text-muted-foreground font-medium">Agendado</span>
                                                <InfoIcon size={14} weight="duotone" className="text-muted-foreground/50" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-[260px] text-sm">
                                            PIX confirmado pelo banco, mas o dinheiro ainda não caiu na conta. Será recebido em breve.
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(summary.scheduled_amount)}</span>
                                </div>
                            )}

                            {summary.pending_count > 0 && (
                                <div className="flex items-center justify-between">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                                <HourglassIcon size={20} weight="duotone" className="text-amber-500 dark:text-amber-400" />
                                                <span className="text-panel-sm text-muted-foreground font-medium">Aguardando Pagamento</span>
                                                <InfoIcon size={14} weight="duotone" className="text-muted-foreground/50" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-[260px] text-sm">
                                            Inscrições com PIX gerado mas ainda não pago pelo atleta ou academia.
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(summary.pending_amount)}</span>
                                </div>
                            )}

                            {(summary.paid_by_academy > 0 && summary.paid_by_athlete > 0) && (
                                <div className="pt-1.5 border-t border-border/30">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                                <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                                                <span className="text-panel-sm text-muted-foreground font-medium">
                                                    {summary.paid_by_academy} pela academia, {summary.paid_by_athlete} pelo atleta
                                                </span>
                                                <InfoIcon size={14} weight="duotone" className="text-muted-foreground/50" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="max-w-[260px] text-sm">
                                            Quem realizou o pagamento: a academia (em lote pelos seus atletas) ou o próprio atleta diretamente.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-80 group">
                                <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Buscar por nome ou CPF..."
                                    variant="lg"
                                    className="pl-11 bg-background border-input shadow-sm"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[200px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="pagas_todas">Pagas (todas)</SelectItem>
                                    <SelectItem value="paga">Pagas (PIX)</SelectItem>
                                    <SelectItem value="agendado">Agendado</SelectItem>
                                    <SelectItem value="pendente">Pendentes</SelectItem>
                                    <SelectItem value="sem_receita">Sem receita</SelectItem>
                                    <SelectItem value="cortesia">Usando Pacote</SelectItem>
                                    <SelectItem value="evento_proprio">Evento Próprio</SelectItem>
                                    <SelectItem value="promo_gratis">2ª Categoria Grátis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 pill"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <CaretLeftIcon size={16} weight="duotone" />
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground px-2">
                                Página {page} de {totalPages || 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 pill"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <CaretRightIcon size={16} weight="duotone" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11 w-[60px]">Nº</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Atleta</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">CPF</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Categoria / Faixa</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Status</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-center w-[80px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map((reg) => (
                                        <TableRow
                                            key={reg.id}
                                            className="group hover:bg-muted/30 transition-colors border-border/50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedRegistration(reg);
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <TableCell className="font-mono text-panel-sm font-bold text-muted-foreground py-4">
                                                {reg.registration_number != null ? `#${String(reg.registration_number).padStart(3, '0')}` : '—'}
                                            </TableCell>
                                            <TableCell className="text-panel-sm font-bold py-4">{reg.athlete?.full_name}</TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground">{formatCPF(reg.athlete?.cpf)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-panel-sm font-medium truncate max-w-[300px]" title={reg.category?.categoria_completa}>{reg.category?.categoria_completa}</span>
                                                    {renderBeltBadge(reg.athlete?.belt_color)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-0.5">
                                                    {renderStatusBadge(reg)}
                                                    {reg.promo_type_applied && (
                                                        <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30">
                                                            2ª GRÁTIS
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-panel-sm font-bold">
                                                {formatCurrency(Number(reg.price || 0))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto">
                                                            <EyeIcon size={16} weight="duotone" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Ver detalhes da inscrição</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                                            Nenhuma inscrição encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <RegistrationDetailsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                registration={selectedRegistration}
            />
        </div>
    );
}

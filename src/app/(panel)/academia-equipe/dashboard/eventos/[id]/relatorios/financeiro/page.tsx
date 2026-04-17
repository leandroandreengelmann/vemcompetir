'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportFinanceiro } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CheckCircleIcon, HourglassIcon, HandHeartIcon, CurrencyCircleDollarIcon,
    ClockIcon, UsersIcon, TagIcon, InfoIcon, ArrowLeftIcon
} from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function FinanceiroReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [eventId]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportFinanceiro(eventId);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const summary = data?.summary;
    const confirmados = (summary?.paid_count ?? 0) + (summary?.scheduled_count ?? 0);
    const semReceita = (summary?.courtesy_count ?? 0) + (summary?.pacote_count ?? 0) + (summary?.own_event_count ?? 0);

    const renderStatusBadge = (reg: any) => {
        const tipo = reg.tipo;
        const payerType = reg.payer_type;

        if (tipo === 'cortesia') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-pink-500/10 text-pink-700 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30">
                    CORTESIA
                </Badge>
            );
        }
        if (tipo === 'pacote') {
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

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Relatório Financeiro"
                description="Resumo de valores confirmados e pendentes para este evento."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            {/* KPIs */}
            {summary && (
                <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-4">
                        {/* Mini-cards de contagem */}
                        <div className={cn("grid gap-2", summary.promo_free_count > 0 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3")}>
                            {/* Pagas */}
                            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 dark:bg-emerald-400/5 px-3 py-3">
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
                            </div>

                            {/* Pendentes */}
                            <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 dark:bg-amber-400/5 px-3 py-3">
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
                            </div>

                            {/* Sem receita */}
                            <div className="flex items-center gap-3 rounded-lg bg-slate-500/5 dark:bg-slate-400/5 px-3 py-3">
                                <div className="p-2 rounded-xl bg-slate-500/10 dark:bg-slate-400/10 shrink-0">
                                    <HandHeartIcon size={24} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Sem receita</span>
                                    <span className="text-panel-md font-black tabular-nums leading-none mt-1">{semReceita}</span>
                                    {semReceita > 0 && (
                                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">
                                            {summary.courtesy_count > 0 && `${summary.courtesy_count} cortesia`}
                                            {summary.courtesy_count > 0 && (summary.pacote_count > 0 || summary.own_event_count > 0) && ', '}
                                            {summary.pacote_count > 0 && `${summary.pacote_count} pacote`}
                                            {summary.pacote_count > 0 && summary.own_event_count > 0 && ', '}
                                            {summary.own_event_count > 0 && `${summary.own_event_count} ev. próprio`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 2ª Grátis */}
                            {summary.promo_free_count > 0 && (
                                <div className="flex items-center gap-3 rounded-lg bg-violet-500/5 dark:bg-violet-400/5 px-3 py-3">
                                    <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 shrink-0">
                                        <TagIcon size={24} weight="duotone" className="text-violet-500 dark:text-violet-400" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">2ª Grátis</span>
                                        <span className="text-panel-md font-black tabular-nums leading-none mt-1">{summary.promo_free_count}</span>
                                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">2ª categoria grátis</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Financeiro detalhado */}
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

            {/* Tabela de Transações */}
            <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="text-panel-sm font-semibold h-11">Data</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11">Atleta</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11">Categoria</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11">Status</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-border/50">
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.data.length > 0 ? (
                            data.data.map((reg: any, idx: number) => (
                                <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-border/50">
                                    <TableCell className="text-panel-sm font-medium py-4">
                                        {new Date(reg.created_at).toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-panel-sm font-medium">
                                        {reg.athlete}
                                    </TableCell>
                                    <TableCell className="text-panel-sm text-muted-foreground w-[300px]">
                                        {reg.category}
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
                                    <TableCell className="text-right font-bold text-panel-sm whitespace-nowrap">
                                        {formatCurrency(Number(reg.price || 0))}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                    Nenhuma transação encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

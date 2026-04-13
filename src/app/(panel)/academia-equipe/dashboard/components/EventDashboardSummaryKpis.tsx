'use client';

import { CheckCircleIcon, ClockIcon, HandHeartIcon, CurrencyCircleDollarIcon, HourglassIcon, UsersIcon, TagIcon, InfoIcon } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EventDashboardSummaryKpisProps {
    eventId: string;
    stats: {
        total_registrations: number;
        categories_active: number;
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
}

export function EventDashboardSummaryKpis({ eventId, stats }: EventDashboardSummaryKpisProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const semReceita = stats.courtesy_count + stats.own_event_count;
    const confirmados = stats.paid_count + stats.scheduled_count;
    const baseUrl = `/academia-equipe/dashboard/eventos/${eventId}/relatorios/inscricoes`;

    return (
        <div className="px-4 py-3 space-y-4">
            {/* Linha 1: Mini-cards de contagem (clicáveis - navegam para inscrições com filtro) */}
            <div className={cn("grid gap-2", stats.promo_free_count > 0 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3")}>
                {/* Pagas */}
                <Link
                    href={`${baseUrl}?status=pagas_todas`}
                    className="flex items-center gap-3 rounded-lg bg-emerald-500/5 dark:bg-emerald-400/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10 px-3 py-3 transition-all cursor-pointer"
                >
                    <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 shrink-0">
                        <CheckCircleIcon size={24} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Pagas</span>
                        <span className="text-panel-md font-black tabular-nums leading-none mt-1">{confirmados}</span>
                        <span className="text-panel-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(stats.paid_amount + stats.scheduled_amount)}</span>
                        {stats.scheduled_count > 0 && (
                            <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">{stats.paid_count} recebido, {stats.scheduled_count} agendado</span>
                        )}
                    </div>
                </Link>

                {/* Pendentes */}
                <Link
                    href={`${baseUrl}?status=pendente`}
                    className="flex items-center gap-3 rounded-lg bg-amber-500/5 dark:bg-amber-400/5 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 px-3 py-3 transition-all cursor-pointer"
                >
                    <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 shrink-0">
                        <HourglassIcon size={24} weight="duotone" className="text-amber-500 dark:text-amber-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Pendentes</span>
                        <span className="text-panel-md font-black tabular-nums leading-none mt-1">{stats.pending_count}</span>
                        {stats.pending_count > 0 && (
                            <>
                                <span className="text-panel-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(stats.pending_amount)}</span>
                                <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">aguardando PIX</span>
                            </>
                        )}
                    </div>
                </Link>

                {/* Sem receita */}
                <Link
                    href={`${baseUrl}?status=sem_receita`}
                    className="flex items-center gap-3 rounded-lg bg-slate-500/5 dark:bg-slate-400/5 hover:bg-slate-500/10 dark:hover:bg-slate-400/10 px-3 py-3 transition-all cursor-pointer"
                >
                    <div className="p-2 rounded-xl bg-slate-500/10 dark:bg-slate-400/10 shrink-0">
                        <HandHeartIcon size={24} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">Sem receita</span>
                        <span className="text-panel-md font-black tabular-nums leading-none mt-1">{semReceita}</span>
                        {semReceita > 0 && (
                            <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">
                                {stats.courtesy_count > 0 && `${stats.courtesy_count} via pacote`}
                                {stats.courtesy_count > 0 && stats.own_event_count > 0 && ', '}
                                {stats.own_event_count > 0 && `${stats.own_event_count} ev. próprio`}
                            </span>
                        )}
                    </div>
                </Link>

                {/* 2ª Categoria Grátis (condicional) */}
                {stats.promo_free_count > 0 && (
                    <Link
                        href={`${baseUrl}?status=promo_gratis`}
                        className="flex items-center gap-3 rounded-lg bg-violet-500/5 dark:bg-violet-400/5 hover:bg-violet-500/10 dark:hover:bg-violet-400/10 px-3 py-3 transition-all cursor-pointer"
                    >
                        <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 shrink-0">
                            <TagIcon size={24} weight="duotone" className="text-violet-500 dark:text-violet-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide leading-none">2ª Grátis</span>
                            <span className="text-panel-md font-black tabular-nums leading-none mt-1">{stats.promo_free_count}</span>
                            <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 truncate">2ª categoria grátis</span>
                        </div>
                    </Link>
                )}
            </div>

            {/* Linha 2: Financeiro */}
            <div className="space-y-2">
                {/* Receita confirmada */}
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
                    <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(stats.paid_amount)}</span>
                </div>

                {/* Agendado (condicional) */}
                {stats.scheduled_count > 0 && (
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
                        <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(stats.scheduled_amount)}</span>
                    </div>
                )}

                {/* Pendente (condicional) */}
                {stats.pending_count > 0 && (
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
                        <span className="text-panel-sm font-bold tabular-nums">{formatCurrency(stats.pending_amount)}</span>
                    </div>
                )}

                {/* Separador + quem pagou */}
                {(stats.paid_by_academy > 0 && stats.paid_by_athlete > 0) && (
                    <div className="pt-1.5 border-t border-border/30">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                    <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                                    <span className="text-panel-sm text-muted-foreground font-medium">
                                        {stats.paid_by_academy} pela academia, {stats.paid_by_athlete} pelo atleta
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
        </div>
    );
}

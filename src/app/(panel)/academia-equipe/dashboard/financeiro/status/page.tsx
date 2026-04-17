import Link from 'next/link';
import { listRegistrationStatusHistory } from '../actions';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeftIcon,
    ArrowsClockwiseIcon,
    CaretLeftIcon,
    CaretRightIcon,
} from '@phosphor-icons/react/dist/ssr';
import { PeriodFilter } from '../_components/PeriodFilter';
import { resolvePeriod, periodToIsoFilter, periodToQueryString } from '../_components/period';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const statusLabel: Record<string, string> = {
    pago: 'Pago',
    paga: 'Pago',
    confirmado: 'Confirmado',
    agendado: 'Agendado',
    pendente: 'Pendente',
    aguardando_pagamento: 'Aguardando Pagamento',
    pago_em_mao: 'Pago em Mão',
    pix_direto: 'PIX Direto',
    isento: 'Isento',
    isento_evento_proprio: 'Isento (Evento Próprio)',
    cancelada: 'Cancelada',
    carrinho: 'Na Cesta',
};

export const dynamic = 'force-dynamic';

export default async function StatusHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; preset?: string; from?: string; to?: string }>;
}) {
    const sp = await searchParams;
    const page = Number(sp.page ?? 1);
    const period = resolvePeriod(sp);
    const periodQs = periodToQueryString(period);
    const { data, count, pageSize } = await listRegistrationStatusHistory({
        page,
        ...periodToIsoFilter(period),
    });
    const totalPages = Math.ceil(count / pageSize) || 1;

    const prevHref = `?${periodQs}&page=${Math.max(1, page - 1)}`;
    const nextHref = `?${periodQs}&page=${Math.min(totalPages, page + 1)}`;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Histórico de Alterações de Status"
                description={`Trilha de auditoria — ${period.label.toLowerCase()}.`}
                icon={ArrowsClockwiseIcon as any}
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
                        <p className="text-panel-sm text-muted-foreground">
                            {count} {count === 1 ? 'registro' : 'registros'}
                        </p>

                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="h-9 pill" disabled={page <= 1}>
                                <Link href={prevHref} aria-label="Página anterior">
                                    <CaretLeftIcon size={16} weight="duotone" />
                                </Link>
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground px-2">
                                Página {page} de {totalPages}
                            </span>
                            <Button asChild variant="outline" size="sm" className="h-9 pill" disabled={page >= totalPages}>
                                <Link href={nextHref} aria-label="Próxima página">
                                    <CaretRightIcon size={16} weight="duotone" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11">Data</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Atleta / Evento</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Mudança</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Autor</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-panel-sm">
                                            Nenhuma alteração registrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row: any) => {
                                        const fromPrice = Number(row.from_price ?? 0);
                                        const toPrice = Number(row.to_price ?? 0);
                                        const priceChanged = fromPrice !== toPrice;
                                        return (
                                            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors border-border/50">
                                                <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap py-4">
                                                    {formatDateTime(row.created_at)}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-panel-sm">{row.registration?.athlete?.full_name ?? '—'}</span>
                                                        <span className="text-panel-sm text-muted-foreground">{row.registration?.event?.title ?? '—'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-panel-sm bg-muted/50">
                                                            {statusLabel[row.from_status] ?? row.from_status}
                                                        </Badge>
                                                        <span className="text-muted-foreground">→</span>
                                                        <Badge variant="outline" className="text-panel-sm bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                            {statusLabel[row.to_status] ?? row.to_status}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-panel-sm">
                                                    {priceChanged ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-muted-foreground line-through">{formatCurrency(fromPrice)}</span>
                                                            <span className="font-bold">{formatCurrency(toPrice)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold">{formatCurrency(toPrice)}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-panel-sm text-muted-foreground">
                                                    {row.actor?.full_name ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-panel-sm text-muted-foreground max-w-[260px]">
                                                    {row.reason || '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import Link from 'next/link';
import { listReceipts } from '../actions';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    ArrowLeftIcon,
    ReceiptIcon,
    CaretLeftIcon,
    CaretRightIcon,
} from '@phosphor-icons/react/dist/ssr';
import { ReceiptDownloadButton } from './ReceiptDownloadButton';
import { PeriodFilter } from '../_components/PeriodFilter';
import { resolvePeriod, periodToIsoFilter, periodToQueryString } from '../_components/period';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr?: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '—';

export const dynamic = 'force-dynamic';

export default async function ReceiptsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; preset?: string; from?: string; to?: string }>;
}) {
    const sp = await searchParams;
    const page = Number(sp.page ?? 1);
    const search = sp.search ?? '';
    const period = resolvePeriod(sp);
    const periodQs = periodToQueryString(period);
    const { data, count, pageSize } = await listReceipts({
        page,
        search,
        ...periodToIsoFilter(period),
    });
    const totalPages = Math.ceil(count / pageSize) || 1;

    const searchQs = search ? `&search=${encodeURIComponent(search)}` : '';
    const prevHref = `?${periodQs}${searchQs}&page=${Math.max(1, page - 1)}`;
    const nextHref = `?${periodQs}${searchQs}&page=${Math.min(totalPages, page + 1)}`;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Recibos Emitidos"
                description={`Histórico dos recibos — ${period.label.toLowerCase()}.`}
                icon={ReceiptIcon as any}
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
                            {count} {count === 1 ? 'recibo emitido' : 'recibos emitidos'}
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
                                    <TableHead className="text-panel-sm font-semibold h-11">Número</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Pagador</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Descrição</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Emitido em</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-panel-sm">
                                            Nenhum recibo emitido.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((r: any) => (
                                        <TableRow key={r.id} className="hover:bg-muted/30 transition-colors border-border/50">
                                            <TableCell className="font-mono text-panel-sm font-bold py-4">
                                                {r.receipt_number}/{r.receipt_year}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-panel-sm font-bold">{r.payer_name ?? '—'}</span>
                                                    {r.payer_document && (
                                                        <span className="text-panel-sm text-muted-foreground">{r.payer_document}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground max-w-[280px] truncate">
                                                {r.description ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(r.issued_at)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-panel-sm">
                                                {formatCurrency(Number(r.amount))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ReceiptDownloadButton receiptId={r.id} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

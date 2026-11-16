'use client';

import { useMemo, useState, useTransition, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAsaasPaymentReceiptAction, type PaymentReceiptResult } from '../lista-actions';
import type { AsaasPaymentRow } from '../types';
import { brl } from './DetalhamentoView';

const PAGE_SIZE = 50;
type Sort = 'data' | 'taxa' | 'valor';

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

function toCsv(rows: AsaasPaymentRow[]) {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const money = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
    const lines = [['ID Asaas', 'Data', 'Evento', 'Atletas', 'Bruto', 'Taxa', 'Líquido', 'Situação', 'Pagou'].join(';')];
    rows.forEach((r) =>
        lines.push(
            [
                r.asaasPaymentId, fmtDate(r.date), esc(r.eventTitle), esc(r.items.map((i) => i.athleteName).join(' | ')),
                money(r.grossCents), money(r.feeCents), money(r.netCents), r.situation, r.payerType,
            ].join(';'),
        ),
    );
    return '﻿' + lines.join('\r\n');
}

export function ListaAsaas({
    rows,
    focus,
    cardTotalCents,
    cardFeeCents,
}: {
    rows: AsaasPaymentRow[];
    focus: 'asaas' | 'taxa';
    cardTotalCents: number;
    cardFeeCents: number;
}) {
    const [q, setQ] = useState('');
    const [sort, setSort] = useState<Sort>(focus === 'taxa' ? 'taxa' : 'data');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState<Set<string>>(new Set());
    const [receipt, setReceipt] = useState<PaymentReceiptResult | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        const list = t
            ? rows.filter((r) => r.asaasPaymentId.toLowerCase().includes(t) || r.items.some((i) => i.athleteName.toLowerCase().includes(t)))
            : rows;
        return [...list].sort((a, b) =>
            sort === 'taxa' ? (b.feeCents ?? -1) - (a.feeCents ?? -1) : sort === 'valor' ? b.grossCents - a.grossCents : a.date < b.date ? 1 : -1,
        );
    }, [rows, q, sort]);

    const totals = useMemo(
        () => filtered.reduce((s, r) => ({ gross: s.gross + r.grossCents, fee: s.fee + (r.feeCents ?? 0), missing: s.missing + (r.feeCents == null ? 1 : 0) }), { gross: 0, fee: 0, missing: 0 }),
        [filtered],
    );
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const view = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const compared = focus === 'taxa' ? cardFeeCents : cardTotalCents;
    const checked = focus === 'taxa' ? totals.fee : totals.gross;
    const bate = !q && checked === compared;

    function openReceipt(paymentId: string) {
        setLoadingId(paymentId);
        startTransition(async () => {
            setReceipt(await getAsaasPaymentReceiptAction(paymentId));
            setLoadingId(null);
        });
    }

    function exportCsv() {
        const url = URL.createObjectURL(new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pagamentos-asaas.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Card id="detalhe" className="border-none shadow-sm scroll-mt-4">
            <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-panel-md">
                        {focus === 'taxa' ? 'Taxas do Asaas, pagamento a pagamento' : 'Pagamentos recebidos pelo Asaas'}
                    </h2>
                    <span
                        className={`rounded-full px-3 py-1 text-panel-sm font-semibold ${bate ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}
                    >
                        {q ? 'Filtro ativo: total parcial' : bate ? '✓ Soma da lista = card clicado' : `Diferença de ${brl(Math.abs(checked - compared))} para o card`}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Buscar atleta ou ID do Asaas"
                        aria-label="Buscar atleta ou ID do Asaas"
                        className="min-h-11 rounded-lg border bg-background px-3 flex-1 min-w-[220px]"
                    />
                    <select
                        value={sort}
                        onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}
                        aria-label="Ordenar por"
                        className="min-h-11 rounded-lg border bg-background px-3"
                    >
                        <option value="data">Mais recentes</option>
                        <option value="taxa">Maior taxa</option>
                        <option value="valor">Maior valor</option>
                    </select>
                    <button type="button" onClick={exportCsv} className="min-h-11 px-4 rounded-lg border bg-background text-panel-sm font-medium">
                        Exportar CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-panel-sm">
                        <caption className="sr-only">Pagamentos do Asaas com valor bruto, taxa e líquido</caption>
                        <thead>
                            <tr className="text-muted-foreground text-right">
                                <th scope="col" className="py-2 pr-2 text-left font-medium">Pagamento / atleta</th>
                                <th scope="col" className="py-2 px-2 font-medium">Data</th>
                                <th scope="col" className="py-2 px-2 font-medium">Bruto</th>
                                <th scope="col" className="py-2 px-2 font-medium">Taxa</th>
                                <th scope="col" className="py-2 px-2 font-medium">Líquido</th>
                                <th scope="col" className="py-2 px-2 font-medium">Situação</th>
                                <th scope="col" className="py-2 px-2 font-medium">Pagou</th>
                                <th scope="col" className="py-2 pl-2 font-medium">Comprovante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {view.length === 0 && (
                                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Nenhum pagamento encontrado.</td></tr>
                            )}
                            {view.map((r) => {
                                const expanded = open.has(r.paymentId);
                                return (
                                    <Fragment key={r.paymentId}>
                                        <tr className="border-b border-border/50 tabular-nums text-right">
                                            <td className="py-2 pr-2 text-left whitespace-normal">
                                                {r.items.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        aria-expanded={expanded}
                                                        onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(r.paymentId)) n.delete(r.paymentId); else n.add(r.paymentId); return n; })}
                                                        className="text-left underline-offset-2 hover:underline"
                                                    >
                                                        {expanded ? '▾' : '▸'} <strong>{r.asaasPaymentId}</strong> · {r.items.length} inscrições
                                                    </button>
                                                ) : (
                                                    <span><strong>{r.asaasPaymentId}</strong> · {r.items[0]?.athleteName}</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                                            <td className="py-2 px-2">{brl(r.grossCents)}</td>
                                            <td className="py-2 px-2">
                                                {r.feeCents == null ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs">não registrada</span> : `− ${brl(r.feeCents)}`}
                                            </td>
                                            <td className="py-2 px-2">{r.netCents == null ? '—' : brl(r.netCents)}</td>
                                            <td className="py-2 px-2">{r.situation}</td>
                                            <td className="py-2 px-2">{r.payerType}</td>
                                            <td className="py-2 pl-2">
                                                <button
                                                    type="button"
                                                    disabled={loadingId === r.paymentId}
                                                    onClick={() => openReceipt(r.paymentId)}
                                                    className="min-h-9 px-3 rounded-lg border bg-background text-xs font-medium disabled:opacity-60"
                                                >
                                                    {loadingId === r.paymentId ? 'Abrindo…' : 'Ver comprovante'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expanded && r.items.map((i) => (
                                            <tr key={i.registrationId} className="bg-muted/30 tabular-nums text-right">
                                                <td className="py-1.5 pr-2 pl-5 text-left whitespace-normal" colSpan={2}>↳ {i.athleteName} · {i.category}</td>
                                                <td className="py-1.5 px-2">{brl(i.amountCents)}</td>
                                                <td className="py-1.5 px-2">{i.feeShareCents == null ? '—' : `− ${brl(i.feeShareCents)} (rateio)`}</td>
                                                <td colSpan={4} />
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold tabular-nums text-right">
                                <td className="py-2 pr-2 text-left" colSpan={2}>Total ({filtered.length} pagamentos)</td>
                                <td className="py-2 px-2">{brl(totals.gross)}</td>
                                <td className="py-2 px-2">− {brl(totals.fee)}</td>
                                <td className="py-2 px-2">{brl(totals.gross - totals.fee)}</td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {totals.missing > 0 && (
                    <p className="text-panel-sm text-muted-foreground">
                        {totals.missing} pagamento(s) sem taxa registrada no sistema: o total de taxas e o líquido ficam incompletos. Abra o comprovante para ver a taxa real direto do Asaas.
                    </p>
                )}
                <p className="text-panel-sm text-muted-foreground">Pagamento com vários atletas: a taxa real é do pagamento; por atleta é rateio.</p>

                {pages > 1 && (
                    <div className="flex items-center justify-center gap-3 text-panel-sm">
                        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-11 px-3 rounded-lg border disabled:opacity-50">Anterior</button>
                        <span>Página {page} de {pages}</span>
                        <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="min-h-11 px-3 rounded-lg border disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </CardContent>

            <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>Comprovante do pagamento</DialogTitle>
                        <DialogDescription>Dados oficiais, consultados agora no Asaas.</DialogDescription>
                    </DialogHeader>
                    {receipt && !receipt.ok && <p className="text-red-600" role="alert">{receipt.error}</p>}
                    {receipt?.ok && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-panel-sm">
                            <dt className="text-muted-foreground">ID Asaas</dt><dd className="font-semibold">{receipt.asaasPaymentId}</dd>
                            <dt className="text-muted-foreground">Situação</dt><dd className="font-semibold">{receipt.status ?? '—'}</dd>
                            <dt className="text-muted-foreground">Valor</dt><dd className="font-semibold tabular-nums">{brl(receipt.valueCents)}</dd>
                            <dt className="text-muted-foreground">Taxa Asaas</dt><dd className="font-semibold tabular-nums">{receipt.feeCents == null ? '—' : `− ${brl(receipt.feeCents)}`}</dd>
                            <dt className="text-muted-foreground">Líquido</dt><dd className="font-semibold tabular-nums">{receipt.netCents == null ? '—' : brl(receipt.netCents)}</dd>
                            <dt className="text-muted-foreground">Data do pagamento</dt>
                            <dd className="font-semibold">{receipt.paymentDate ? receipt.paymentDate.split('-').reverse().join('/') : '—'}</dd>
                            <dt className="text-muted-foreground">Forma</dt><dd className="font-semibold">{receipt.billingType ?? '—'}</dd>
                        </dl>
                    )}
                    {receipt?.ok && (receipt.receiptUrl ? (
                        <a href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground font-medium">
                            Abrir comprovante oficial
                        </a>
                    ) : (
                        <p className="text-panel-sm text-muted-foreground">Comprovante ainda não disponível (aparece depois da confirmação do pagamento).</p>
                    ))}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

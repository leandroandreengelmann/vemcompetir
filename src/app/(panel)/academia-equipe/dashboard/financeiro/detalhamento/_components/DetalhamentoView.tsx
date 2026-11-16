'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import type { Detalhamento, OriginRow } from '../types';
import type { Origin } from '../../../actions/registration-origin';

export const brl = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const META: Record<Origin, { label: string; color: string; group: string }> = {
    asaas: { label: 'Pago pelo Asaas (Pix)', color: '#2563eb', group: 'Passou pelo Asaas' },
    pix_academia: { label: 'Pix direto na academia', color: '#059669', group: 'Pago por fora' },
    dinheiro: { label: 'Dinheiro em espécie', color: '#d97706', group: 'Pago por fora' },
    por_fora: { label: 'Por fora (método não informado)', color: '#0d9488', group: 'Pago por fora' },
    cortesia: { label: 'Cortesia', color: '#7c3aed', group: 'Sem custo' },
    gratis: { label: 'Grátis (2ª categoria etc.)', color: '#db2777', group: 'Sem custo' },
    pacote: { label: 'Pacote / crédito', color: '#a855f7', group: 'Sem custo' },
    pendente: { label: 'Pendente (aguardando Pix)', color: '#64748b', group: 'Em aberto' },
};
const GROUPS = ['Passou pelo Asaas', 'Pago por fora', 'Sem custo', 'Em aberto'];

function Stat({ label, value, note, tone, href }: { label: string; value: string; note?: string; tone?: 'neg' | 'main'; href?: string }) {
    const Wrapper: any = href ? Link : 'div';
    return (
        <Wrapper
            {...(href ? { href, scroll: true } : {})}
            className={`block rounded-2xl border p-5 bg-background ${tone === 'main' ? 'border-emerald-500/60 border-2' : 'border-border/50'} ${href ? 'hover:border-primary/60 hover:shadow-md transition' : ''}`}
        >
            <div className="text-panel-sm text-muted-foreground">{label}</div>
            <div className={`text-2xl font-bold tabular-nums ${tone === 'neg' ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</div>
            {note && <div className="text-panel-sm text-muted-foreground">{note}</div>}
            {href && <div className="text-xs text-primary mt-1">Clique para detalhar</div>}
        </Wrapper>
    );
}

export function DetalhamentoView({ data, linkBase = '' }: { data: Detalhamento; linkBase?: string }) {
    const to = (origem: string) => `?${linkBase ? linkBase + '&' : ''}origem=${origem}#detalhe`;
    const [modo, setModo] = useState<'valor' | 'qtd'>('valor');
    const rows = data.rows;
    const get = (o: Origin) => rows.find((r) => r.origin === o) as OriginRow;
    const value = (r: OriginRow) => (modo === 'valor' ? r.amountCents : r.count);
    const total = rows.reduce((s, r) => s + value(r), 0);

    let acc = 0;
    const stops: string[] = [];
    rows.forEach((r) => {
        const p = total ? (value(r) / total) * 100 : 0;
        if (p > 0) stops.push(`${META[r.origin].color} ${acc.toFixed(3)}% ${(acc + p).toFixed(3)}%`);
        acc += p;
    });
    const pieBg = stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--border)';
    const asaas = get('asaas');
    const outsideCount = get('pix_academia').count + get('dinheiro').count + get('por_fora').count;
    const totalCount = rows.reduce((s, r) => s + r.count, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat label="Entrou pelo Asaas (bruto)" value={brl(data.asaasGrossCents)} note={`${asaas.count} Pix pelo Asaas`} href={to('asaas')} />
                <Stat
                    href={to('taxa')}
                    label="(−) Taxas do Asaas"
                    value={`− ${brl(data.asaasFeeCents)}`}
                    tone="neg"
                    note={data.feeMissingCount > 0 ? `${data.feeMissingCount} pagamento(s) sem taxa registrada` : 'taxa real de cada Pix'}
                />
                <Stat label="(+) Pago por fora" value={brl(data.outsideCents)} note={`${outsideCount} inscrições · Pix da academia + dinheiro`} />
                <Stat label="Líquido que você recebe" value={brl(data.netCents)} note="Asaas líquido + por fora" tone="main" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,380px)_1fr] gap-6 items-start">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="font-bold text-panel-md">Para onde foi o dinheiro</h2>
                        <div className="flex gap-2 justify-center" role="group" aria-label="Base do gráfico">
                            {(['valor', 'qtd'] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    aria-pressed={modo === m}
                                    onClick={() => setModo(m)}
                                    className={`min-h-11 px-3 rounded-lg border text-panel-sm ${modo === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}
                                >
                                    {m === 'valor' ? 'Por valor (R$)' : 'Por inscrições'}
                                </button>
                            ))}
                        </div>
                        <div
                            className="relative mx-auto aspect-square w-full max-w-[280px] rounded-full"
                            style={{ background: pieBg }}
                            role="img"
                            aria-label="Gráfico de pizza. Os valores estão na legenda e na tabela."
                        >
                            <div className="absolute inset-[26%] rounded-full bg-card grid place-content-center text-center text-panel-sm text-muted-foreground">
                                {modo === 'valor' ? 'Total' : 'Inscrições'}
                                <span className="text-base font-bold text-foreground tabular-nums">{modo === 'valor' ? brl(total) : total}</span>
                            </div>
                        </div>
                        <ul className="space-y-1.5 text-panel-sm">
                            {rows.map((r) => (
                                <li key={r.origin} className="flex items-center gap-2">
                                    <span className="size-3 rounded-sm shrink-0" style={{ background: META[r.origin].color }} />
                                    <span>
                                        {META[r.origin].label}:{' '}
                                        <strong className="tabular-nums">{modo === 'valor' ? brl(r.amountCents) : `${r.count} insc.`}</strong>{' '}
                                        ({total ? ((value(r) / total) * 100).toFixed(1).replace('.', ',') : '0,0'}%)
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6 space-y-3">
                        <h2 className="font-bold text-panel-md">Detalhamento por origem</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-panel-sm">
                                <caption className="sr-only">Valores e quantidades por origem do dinheiro</caption>
                                <thead>
                                    <tr className="text-muted-foreground text-left">
                                        <th scope="col" className="py-2 pr-2 font-medium">Origem</th>
                                        <th scope="col" className="py-2 px-2 text-right font-medium">Inscrições</th>
                                        <th scope="col" className="py-2 px-2 text-right font-medium">Valor</th>
                                        <th scope="col" className="py-2 px-2 text-right font-medium">Taxa</th>
                                        <th scope="col" className="py-2 pl-2 text-right font-medium">Líquido</th>
                                    </tr>
                                </thead>
                                {GROUPS.map((g) => (
                                    <tbody key={g}>
                                        <tr>
                                            <th scope="colgroup" colSpan={5} className="bg-muted/40 py-1.5 px-2 text-left text-xs uppercase tracking-wide text-muted-foreground">{g}</th>
                                        </tr>
                                        {rows.filter((r) => META[r.origin].group === g).map((r) => {
                                            const received = ['asaas', 'pix_academia', 'dinheiro', 'por_fora'].includes(r.origin);
                                            return (
                                                <tr key={r.origin} className="border-b border-border/50 tabular-nums">
                                                    <td className="py-2 pr-2">
                                                        <span className="inline-block size-3 rounded-sm mr-2 align-middle" style={{ background: META[r.origin].color }} />
                                                        {META[r.origin].label}
                                                    </td>
                                                    <td className="py-2 px-2 text-right">{r.count}</td>
                                                    <td className="py-2 px-2 text-right">{brl(r.amountCents)}</td>
                                                    <td className="py-2 px-2 text-right">{r.feeCents ? `− ${brl(r.feeCents)}` : '—'}</td>
                                                    <td className="py-2 pl-2 text-right">{received ? brl(r.amountCents - r.feeCents) : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                ))}
                                <tfoot>
                                    <tr className="font-bold tabular-nums">
                                        <td className="py-2 pr-2">Total de inscrições</td>
                                        <td className="py-2 px-2 text-right">{totalCount}</td>
                                        <td className="py-2 px-2 text-right">{brl(data.asaasGrossCents + data.outsideCents)}</td>
                                        <td className="py-2 px-2 text-right">− {brl(data.asaasFeeCents)}</td>
                                        <td className="py-2 pl-2 text-right">{brl(data.netCents)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <p className="text-panel-sm text-muted-foreground">
                            Cortesia, grátis e pacote aparecem com quantidade e R$ 0,00 (sem custo e sem receita). Pendente não entra no líquido. Período pela data da inscrição.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {data.tokens.enabled && (
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="font-bold text-panel-md">Custo de tokens da plataforma</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Stat label="Tokens consumidos" value={String(data.tokens.consumed)} note="1 token por inscrição confirmada" />
                            <Stat
                                label="Valor do token"
                                value={data.tokens.unitPriceCents != null ? brl(data.tokens.unitPriceCents) : '—'}
                                note={data.tokens.unitPriceCents != null ? 'preço médio dos pacotes comprados' : 'sem preço disponível'}
                            />
                            <Stat
                                label="(−) Custo de tokens"
                                value={data.tokens.costCents != null ? `− ${brl(data.tokens.costCents)}` : '—'}
                                tone="neg"
                            />
                            <Stat
                                label="Resultado após tokens"
                                value={data.resultAfterTokensCents != null ? brl(data.resultAfterTokensCents) : '—'}
                                note="líquido − tokens"
                                tone="main"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

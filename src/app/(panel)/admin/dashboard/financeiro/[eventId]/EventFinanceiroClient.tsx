'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    CheckCircleIcon,
    HourglassIcon,
    ShoppingBagIcon,
    HandCoinsIcon,
    BuildingsIcon,
    InfoIcon,
    TagIcon,
    CopyIcon,
    CalendarIcon,
    XIcon,
    DownloadSimpleIcon,
    FileCsvIcon,
    FilePdfIcon,
    FileCodeIcon,
    CaretDownIcon,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EventFinanceiroDetail, RegistrationDetail } from './actions';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterStatus = 'todos' | 'pago' | 'pendente' | 'carrinho' | 'isento';
type DatePreset   = { label: string; from: string; to: string };

interface Props { data: EventFinanceiroDetail; }

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Date presets ────────────────────────────────────────────────────────────

function todayStr()  { return new Date().toISOString().slice(0, 10); }
function offsetDate(days: number) {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}
function monthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const DATE_PRESETS: DatePreset[] = [
    { label: 'Hoje',        from: todayStr(),     to: todayStr() },
    { label: 'Últimos 7d',  from: offsetDate(-7), to: todayStr() },
    { label: 'Últimos 30d', from: offsetDate(-30), to: todayStr() },
    { label: 'Este mês',    from: monthStart(),   to: todayStr() },
];

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pago:                 { label: 'Pago',         className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
    confirmado:           { label: 'Confirmado',   className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
    aguardando_pagamento: { label: 'Aguard. PIX',  className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
    pendente:             { label: 'Pendente',     className: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300' },
    carrinho:             { label: 'No Carrinho',  className: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300' },
    isento:               { label: 'Isento',       className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300' },
};

function statusLabel(s: string) { return STATUS_CONFIG[s]?.label ?? s; }

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, className: '' };
    return (
        <Badge variant="outline" className={cn('text-[10px] uppercase font-bold tracking-wide', cfg.className)}>
            {cfg.label}
        </Badge>
    );
}

function CopyButton({ value }: { value: string }) {
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(value); toast.success('Copiado!'); }}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
        >
            <CopyIcon size={20} weight="duotone" />
        </button>
    );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mime: string) {
    const blob = new Blob(['\uFEFF' + content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportCSV(rows: RegistrationDetail[], eventTitle: string) {
    const headers = ['Data/Hora', 'Atleta', 'CPF', 'Categoria', 'Status', 'Valor Bruto', 'ID Asaas'];
    const lines = rows.map(r => [
        formatDate(r.created_at),
        r.athlete_name,
        r.athlete_cpf,
        r.category,
        statusLabel(r.status),
        formatBRL(r.price),
        r.asaas_payment_id ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const csv = [headers.join(';'), ...lines].join('\r\n');
    triggerDownload(csv, `financeiro_${eventTitle.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8');
    toast.success(`CSV exportado — ${rows.length} registros`);
}

function exportXML(rows: RegistrationDetail[], eventTitle: string) {
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const items = rows.map(r => `
  <inscricao>
    <data_hora>${esc(formatDate(r.created_at))}</data_hora>
    <atleta>${esc(r.athlete_name)}</atleta>
    <cpf>${esc(r.athlete_cpf)}</cpf>
    <categoria>${esc(r.category)}</categoria>
    <status>${esc(statusLabel(r.status))}</status>
    <valor_bruto>${r.price.toFixed(2)}</valor_bruto>
    <id_asaas>${esc(r.asaas_payment_id ?? '')}</id_asaas>
  </inscricao>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<inscricoes evento="${esc(eventTitle)}" total="${rows.length}" exportado_em="${new Date().toISOString()}">${items}\n</inscricoes>`;
    triggerDownload(xml, `financeiro_${eventTitle.replace(/\s+/g, '_')}.xml`, 'application/xml;charset=utf-8');
    toast.success(`XML exportado — ${rows.length} registros`);
}

function exportPDF(rows: RegistrationDetail[], eventTitle: string, organizerName: string) {
    const fmtBRL = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const totalBruto   = rows.reduce((s, r) => s + r.price, 0);
    const totalComissao = rows.reduce((s, r) => s + r.fee_unit, 0);
    const totalRepasse  = rows.reduce((s, r) => s + r.organizer_value, 0);

    const rows_html = rows.map(r => `
      <tr>
        <td>${formatDate(r.created_at)}</td>
        <td><strong>${r.athlete_name}</strong><br><small>${r.athlete_cpf}</small><br><small>${r.athlete_email}</small></td>
        <td>${r.athlete_gym}</td>
        <td>${r.category}</td>
        <td><span class="badge badge-${r.status}">${statusLabel(r.status)}${r.exemption_reason ? `<br><small>${r.exemption_reason}</small>` : ''}</span></td>
        <td class="num ${['pago','confirmado'].includes(r.status) ? 'green' : ''}">${r.price > 0 ? fmtBRL(r.price) : 'ISENTO'}</td>
        <td class="num purple">${r.fee_unit > 0 ? fmtBRL(r.fee_unit) : '—'}</td>
        <td class="num">${r.price > 0 ? fmtBRL(r.organizer_value) : '—'}</td>
        <td class="mono small">${r.asaas_payment_id ?? '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Financeiro — ${eventTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
    .summary { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .summary-card { background: #f4f4f5; border-radius: 8px; padding: 10px 16px; min-width: 140px; }
    .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .summary-card .value { font-size: 15px; font-weight: 800; margin-top: 2px; }
    .summary-card.green .value { color: #16a34a; }
    .summary-card.purple .value { color: #7c3aed; }
    .summary-card.rose .value { color: #e11d48; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f4f4f5; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 7px 8px; text-align: left; border-bottom: 2px solid #e4e4e7; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 10.5px; }
    tr:hover td { background: #fafafa; }
    .num { text-align: right; font-weight: 600; white-space: nowrap; }
    .green { color: #16a34a; }
    .purple { color: #7c3aed; }
    .mono { font-family: monospace; }
    .small { font-size: 9.5px; color: #888; }
    small { font-size: 9px; color: #888; display: block; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .badge-pago, .badge-confirmado { background: #dcfce7; color: #15803d; }
    .badge-aguardando_pagamento { background: #fef3c7; color: #b45309; }
    .badge-pendente { background: #ffedd5; color: #c2410c; }
    .badge-carrinho { background: #e0f2fe; color: #0369a1; }
    .badge-isento { background: #dbeafe; color: #1d4ed8; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e4e4e7; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      @page { margin: 16mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <h1>${eventTitle}</h1>
  <p class="meta">Organizador: ${organizerName} &nbsp;·&nbsp; Exportado em: ${new Date().toLocaleString('pt-BR')} &nbsp;·&nbsp; ${rows.length} inscrição${rows.length !== 1 ? 'ões' : ''} selecionada${rows.length !== 1 ? 's' : ''}</p>

  <div class="summary">
    <div class="summary-card green">
      <div class="label">Valor Bruto Total</div>
      <div class="value">${fmtBRL(totalBruto)}</div>
    </div>
    <div class="summary-card purple">
      <div class="label">Comissão Plataforma</div>
      <div class="value">${fmtBRL(totalComissao)}</div>
    </div>
    <div class="summary-card rose">
      <div class="label">Repasse Organizador</div>
      <div class="value">${fmtBRL(totalRepasse)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data/Hora</th>
        <th>Atleta / CPF / E-mail</th>
        <th>Equipe</th>
        <th>Categoria</th>
        <th>Status</th>
        <th style="text-align:right">Valor Bruto</th>
        <th style="text-align:right">Comissão</th>
        <th style="text-align:right">Repasse</th>
        <th>ID Asaas</th>
      </tr>
    </thead>
    <tbody>${rows_html}</tbody>
  </table>

  <div class="footer">
    <span>Relatório gerado pela plataforma COMPETIR</span>
    <span>${eventTitle} — ${new Date().toLocaleDateString('pt-BR')}</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) { toast.error('Permita pop-ups para exportar PDF'); return; }
    win.document.write(html);
    win.document.close();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventFinanceiroClient({ data }: Props) {
    const { event, kpis, registrations } = data;

    const [filter, setFilter]       = useState<FilterStatus>('todos');
    const [dateFrom, setDateFrom]   = useState('');
    const [dateTo, setDateTo]       = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const hasDateFilter = !!dateFrom || !!dateTo;

    // Clear selection whenever filters change
    useEffect(() => { setSelectedIds(new Set()); }, [filter, dateFrom, dateTo]);

    const filtered = useMemo(() => {
        let result = registrations;
        if (filter === 'pago')          result = result.filter(r => ['pago', 'confirmado'].includes(r.status));
        else if (filter === 'pendente') result = result.filter(r => ['aguardando_pagamento', 'pendente'].includes(r.status));
        else if (filter === 'carrinho') result = result.filter(r => r.status === 'carrinho');
        else if (filter === 'isento')   result = result.filter(r => r.status === 'isento');
        if (dateFrom) {
            const from = new Date(dateFrom + 'T00:00:00');
            result = result.filter(r => new Date(r.created_at) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo + 'T23:59:59');
            result = result.filter(r => new Date(r.created_at) <= to);
        }
        return result;
    }, [filter, registrations, dateFrom, dateTo]);

    // Selection helpers
    const filteredIds     = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
    const selectedCount   = useMemo(() => [...selectedIds].filter(id => filteredIds.has(id)).length, [selectedIds, filteredIds]);
    const allSelected     = filtered.length > 0 && selectedCount === filtered.length;
    const someSelected    = selectedCount > 0 && selectedCount < filtered.length;
    const selectedRows    = useMemo(() => filtered.filter(r => selectedIds.has(r.id)), [filtered, selectedIds]);

    const toggleAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(r => next.delete(r.id)); return next; });
        } else {
            setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(r => next.add(r.id)); return next; });
        }
    }, [allSelected, filtered]);

    const toggleOne = useCallback((id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }, []);

    function clearSelection() { setSelectedIds(new Set()); }
    function applyPreset(p: DatePreset) { setDateFrom(p.from); setDateTo(p.to); }
    function clearDates() { setDateFrom(''); setDateTo(''); }

    // ─── KPI cards ───────────────────────────────────────────────────────────
    const kpiCards = [
        { label: 'Confirmado / Recebido',  value: formatBRL(kpis.paid_amount),          sub: `${kpis.paid_count} inscrição${kpis.paid_count !== 1 ? 'ões' : ''}`,     Icon: CheckCircleIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500/20', filterKey: 'pago' as FilterStatus },
        { label: 'Aguardando Pagamento',   value: formatBRL(kpis.pending_amount),        sub: `${kpis.pending_count} inscrição${kpis.pending_count !== 1 ? 'ões' : ''}`, Icon: HourglassIcon,   color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10',   bar: 'bg-amber-500/20',   filterKey: 'pendente' as FilterStatus },
        { label: 'Na Cesta de Compras',    value: formatBRL(kpis.cart_amount),           sub: `${kpis.cart_count} inscrição${kpis.cart_count !== 1 ? 'ões' : ''}`,      Icon: ShoppingBagIcon, color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-500/10',     bar: 'bg-sky-500/20',     filterKey: 'carrinho' as FilterStatus },
        { label: 'Comissão Plataforma',    value: formatBRL(kpis.platform_commission),   sub: `Taxa SaaS — R$ ${event.fee_per_registration.toFixed(2)} / inscrição`,     Icon: HandCoinsIcon,   color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10',  bar: 'bg-violet-500/20',  filterKey: null },
        { label: 'Repasse ao Organizador', value: formatBRL(kpis.organizer_revenue),     sub: 'Faturado menos comissão plataforma',                                       Icon: BuildingsIcon,   color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-500/10',    bar: 'bg-rose-500/20',    filterKey: null },
    ];

    const filterButtons: { key: FilterStatus; label: string; count: number }[] = [
        { key: 'todos',    label: 'Todas',     count: registrations.length },
        { key: 'pago',     label: 'Pagas',     count: kpis.paid_count },
        { key: 'pendente', label: 'Pendentes', count: kpis.pending_count },
        { key: 'carrinho', label: 'Carrinho',  count: kpis.cart_count },
        { key: 'isento',   label: 'Isentos',   count: kpis.isento_count },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiCards.map((card, i) => (
                    <Card
                        key={i}
                        className={cn(
                            'border-none shadow-sm overflow-hidden transition-all',
                            card.filterKey && 'cursor-pointer hover:shadow-md',
                            card.filterKey && filter === card.filterKey && 'ring-2 ring-offset-1 ring-foreground/20',
                        )}
                        onClick={() => card.filterKey && setFilter(f => f === card.filterKey ? 'todos' : card.filterKey!)}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-panel-sm font-medium text-muted-foreground leading-tight">{card.label}</p>
                                    <h3 className="text-panel-lg font-black tracking-tight">{card.value}</h3>
                                    <p className="text-panel-sm text-muted-foreground">{card.sub}</p>
                                </div>
                                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                                    <card.Icon size={20} weight="duotone" />
                                </div>
                            </div>
                        </CardContent>
                        <div className={`h-0.5 w-full ${card.bar}`} />
                    </Card>
                ))}
            </div>

            {/* Registrations Table */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-0">

                    {/* Filter bar */}
                    <div className="px-6 py-4 border-b border-border/50 space-y-3">
                        {/* Status row */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-panel-sm font-semibold shrink-0">Status:</span>
                            {filterButtons.map(btn => (
                                <Button
                                    key={btn.key}
                                    size="sm"
                                    variant={filter === btn.key ? 'default' : 'outline'}
                                    className="rounded-full h-8 gap-1.5 font-semibold"
                                    onClick={() => setFilter(btn.key)}
                                >
                                    {btn.label}
                                    <Badge
                                        variant="secondary"
                                        className={cn('rounded-full h-5 px-1.5 text-[10px] font-bold', filter === btn.key ? 'bg-white/20 text-white' : '')}
                                    >
                                        {btn.count}
                                    </Badge>
                                </Button>
                            ))}
                            <span className="ml-auto text-panel-sm text-muted-foreground">
                                {filtered.length} inscrição{filtered.length !== 1 ? 'ões' : ''} exibida{filtered.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Date row */}
                        <div className="flex flex-wrap items-end gap-3">
                            <span className="text-panel-sm font-semibold shrink-0 self-center">Período:</span>
                            <div className="relative">
                                <CalendarIcon size={20} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="pl-9 h-8 text-panel-sm w-[148px]" />
                            </div>
                            <span className="text-panel-sm text-muted-foreground self-center">até</span>
                            <div className="relative">
                                <CalendarIcon size={20} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className="pl-9 h-8 text-panel-sm w-[148px]" />
                            </div>
                            {hasDateFilter && (
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground hover:text-foreground px-2" onClick={clearDates}>
                                    <XIcon size={20} weight="bold" /> Limpar
                                </Button>
                            )}
                            <div className="flex items-center gap-1.5 ml-1">
                                {DATE_PRESETS.map(p => {
                                    const active = dateFrom === p.from && dateTo === p.to;
                                    return (
                                        <button
                                            key={p.label}
                                            onClick={() => applyPreset(p)}
                                            className={cn(
                                                'text-panel-sm font-semibold px-2.5 py-1 rounded-full border transition-colors',
                                                active
                                                    ? 'bg-foreground text-background border-foreground'
                                                    : 'bg-background border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Selection action bar */}
                    {selectedCount > 0 && (
                        <div className="px-6 py-3 bg-primary/5 border-b border-primary/20 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <DownloadSimpleIcon size={20} weight="duotone" className="text-primary" />
                                <span className="text-panel-sm font-semibold text-primary">
                                    {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" className="h-8 gap-1.5 font-semibold rounded-xl">
                                            <DownloadSimpleIcon size={20} weight="bold" />
                                            Exportar
                                            <CaretDownIcon size={20} weight="bold" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-44">
                                        <DropdownMenuItem
                                            className="gap-2 font-semibold cursor-pointer"
                                            onClick={() => exportCSV(selectedRows, event.title)}
                                        >
                                            <FileCsvIcon size={20} weight="duotone" className="text-emerald-600" />
                                            Baixar CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 font-semibold cursor-pointer"
                                            onClick={() => exportXML(selectedRows, event.title)}
                                        >
                                            <FileCodeIcon size={20} weight="duotone" className="text-sky-600" />
                                            Baixar XML
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 font-semibold cursor-pointer"
                                            onClick={() => exportPDF(selectedRows, event.title, event.organizer_name)}
                                        >
                                            <FilePdfIcon size={20} weight="duotone" className="text-rose-600" />
                                            Gerar PDF
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-1 text-muted-foreground hover:text-foreground px-3"
                                    onClick={clearSelection}
                                >
                                    <XIcon size={20} weight="bold" />
                                    Desmarcar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="pl-5 w-10">
                                        <Checkbox
                                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                            onCheckedChange={toggleAll}
                                            aria-label="Selecionar todos"
                                        />
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">Data / Hora</TableHead>
                                    <TableHead>Atleta</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead>Equipe</TableHead>
                                    <TableHead className="max-w-[280px]">Categoria</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor Bruto</TableHead>
                                    <TableHead className="text-right">Comissão</TableHead>
                                    <TableHead className="text-right">Repasse</TableHead>
                                    <TableHead className="pr-6">Método / Asaas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(reg => {
                                    const isSelected = selectedIds.has(reg.id);
                                    return (
                                        <TableRow
                                            key={reg.id}
                                            className={cn('border-border/50 hover:bg-muted/20 transition-colors', isSelected && 'bg-primary/5 hover:bg-primary/10')}
                                        >
                                            <TableCell className="pl-5">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleOne(reg.id)}
                                                    aria-label={`Selecionar ${reg.athlete_name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(reg.created_at)}
                                            </TableCell>
                                            <TableCell className="font-medium text-panel-sm whitespace-nowrap">
                                                {reg.athlete_name}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap font-mono">
                                                {reg.athlete_cpf}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground">
                                                {reg.athlete_email}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap">
                                                {reg.athlete_gym}
                                            </TableCell>
                                            <TableCell className="max-w-[280px]">
                                                <span className="text-panel-sm text-muted-foreground line-clamp-2">{reg.category}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <StatusBadge status={reg.status} />
                                                    {reg.exemption_reason && (
                                                        <TooltipProvider delayDuration={0}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button><TagIcon size={20} weight="duotone" className="text-blue-500 shrink-0" /></button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-[220px] text-center">
                                                                    <p className="font-semibold">Motivo da Isenção</p>
                                                                    <p className="text-xs mt-0.5">{reg.exemption_reason}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {reg.is_no_split && (
                                                        <TooltipProvider delayDuration={0}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button><InfoIcon size={20} weight="duotone" className="text-violet-500 shrink-0" /></button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p className="text-xs">Cobrança Integral (sem repasse ao organizador)</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn('text-right font-semibold whitespace-nowrap', ['pago', 'confirmado'].includes(reg.status) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                                                {reg.price > 0 ? formatBRL(reg.price) : <span className="text-blue-500 font-bold">ISENTO</span>}
                                            </TableCell>
                                            <TableCell className="text-right text-violet-600 dark:text-violet-400 font-medium whitespace-nowrap">
                                                {reg.fee_unit > 0 ? formatBRL(reg.fee_unit) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium whitespace-nowrap">
                                                {reg.price > 0 ? formatBRL(reg.organizer_value) : '—'}
                                            </TableCell>
                                            <TableCell className="pr-6">
                                                {reg.asaas_payment_id ? (
                                                    <div className="flex items-center gap-0.5">
                                                        <span className="text-panel-sm font-mono text-muted-foreground truncate max-w-[100px]">{reg.asaas_payment_id}</span>
                                                        <CopyButton value={reg.asaas_payment_id} />
                                                    </div>
                                                ) : reg.payment_method ? (
                                                    <span className="text-panel-sm text-muted-foreground uppercase font-semibold">{reg.payment_method}</span>
                                                ) : (
                                                    <span className="text-panel-sm text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                            Nenhuma inscrição encontrada para este filtro.
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

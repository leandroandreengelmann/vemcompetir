'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, XIcon, FunnelIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Props {
    from: string;
    to: string;
    status: string;
}

type Preset = { label: string; from: string; to: string };

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function offsetDate(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function monthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEnd() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function nextMonthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function nextMonthEnd() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 2, 0).toISOString().slice(0, 10);
}

function yearStart() {
    return `${new Date().getFullYear()}-01-01`;
}

function yearEnd() {
    return `${new Date().getFullYear()}-12-31`;
}

const PRESETS: Preset[] = [
    { label: 'Este mês',     from: monthStart(),     to: monthEnd() },
    { label: 'Próx. mês',   from: nextMonthStart(), to: nextMonthEnd() },
    { label: 'Próx. 90d',   from: todayStr(),        to: offsetDate(90) },
    { label: 'Este ano',    from: yearStart(),       to: yearEnd() },
];

const STATUS_OPTIONS = [
    { value: 'todos',     label: 'Todos' },
    { value: 'publicado', label: 'Publicado' },
    { value: 'aprovado',  label: 'Aprovado' },
];

export function FinanceiroFilters({ from: initFrom, to: initTo, status: initStatus }: Props) {
    const router = useRouter();
    const [from, setFrom] = useState(initFrom);
    const [to, setTo]     = useState(initTo);
    const [status, setStatus] = useState(initStatus || 'todos');

    const hasFilters = !!from || !!to || (status && status !== 'todos');

    function apply(overrideFrom?: string, overrideTo?: string, overrideStatus?: string) {
        const f = overrideFrom !== undefined ? overrideFrom : from;
        const t = overrideTo   !== undefined ? overrideTo   : to;
        const s = overrideStatus !== undefined ? overrideStatus : status;

        const params = new URLSearchParams();
        if (f) params.set('from', f);
        if (t) params.set('to', t);
        if (s && s !== 'todos') params.set('status', s);

        router.push(`/admin/dashboard/financeiro?${params.toString()}`);
    }

    function applyPreset(preset: Preset) {
        setFrom(preset.from);
        setTo(preset.to);
        apply(preset.from, preset.to, status);
    }

    function clear() {
        setFrom('');
        setTo('');
        setStatus('todos');
        router.push('/admin/dashboard/financeiro');
    }

    return (
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FunnelIcon size={20} weight="duotone" className="text-muted-foreground" />
                <span className="text-panel-sm font-semibold">Filtros</span>
                {hasFilters && (
                    <Badge variant="outline" className="ml-1 text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                        Ativo
                    </Badge>
                )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
                {/* Date From */}
                <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-panel-sm font-medium text-muted-foreground">Data início (evento)</label>
                    <div className="relative">
                        <CalendarIcon size={20} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            className="pl-10 h-9 text-panel-sm"
                        />
                    </div>
                </div>

                {/* Date To */}
                <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-panel-sm font-medium text-muted-foreground">Data fim (evento)</label>
                    <div className="relative">
                        <CalendarIcon size={20} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="date"
                            value={to}
                            min={from || undefined}
                            onChange={e => setTo(e.target.value)}
                            className="pl-10 h-9 text-panel-sm"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-panel-sm font-medium text-muted-foreground">Status do evento</label>
                    <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map(opt => (
                            <Button
                                key={opt.value}
                                size="sm"
                                variant={status === opt.value ? 'default' : 'outline'}
                                className="h-9 rounded-xl font-semibold"
                                onClick={() => setStatus(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-auto items-end">
                    {hasFilters && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={clear}
                        >
                            <XIcon size={20} weight="bold" />
                            Limpar
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="h-9 px-5 font-semibold rounded-xl"
                        onClick={() => apply()}
                    >
                        Aplicar
                    </Button>
                </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-panel-sm text-muted-foreground">Atalhos:</span>
                {PRESETS.map(p => {
                    const active = from === p.from && to === p.to;
                    return (
                        <button
                            key={p.label}
                            onClick={() => applyPreset(p)}
                            className={cn(
                                'text-panel-sm font-semibold px-3 py-1 rounded-full border transition-colors',
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
    );
}

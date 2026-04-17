'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    CalendarBlankIcon,
    CheckIcon,
    CaretDownIcon,
    ArrowRightIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PeriodPreset } from './period';

const PRESETS: { value: PeriodPreset; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'ontem', label: 'Ontem' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: 'mes_atual', label: 'Este mês' },
    { value: 'mes_anterior', label: 'Mês anterior' },
    { value: 'ano_atual', label: 'Este ano' },
    { value: 'todos', label: 'Todos os períodos' },
];

function formatBr(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

export function PeriodFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const currentPreset = (searchParams.get('preset') ?? 'mes_atual') as PeriodPreset;
    const currentFrom = searchParams.get('from') ?? '';
    const currentTo = searchParams.get('to') ?? '';

    const [customFrom, setCustomFrom] = useState(currentFrom);
    const [customTo, setCustomTo] = useState(currentTo);

    useEffect(() => {
        setCustomFrom(currentFrom);
        setCustomTo(currentTo);
    }, [currentFrom, currentTo]);

    const label = useMemo(() => {
        if (currentPreset === 'custom') {
            if (currentFrom && currentTo) return `${formatBr(currentFrom)} — ${formatBr(currentTo)}`;
            if (currentFrom) return `desde ${formatBr(currentFrom)}`;
            if (currentTo) return `até ${formatBr(currentTo)}`;
            return 'Personalizado';
        }
        return PRESETS.find(p => p.value === currentPreset)?.label ?? 'Este mês';
    }, [currentPreset, currentFrom, currentTo]);

    const applyPreset = (preset: PeriodPreset) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('preset', preset);
        params.delete('from');
        params.delete('to');
        params.delete('page');
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
            setOpen(false);
        });
    };

    const applyCustom = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('preset', 'custom');
        if (customFrom) params.set('from', customFrom); else params.delete('from');
        if (customTo) params.set('to', customTo); else params.delete('to');
        params.delete('page');
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
            setOpen(false);
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    pill
                    className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                    disabled={isPending}
                >
                    <CalendarBlankIcon size={16} weight="duotone" />
                    {label}
                    <CaretDownIcon size={12} weight="bold" className="opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
                <div className="flex flex-col divide-y divide-border/50">
                    <div className="p-2">
                        {PRESETS.map((p) => {
                            const active = currentPreset === p.value;
                            return (
                                <button
                                    key={p.value}
                                    type="button"
                                    className={cn(
                                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-panel-sm text-left transition-colors',
                                        active ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/60',
                                    )}
                                    onClick={() => applyPreset(p.value)}
                                >
                                    <span>{p.label}</span>
                                    {active && <CheckIcon size={14} weight="bold" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-3 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <span className="text-panel-sm font-semibold text-muted-foreground">Personalizado</span>
                            {currentPreset === 'custom' && (
                                <CheckIcon size={14} weight="bold" className="text-primary" />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-panel-sm text-muted-foreground">De</label>
                                <Input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="h-10 bg-background"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-panel-sm text-muted-foreground">Até</label>
                                <Input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="h-10 bg-background"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={applyCustom}
                            pill
                            className="w-full h-12 gap-2 text-panel-sm font-semibold shadow-sm text-white hover:text-white"
                            disabled={!customFrom && !customTo || isPending}
                        >
                            <CalendarBlankIcon size={16} weight="duotone" />
                            Aplicar período
                            <ArrowRightIcon size={14} weight="bold" className="ml-auto opacity-80" />
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

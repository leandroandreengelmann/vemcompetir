'use client';

import { useMemo } from 'react';
import {
    CheckCircleIcon,
    GiftIcon,
    ClockIcon,
    ShoppingCartIcon,
    InfoIcon,
    SealCheckIcon,
    SigmaIcon,
    type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { CategoryReportBucket, CategoryReportRegistration } from '../../../../actions/event-reports';

export type ViewMode = 'confirmadas' | 'com_aguardando' | 'tudo';

type Counts = { inscricoes: number; atletas: number; categorias: number };

function countOf(regs: CategoryReportRegistration[]): Counts {
    return {
        inscricoes: regs.length,
        atletas: new Set(regs.map(r => r.athlete_id)).size,
        categorias: new Set(regs.map(r => r.category)).size,
    };
}

function only(regs: CategoryReportRegistration[], ...buckets: CategoryReportBucket[]) {
    return regs.filter(r => buckets.includes(r.bucket));
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_64px_56px_72px] sm:grid-cols-[minmax(0,1fr)_96px_80px_96px] gap-2 items-center px-4';

type Tone = 'emerald' | 'amber' | 'slate';

const TONE: Record<Tone, string> = {
    emerald: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-500 dark:text-emerald-400',
    amber: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 dark:text-amber-400',
    slate: 'bg-slate-500/10 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400',
};

function Row({
    icon: Icon,
    tone,
    label,
    hint,
    counts,
    variant = 'default',
}: {
    icon: PhosphorIcon;
    tone: Tone;
    label: string;
    hint: string;
    counts: Counts;
    variant?: 'default' | 'confirmed' | 'total';
}) {
    return (
        <div
            className={cn(
                GRID,
                'py-3',
                variant === 'confirmed' && 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                variant === 'total' && 'bg-muted/40 border-t border-border',
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn('p-2 rounded-xl shrink-0', TONE[tone])}>
                    <Icon size={24} weight="duotone" />
                </div>
                <div className="min-w-0">
                    <div className={cn('text-panel-sm', variant !== 'default' ? 'font-bold' : 'font-semibold')}>
                        {label}
                    </div>
                    <p
                        className={cn(
                            'text-xs mt-0.5',
                            variant === 'confirmed' ? 'text-emerald-700/90 dark:text-emerald-300/80' : 'text-muted-foreground',
                        )}
                    >
                        {hint}
                    </p>
                </div>
            </div>
            {[counts.inscricoes, counts.atletas, counts.categorias].map((n, i) => (
                <span
                    key={i}
                    className={cn(
                        'text-right tabular-nums',
                        variant === 'default' ? 'text-panel-sm font-medium' : 'text-panel-md font-bold',
                    )}
                >
                    {n}
                </span>
            ))}
        </div>
    );
}

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
    { value: 'confirmadas', label: 'Só confirmadas' },
    { value: 'com_aguardando', label: '+ aguardando pagamento' },
    { value: 'tudo', label: 'Tudo (inclui carrinho)' },
];

export function CategoriasResumo({
    registrations,
    filtered,
    viewMode,
    onViewModeChange,
}: {
    registrations: CategoryReportRegistration[];
    filtered: boolean;
    viewMode: ViewMode;
    onViewModeChange: (v: ViewMode) => void;
}) {
    const s = useMemo(() => {
        const paid = only(registrations, 'paid');
        return {
            paid: countOf(paid),
            promoFree: paid.filter(r => r.promo_free).length,
            exempt: countOf(only(registrations, 'exempt')),
            confirmed: countOf(only(registrations, 'paid', 'exempt')),
            pending: countOf(only(registrations, 'pending')),
            cart: countOf(only(registrations, 'cart')),
            total: countOf(registrations),
        };
    }, [registrations]);

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-background">
                <div className={cn(GRID, 'py-2.5 border-b border-border/50 text-xs font-semibold text-muted-foreground')}>
                    <span>
                        Situação
                        {filtered && <span className="font-normal"> · considerando os filtros aplicados</span>}
                    </span>
                    <span className="text-right">Inscrições</span>
                    <span className="text-right">Atletas</span>
                    <span className="text-right">Categorias</span>
                </div>

                <Row
                    icon={CheckCircleIcon}
                    tone="emerald"
                    label="Pagas"
                    hint={
                        s.promoFree > 0
                            ? `Pagamento confirmado · inclui ${s.promoFree} de 2ª categoria grátis`
                            : 'Pagamento confirmado'
                    }
                    counts={s.paid}
                />
                <div className="border-t border-border/50">
                    <Row
                        icon={GiftIcon}
                        tone="emerald"
                        label="Cortesias / isentas"
                        hint="Sem cobrança: cortesia, pacote de inscrições ou evento próprio"
                        counts={s.exempt}
                    />
                </div>
                <Row
                    icon={SealCheckIcon}
                    tone="emerald"
                    label="= Confirmadas"
                    hint="Pagas + cortesias · vão para a chave"
                    counts={s.confirmed}
                    variant="confirmed"
                />

                <Row
                    icon={ClockIcon}
                    tone="amber"
                    label="Aguardando pagamento"
                    hint="Pix gerado, ainda não pago · não vão para a chave"
                    counts={s.pending}
                />
                <div className="border-t border-border/50">
                    <Row
                        icon={ShoppingCartIcon}
                        tone="slate"
                        label="No carrinho"
                        hint="Escolheram a categoria, mas não finalizaram · não vão para a chave"
                        counts={s.cart}
                    />
                </div>
                <Row
                    icon={SigmaIcon}
                    tone="slate"
                    label="= Total geral"
                    hint="Tudo junto, inclusive o que ainda não foi confirmado"
                    counts={s.total}
                    variant="total"
                />
            </div>

            <p className="flex items-start gap-2 text-panel-sm text-muted-foreground">
                <InfoIcon size={18} weight="duotone" className="shrink-0" />
                Atletas e categorias não somam linha a linha: o mesmo atleta pode ter uma inscrição paga e outra no carrinho, e a mesma categoria pode ter inscrições em situações diferentes.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-panel-sm text-muted-foreground font-medium">Mostrar na tabela:</span>
                {VIEW_OPTIONS.map(o => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onViewModeChange(o.value)}
                        aria-pressed={viewMode === o.value}
                        className={cn(
                            'h-9 px-3.5 rounded-full text-panel-sm font-medium border transition-colors',
                            viewMode === o.value
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background border-border hover:bg-muted',
                        )}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

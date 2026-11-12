'use client';

import { useMemo } from 'react';
import {
    CheckCircleIcon,
    GiftIcon,
    ClockIcon,
    ShoppingCartIcon,
    InfoIcon,
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

function Row({
    icon,
    label,
    hint,
    counts,
    variant = 'default',
}: {
    icon?: React.ReactNode;
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
            <div className="min-w-0">
                <div className={cn('flex items-center gap-2 text-panel-sm', variant !== 'default' ? 'font-bold' : 'font-semibold')}>
                    {icon}
                    <span>{label}</span>
                </div>
                <p
                    className={cn(
                        'text-xs mt-0.5',
                        icon && 'pl-6',
                        variant === 'confirmed' ? 'text-emerald-700/90 dark:text-emerald-300/80' : 'text-muted-foreground',
                    )}
                >
                    {hint}
                </p>
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
                    icon={<CheckCircleIcon size={16} weight="duotone" className="text-emerald-600 shrink-0" />}
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
                        icon={<GiftIcon size={16} weight="duotone" className="text-emerald-600 shrink-0" />}
                        label="Cortesias / isentas"
                        hint="Sem cobrança: cortesia, pacote de inscrições ou evento próprio"
                        counts={s.exempt}
                    />
                </div>
                <Row
                    label="= Confirmadas"
                    hint="Pagas + cortesias · vão para a chave"
                    counts={s.confirmed}
                    variant="confirmed"
                />

                <Row
                    icon={<ClockIcon size={16} weight="duotone" className="text-amber-500 shrink-0" />}
                    label="Aguardando pagamento"
                    hint="Pix gerado, ainda não pago · não vão para a chave"
                    counts={s.pending}
                />
                <div className="border-t border-border/50">
                    <Row
                        icon={<ShoppingCartIcon size={16} weight="duotone" className="text-muted-foreground shrink-0" />}
                        label="No carrinho"
                        hint="Escolheram a categoria, mas não finalizaram · não vão para a chave"
                        counts={s.cart}
                    />
                </div>
                <Row
                    label="= Total geral"
                    hint="Tudo junto, inclusive o que ainda não foi confirmado"
                    counts={s.total}
                    variant="total"
                />
            </div>

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <InfoIcon size={14} weight="duotone" className="shrink-0 mt-px" />
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

'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    ADULT_MALE_BELTS,
    ADULT_MALE_WEIGHTS,
    formatWeightRange,
} from '../lib/adulto-masculino';
import { ADULT_FEMALE_BELTS, ADULT_FEMALE_WEIGHTS } from '../lib/adulto-feminino';

type Modalidade = 'gi' | 'nogi';
type Genero = 'masculino' | 'feminino';

export function AdultMalePreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [modalidade, setModalidade] = useState<Modalidade>('gi');
    const [activeBelt, setActiveBelt] = useState<string>('all');

    const BELTS = genero === 'masculino' ? ADULT_MALE_BELTS : ADULT_FEMALE_BELTS;
    const WEIGHTS = genero === 'masculino' ? ADULT_MALE_WEIGHTS : ADULT_FEMALE_WEIGHTS;
    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

    const totalCategorias = BELTS.length * WEIGHTS.length;

    const visibleBelts = useMemo(
        () => (activeBelt === 'all' ? BELTS : BELTS.filter((b) => b.key === activeBelt)),
        [activeBelt, BELTS],
    );

    return (
        <div className="space-y-6">
            {/* Resumo dos eixos */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos desta categoria</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="Adulto" sub="18 a 29 anos" />
                        <AxisChip label="Gênero" value={generoLabel} sub="—" />
                        <AxisChip label={`Faixas (${BELTS.length})`} value="Branca → Preta" sub="Sistema adulto" />
                        <AxisChip label={`Pesos (${WEIGHTS.length})`} value="Galo → Absoluto" sub={`${WEIGHTS.length - 1} + Open`} />
                        <AxisChip label="Modalidade" value="Gi / No-Gi" sub="2 conjuntos" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {BELTS.length} × {WEIGHTS.length} × 2 = {totalCategorias * 2} categorias possíveis
                        </span>{' '}
                        (sendo {totalCategorias} por modalidade).
                    </div>
                </CardContent>
            </Card>

            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    <div className="inline-flex rounded-full border bg-background p-1">
                        {(['masculino', 'feminino'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGenero(g)}
                                className={cn(
                                    'px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize',
                                    genero === g
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex rounded-full border bg-background p-1">
                        <button
                            onClick={() => setModalidade('gi')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                                modalidade === 'gi'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Gi (com kimono)
                        </button>
                        <button
                            onClick={() => setModalidade('nogi')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                                modalidade === 'nogi'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            No-Gi (sem kimono)
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <BeltFilter active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>
                        Todas
                    </BeltFilter>
                    {BELTS.map((b) => (
                        <BeltFilter
                            key={b.key}
                            active={activeBelt === b.key}
                            onClick={() => setActiveBelt(b.key)}
                            dotClass={b.color}
                        >
                            {b.label}
                        </BeltFilter>
                    ))}
                </div>
            </div>

            {/* Grade por faixa */}
            <div className="space-y-4">
                {visibleBelts.map((belt) => (
                    <Card key={belt.key} className="overflow-hidden">
                        <div
                            className={cn(
                                'flex items-center justify-between px-5 py-3 border-b-4',
                                belt.color,
                                belt.text,
                                belt.border,
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold">Faixa {belt.label}</span>
                                <Badge
                                    variant="outline"
                                    className="rounded-full bg-background/95 text-foreground border-0 text-[10px] px-2 py-0"
                                >
                                    {WEIGHTS.length} categorias
                                </Badge>
                            </div>
                            <span className="text-xs opacity-90 hidden md:inline">
                                Adulto · {generoLabel} · {modalidade === 'gi' ? 'Gi' : 'No-Gi'}
                            </span>
                        </div>
                        <CardContent className="p-0">
                            <div className="grid gap-px bg-border md:grid-cols-2">
                                {WEIGHTS.map((w) => {
                                    const range = w[modalidade];
                                    return (
                                        <div
                                            key={w.key}
                                            className={cn(
                                                'flex items-center justify-between px-5 py-3 bg-background hover:bg-muted/40 transition-colors',
                                                w.key === 'absoluto' && 'bg-amber-50/50 dark:bg-amber-950/20',
                                            )}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {w.name}
                                                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                                        ({w.nameEn})
                                                    </span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatWeightRange(range.min, range.max)}
                                                </p>
                                            </div>
                                            {w.key === 'absoluto' && (
                                                <Badge variant="outline" className="rounded-full text-[10px] border-amber-500 text-amber-700">
                                                    Open Class
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground">
                    <p>
                        <strong className="text-foreground">Como esse modelo escala:</strong> trocando só a faixa etária
                        (Master 1, Juvenil, Infantil…) ou o gênero, o gestor regenera essa mesma grade automaticamente,
                        ajustando os pesos e as faixas permitidas para cada combinação. Nenhuma linha é repetida no
                        banco — só os eixos são guardados.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function AxisChip({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-xl border bg-background px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <p className="text-sm font-semibold mt-0.5 leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
    );
}

function BeltFilter({
    active,
    onClick,
    dotClass,
    children,
}: {
    active: boolean;
    onClick: () => void;
    dotClass?: string;
    children: React.ReactNode;
}) {
    return (
        <Button
            type="button"
            variant={active ? 'default' : 'outline'}
            size="sm"
            pill
            onClick={onClick}
            className="h-8"
        >
            {dotClass && (
                <span className={cn('inline-block w-2.5 h-2.5 rounded-full mr-1.5 border', dotClass)} />
            )}
            {children}
        </Button>
    );
}

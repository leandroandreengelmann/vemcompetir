'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import { AAMEP_JUVENIL, AAMEP_JUVENIL_BELTS, getAamepJuvenilWeights } from '../lib/aamep-juvenil';

type Genero = 'masculino' | 'feminino';

export function AamepJuvenilPreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [activeBelt, setActiveBelt] = useState<string>('all');

    const WEIGHTS = getAamepJuvenilWeights(genero);
    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

    const visibleBelts = useMemo(
        () => (activeBelt === 'all' ? AAMEP_JUVENIL_BELTS : AAMEP_JUVENIL_BELTS.filter((b) => b.key === activeBelt)),
        [activeBelt],
    );

    const total = AAMEP_JUVENIL_BELTS.length * WEIGHTS.length;
    const visiveis = visibleBelts.length * WEIGHTS.length;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos · AAMEP Juvenil</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="Juvenil" sub={AAMEP_JUVENIL.ageRange} />
                        <AxisChip label="Gênero" value={generoLabel} sub="Toggle abaixo" />
                        <AxisChip label="Faixas (3)" value="Branca → Roxa" sub="Sem Marrom/Preta" />
                        <AxisChip label={`Pesos (${WEIGHTS.length})`} value="Galo → Pesadíssimo" sub="Apenas categorias por peso" />
                        <AxisChip label="Modalidade" value="Gi (com kimono)" sub={`Tempo: ${AAMEP_JUVENIL.fightTime}`} />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {AAMEP_JUVENIL_BELTS.length} × {WEIGHTS.length} = {total} categorias por gênero
                        </span>
                        . Absolutos ficam em uma tabela separada.
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{visiveis}</span> categorias
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>Todas as faixas</Chip>
                    {AAMEP_JUVENIL_BELTS.map((b) => (
                        <Chip key={b.key} active={activeBelt === b.key} onClick={() => setActiveBelt(b.key)} dot={b.color}>
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <span className="text-base font-semibold">
                            Juvenil <span className="text-muted-foreground font-normal">· {AAMEP_JUVENIL.ageRange}</span>
                        </span>
                        <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                            {visibleBelts.length} {visibleBelts.length === 1 ? 'faixa' : 'faixas'} × {WEIGHTS.length} pesos
                        </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground hidden md:inline">
                        {generoLabel} · Gi · {AAMEP_JUVENIL.fightTime}
                    </span>
                </div>

                <CardContent className="p-0">
                    {visibleBelts.map((belt) => (
                        <div key={belt.key} className="border-b last:border-b-0">
                            <div className={cn('flex items-center gap-2 px-5 py-2 border-b-2', belt.color, belt.text, belt.border)}>
                                <span className="text-sm font-semibold">Faixa {belt.label}</span>
                            </div>
                            <div className="grid gap-px bg-border md:grid-cols-2">
                                {WEIGHTS.map((w) => (
                                    <div
                                        key={w.key}
                                        className="flex items-center justify-between px-5 py-3 bg-background hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{w.name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatWeightRange(w.range.min, w.range.max)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Faixa etária mais ampla:</strong> AAMEP usa Juvenil de 14 a 17 anos
                        (IBJJF usa apenas 16-17). Pesos próprios — não herdam do Adulto.
                    </p>
                    <p>
                        <strong className="text-foreground">Só 3 faixas:</strong> atletas até 17 anos não podem ser graduados acima de
                        Roxa — Marrom só aos 18, Preta aos 19.
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

function Chip({
    active,
    onClick,
    dot,
    children,
}: {
    active: boolean;
    onClick: () => void;
    dot?: string;
    children: React.ReactNode;
}) {
    return (
        <Button type="button" variant={active ? 'default' : 'outline'} size="sm" pill onClick={onClick} className="h-8">
            {dot && <span className={cn('inline-block w-2.5 h-2.5 rounded-full mr-1.5 border', dot)} />}
            {children}
        </Button>
    );
}

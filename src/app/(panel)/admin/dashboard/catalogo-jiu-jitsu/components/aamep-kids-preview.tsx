'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import {
    AAMEP_KIDS_AGES,
    AAMEP_KIDS_BELTS,
    getAamepKidsBelt,
    getAamepKidsWeights,
} from '../lib/aamep-kids';

type Genero = 'masculino' | 'feminino';

export function AamepKidsPreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [activeAge, setActiveAge] = useState<string>('all');
    const [activeBelt, setActiveBelt] = useState<string>('all');

    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

    const visibleAges = useMemo(
        () => (activeAge === 'all' ? AAMEP_KIDS_AGES : AAMEP_KIDS_AGES.filter((a) => a.key === activeAge)),
        [activeAge],
    );

    const totalCategorias = AAMEP_KIDS_AGES.reduce(
        (acc, a) => acc + a.belts.length * getAamepKidsWeights(a, genero).length,
        0,
    );
    const visiveis = visibleAges.reduce((acc, a) => {
        const belts = activeBelt === 'all' ? a.belts : a.belts.filter((b) => b === activeBelt);
        return acc + belts.length * getAamepKidsWeights(a, genero).length;
    }, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos · AAMEP Kids</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="Kids" sub="5 grupos · 6 a 15 anos" />
                        <AxisChip label="Gênero" value={generoLabel} sub="Toggle abaixo" />
                        <AxisChip label="Faixas (até 6)" value="Branca → Azul" sub="Sem variantes ponta-preta" />
                        <AxisChip label="Pesos (9)" value="Galo → Pesadíssimo" sub="Mesma estrutura por idade" />
                        <AxisChip label="Modalidade" value="Gi (com kimono)" sub="Tempo varia por idade" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Total combinado para {generoLabel.toLowerCase()}:{' '}
                        <span className="font-semibold text-foreground">{totalCategorias} categorias</span>. Cada idade tem sua
                        progressão de faixas (Mirim → 2 faixas, Inf. Juvenil B → 6 faixas).
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
                    <Chip active={activeAge === 'all'} onClick={() => setActiveAge('all')}>Todos os grupos</Chip>
                    {AAMEP_KIDS_AGES.map((a) => (
                        <Chip key={a.key} active={activeAge === a.key} onClick={() => setActiveAge(a.key)}>
                            {a.label} <span className="opacity-70 font-normal ml-1">· {a.ageRange}</span>
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>Todas as faixas</Chip>
                    {AAMEP_KIDS_BELTS.map((b) => (
                        <Chip key={b.key} active={activeBelt === b.key} onClick={() => setActiveBelt(b.key)} dot={b.dot}>
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {visibleAges.map((age) => {
                    const weights = getAamepKidsWeights(age, genero);
                    const belts = activeBelt === 'all' ? age.belts : age.belts.filter((b) => b === activeBelt);
                    if (belts.length === 0) return null;
                    return (
                        <Card key={age.key} className="overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold">
                                        {age.label}{' '}
                                        <span className="text-muted-foreground font-normal">
                                            · {age.ageRange} ({age.birthYears})
                                        </span>
                                    </span>
                                    <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                        {belts.length} {belts.length === 1 ? 'faixa' : 'faixas'} × {weights.length} pesos
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground hidden md:inline">
                                    {generoLabel} · Gi · {age.fightTime}
                                </span>
                            </div>

                            <CardContent className="p-0">
                                {belts.map((bk) => {
                                    const belt = getAamepKidsBelt(bk);
                                    return (
                                        <div key={bk} className="border-b last:border-b-0">
                                            <div className="flex items-center gap-2 px-5 py-2 border-b bg-muted/10">
                                                <span className={cn('w-3 h-3 rounded-full border', belt.dot)} />
                                                <span className="text-sm font-semibold">Faixa {belt.label}</span>
                                            </div>
                                            <div className="grid gap-px bg-border md:grid-cols-2">
                                                {weights.map((w) => (
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
                                    );
                                })}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Faixas simples:</strong> AAMEP Kids usa apenas Branca, Cinza, Amarela,
                        Laranja, Verde e Azul. Sem variantes ponta-preta ou ponta-branca.
                    </p>
                    <p>
                        <strong className="text-foreground">Progressão por idade:</strong> Mirim só tem Branca/Cinza; cada grupo
                        seguinte adiciona uma faixa até Inf. Juvenil B (6 faixas).
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

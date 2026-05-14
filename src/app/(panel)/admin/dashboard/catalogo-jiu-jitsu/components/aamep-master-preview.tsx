'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import { AAMEP_MASTER, AAMEP_MASTER_AGES, AAMEP_MASTER_BELTS } from '../lib/aamep-master';

export function AamepMasterPreview() {
    const [activeAge, setActiveAge] = useState<string>('all');
    const [activeBelt, setActiveBelt] = useState<string>('all');

    const visibleAges = useMemo(
        () => (activeAge === 'all' ? AAMEP_MASTER_AGES : AAMEP_MASTER_AGES.filter((a) => a.key === activeAge)),
        [activeAge],
    );
    const visibleBelts = useMemo(
        () => (activeBelt === 'all' ? AAMEP_MASTER_BELTS : AAMEP_MASTER_BELTS.filter((b) => b.key === activeBelt)),
        [activeBelt],
    );

    const total = AAMEP_MASTER_AGES.reduce((acc, a) => acc + AAMEP_MASTER_BELTS.length * a.weights.length, 0);
    const visiveis = visibleAges.reduce((acc, a) => acc + visibleBelts.length * a.weights.length, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos · AAMEP Master</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="Master" sub="2 grupos · 30 a 40+" />
                        <AxisChip label="Gênero" value="Masculino" sub="AAMEP não tem Master F" />
                        <AxisChip label="Faixas (5)" value="Branca → Preta" sub="Inclui Marrom e Preta" />
                        <AxisChip label="Pesos (3)" value="Pluma → Pesado" sub="Estrutura condensada" />
                        <AxisChip label="Modalidade" value="Gi (com kimono)" sub={`Tempo: ${AAMEP_MASTER.fightTime}`} />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {AAMEP_MASTER_AGES.length} grupos × {AAMEP_MASTER_BELTS.length} faixas × 3 pesos = {total} categorias
                        </span>
                        . Absoluto fica em tabela separada.
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{visiveis}</span> categorias
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeAge === 'all'} onClick={() => setActiveAge('all')}>Todos os grupos</Chip>
                    {AAMEP_MASTER_AGES.map((a) => (
                        <Chip key={a.key} active={activeAge === a.key} onClick={() => setActiveAge(a.key)}>
                            {a.label} <span className="opacity-70 font-normal ml-1">· {a.range}</span>
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>Todas as faixas</Chip>
                    {AAMEP_MASTER_BELTS.map((b) => (
                        <Chip key={b.key} active={activeBelt === b.key} onClick={() => setActiveBelt(b.key)} dot={b.color}>
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {visibleAges.map((age) => (
                    <Card key={age.key} className="overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold">
                                    {age.label} <span className="text-muted-foreground font-normal">· {age.range}</span>
                                </span>
                                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                    {visibleBelts.length} {visibleBelts.length === 1 ? 'faixa' : 'faixas'} × {age.weights.length} pesos
                                </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground hidden md:inline">
                                Masculino · Gi · {AAMEP_MASTER.fightTime}
                            </span>
                        </div>

                        <CardContent className="p-0">
                            {visibleBelts.map((belt) => (
                                <div key={belt.key} className="border-b last:border-b-0">
                                    <div className={cn('flex items-center gap-2 px-5 py-2 border-b-2', belt.color, belt.text, belt.border)}>
                                        <span className="text-sm font-semibold">Faixa {belt.label}</span>
                                    </div>
                                    <div className="grid gap-px bg-border md:grid-cols-2">
                                        {age.weights.map((w) => (
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
                ))}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Apenas 2 grupos:</strong> Master 1 (30-40) e Master 2 (40+) — bem mais
                        condensado que IBJJF (que tem 7 grupos M1-M7).
                    </p>
                    <p>
                        <strong className="text-foreground">Apenas 3 categorias de peso:</strong> Pluma, Médio e Pesado (livre).
                        Sem Galo, Pena, Leve, Meio-Pesado, Super Pesado nem Pesadíssimo. Master Feminino não é modelado pela AAMEP.
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

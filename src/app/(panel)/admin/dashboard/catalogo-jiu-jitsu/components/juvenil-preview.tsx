'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import { JUVENIL_AGES, JUVENIL_BELTS, getJuvenilWeights } from '../lib/juvenil';

type Genero = 'masculino' | 'feminino';
type Modalidade = 'gi' | 'nogi';

export function JuvenilPreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [modalidade, setModalidade] = useState<Modalidade>('gi');
    const [activeAge, setActiveAge] = useState<string>('all');
    const [activeBelt, setActiveBelt] = useState<string>('all');

    const WEIGHTS = getJuvenilWeights(genero);
    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';
    const modalidadeLabel = modalidade === 'gi' ? 'Gi (com kimono)' : 'No-Gi (sem kimono)';

    const visibleAges = useMemo(
        () => (activeAge === 'all' ? JUVENIL_AGES : JUVENIL_AGES.filter((a) => a.key === activeAge)),
        [activeAge],
    );

    const visibleBelts = useMemo(
        () => (activeBelt === 'all' ? JUVENIL_BELTS : JUVENIL_BELTS.filter((b) => b.key === activeBelt)),
        [activeBelt],
    );

    const totalCategorias = JUVENIL_AGES.length * JUVENIL_BELTS.length * WEIGHTS.length;
    const totalVisiveis = visibleAges.length * visibleBelts.length * WEIGHTS.length;

    return (
        <div className="space-y-6">
            {/* Resumo dos eixos */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos · Juvenil 16 e 17 anos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="Juvenil" sub="16 e 17 anos · 2 idades" />
                        <AxisChip label="Gênero" value={generoLabel} sub="Toggle abaixo" />
                        <AxisChip label="Faixas (3)" value="Branca → Roxa" sub="Sem Marrom/Preta" />
                        <AxisChip
                            label={`Pesos (${WEIGHTS.length})`}
                            value="Galo → Absoluto"
                            sub={`${WEIGHTS.length - 1} + Open`}
                        />
                        <AxisChip label="Modalidade" value={modalidadeLabel} sub="Toggle Gi / No-Gi" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {JUVENIL_AGES.length} × {JUVENIL_BELTS.length} × {WEIGHTS.length} = {totalCategorias} categorias por gênero
                        </span>
                        .
                    </div>
                </CardContent>
            </Card>

            {/* Filtros */}
            <div className="space-y-3">
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
                                Gi
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
                                No-Gi
                            </button>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{totalVisiveis}</span> categorias
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeAge === 'all'} onClick={() => setActiveAge('all')}>Todas as idades</Chip>
                    {JUVENIL_AGES.map((a) => (
                        <Chip key={a.key} active={activeAge === a.key} onClick={() => setActiveAge(a.key)}>
                            {a.label} <span className="opacity-70 font-normal ml-1">· {a.age} anos</span>
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>Todas as faixas</Chip>
                    {JUVENIL_BELTS.map((b) => (
                        <Chip key={b.key} active={activeBelt === b.key} onClick={() => setActiveBelt(b.key)} dot={b.color}>
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            {/* Grade */}
            <div className="space-y-4">
                {visibleAges.map((age) => (
                    <Card key={age.key} className="overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold">
                                    {age.label}{' '}
                                    <span className="text-muted-foreground font-normal">· {age.age} anos</span>
                                </span>
                                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                    {visibleBelts.length} {visibleBelts.length === 1 ? 'faixa' : 'faixas'} × {WEIGHTS.length} pesos
                                </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground hidden md:inline">
                                {generoLabel} · {modalidade === 'gi' ? 'Gi' : 'No-Gi'}
                            </span>
                        </div>

                        <CardContent className="p-0">
                            {visibleBelts.map((belt) => (
                                <div key={belt.key} className="border-b last:border-b-0">
                                    <div
                                        className={cn(
                                            'flex items-center gap-2 px-5 py-2 border-b-2',
                                            belt.color,
                                            belt.text,
                                            belt.border,
                                        )}
                                    >
                                        <span className="text-sm font-semibold">Faixa {belt.label}</span>
                                    </div>
                                    <div className="grid gap-px bg-border md:grid-cols-2">
                                        {WEIGHTS.map((w) => (
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
                                                        {formatWeightRange(w[modalidade].min, w[modalidade].max)}
                                                    </p>
                                                </div>
                                                {w.key === 'absoluto' && (
                                                    <Badge
                                                        variant="outline"
                                                        className="rounded-full text-[10px] border-amber-500 text-amber-700"
                                                    >
                                                        Open Class
                                                    </Badge>
                                                )}
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
                        <strong className="text-foreground">Por que só 3 faixas:</strong> no IBJJF, atletas até 17 anos
                        não podem ser graduados acima de Roxa — a Marrom só vem aos 18, e a Preta aos 19. O Juvenil
                        herda a tabela de pesos do Adulto, mas com o teto de faixa limitado.
                    </p>
                    <p>
                        <strong className="text-foreground">Pesos masculinos:</strong> 9 categorias (Galo até
                        Pesadíssimo) + Absoluto. <strong className="text-foreground">Femininos:</strong> 8 (Galo até
                        Super Pesado) + Absoluto.
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
        <Button
            type="button"
            variant={active ? 'default' : 'outline'}
            size="sm"
            pill
            onClick={onClick}
            className="h-8"
        >
            {dot && <span className={cn('inline-block w-2.5 h-2.5 rounded-full mr-1.5 border', dot)} />}
            {children}
        </Button>
    );
}

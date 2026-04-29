'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import {
    KIDS_AGES,
    KIDS_BELTS,
    KIDS_GROUPS,
    getBelt,
    type KidsAgeGroup,
    type KidsBeltKey,
} from '../lib/infantil';
import {
    KIDS_NOGI_AGES,
    KIDS_NOGI_BELTS,
    getNogiBelt,
    getNogiWeights,
    type KidsNogiAgeGroupKey,
    type KidsNogiBeltKey,
} from '../lib/infantil-nogi';

type Genero = 'masculino' | 'feminino';
type Modalidade = 'gi' | 'nogi';

export function KidsPreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [modalidade, setModalidade] = useState<Modalidade>('gi');

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
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

            {modalidade === 'gi' ? (
                <KidsPreviewGi genero={genero} />
            ) : (
                <KidsPreviewNoGi genero={genero} />
            )}
        </div>
    );
}

function KidsPreviewGi({ genero }: { genero: Genero }) {
    const [activeGroup, setActiveGroup] = useState<KidsAgeGroup | 'all'>('all');
    const [activeBelt, setActiveBelt] = useState<KidsBeltKey | 'all'>('all');

    const visibleAges = useMemo(
        () => (activeGroup === 'all' ? KIDS_AGES : KIDS_AGES.filter((a) => a.group === activeGroup)),
        [activeGroup],
    );

    const totalCategorias = useMemo(
        () => KIDS_AGES.reduce((acc, a) => acc + a.belts.length * a.weights.length, 0),
        [],
    );

    const totalVisiveis = useMemo(() => {
        return visibleAges.reduce((acc, a) => {
            const belts = activeBelt === 'all' ? a.belts : a.belts.filter((b) => b === activeBelt);
            return acc + belts.length * a.weights.length;
        }, 0);
    }, [visibleAges, activeBelt]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Os 5 eixos · Infantil Gi · 4 a 15 anos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="4 a 15 anos" sub="12 idades · 4 grupos" />
                        <AxisChip label="Gênero" value={genero === 'masculino' ? 'Masculino' : 'Feminino'} sub="Toggle acima" />
                        <AxisChip label="Faixas (até 13)" value="Branca → Verde-Preta" sub="Progressivas por idade" />
                        <AxisChip label="Pesos (9)" value="Por idade" sub="Tabela própria" />
                        <AxisChip label="Modalidade" value="Gi (com kimono)" sub="Toggle acima" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {totalCategorias * 2} categorias possíveis
                        </span>{' '}
                        ({totalCategorias} por gênero, somando todas as 12 idades).
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex justify-end">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{totalVisiveis}</span> categorias
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>Todos os grupos</Chip>
                    {KIDS_GROUPS.map((g) => (
                        <Chip
                            key={g.key}
                            active={activeGroup === g.key}
                            onClick={() => setActiveGroup(g.key)}
                        >
                            {g.label} <span className="text-muted-foreground/70 font-normal ml-1">· {g.sub}</span>
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>
                        Todas as faixas
                    </Chip>
                    {KIDS_BELTS.map((b) => (
                        <Chip
                            key={b.key}
                            active={activeBelt === b.key}
                            onClick={() => setActiveBelt(b.key)}
                            dot={b.dot}
                        >
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {visibleAges.map((age) => {
                    const belts = activeBelt === 'all' ? age.belts : age.belts.filter((b) => b === activeBelt);
                    if (!belts.length) return null;
                    return (
                        <Card key={age.key} className="overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold">
                                        {age.label}{' '}
                                        <span className="text-muted-foreground font-normal">· {age.age} anos</span>
                                    </span>
                                    <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                        {belts.length} {belts.length === 1 ? 'faixa' : 'faixas'} × {age.weights.length} pesos
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground hidden md:inline capitalize">
                                    {genero} · Gi
                                </span>
                            </div>

                            <CardContent className="p-0">
                                {belts.map((beltKey) => {
                                    const belt = getBelt(beltKey);
                                    return (
                                        <div key={beltKey} className="border-b last:border-b-0">
                                            <div className="flex items-center gap-2 px-5 py-2 bg-muted/10">
                                                <span className={cn('inline-block w-3 h-3 rounded-full border', belt.dot)} />
                                                <span className="text-sm font-semibold">{belt.label}</span>
                                            </div>
                                            <div className="grid gap-px bg-border md:grid-cols-3">
                                                {age.weights.map((w, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            'flex items-center justify-between px-5 py-2.5 bg-background hover:bg-muted/40 transition-colors',
                                                            idx === age.weights.length - 1 && 'bg-amber-50/40 dark:bg-amber-950/20',
                                                        )}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                Peso {idx + 1}
                                                            </p>
                                                            <p className="text-sm font-medium truncate">
                                                                {formatWeightRange(w.min, w.max)}
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
                {visibleAges.length === 0 && (
                    <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
                        Nenhuma idade corresponde ao filtro.
                    </div>
                )}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Como o sistema de faixas progride:</strong> de 4 a 6 anos só
                        existem as 4 faixas iniciais (Branca → Cinza-Preta). Aos 7 entram as três Amarelas, aos 10 entram
                        as Laranjas e aos 13 entram as Verdes — totalizando até 13 faixas no Infantojuvenil.
                    </p>
                    <p>
                        <strong className="text-foreground">Tabela de pesos:</strong> cada idade tem 9 faixas de peso
                        próprias, sem nomes oficiais (Galo, Pluma… só existem do Juvenil em diante). Aqui ficam
                        identificadas como <em>Peso 1 → Peso 9</em>.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function KidsPreviewNoGi({ genero }: { genero: Genero }) {
    const [activeAge, setActiveAge] = useState<KidsNogiAgeGroupKey | 'all'>('all');
    const [activeBelt, setActiveBelt] = useState<KidsNogiBeltKey | 'all'>('all');

    const visibleAges = useMemo(
        () => (activeAge === 'all' ? KIDS_NOGI_AGES : KIDS_NOGI_AGES.filter((a) => a.key === activeAge)),
        [activeAge],
    );

    const totalCategorias = useMemo(
        () => KIDS_NOGI_AGES.reduce((acc, a) => acc + a.belts.length * a.weights[genero].length, 0),
        [genero],
    );

    const totalVisiveis = useMemo(() => {
        return visibleAges.reduce((acc, a) => {
            const belts = activeBelt === 'all' ? a.belts : a.belts.filter((b) => b === activeBelt);
            return acc + belts.length * a.weights[genero].length;
        }, 0);
    }, [visibleAges, activeBelt, genero]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">
                        Os 5 eixos · Infantil No-Gi · 4 a 15 anos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        <AxisChip label="Faixa Etária" value="4 a 15 anos" sub="6 grupos pareados" />
                        <AxisChip label="Gênero" value={genero === 'masculino' ? 'Masculino' : 'Feminino'} sub="Toggle acima" />
                        <AxisChip label="Faixas (até 6)" value="Branca → Azul" sub="Progride com a idade" />
                        <AxisChip label="Pesos (12)" value="Galo → Extra Pes. 3" sub="Mesmas categorias por idade" />
                        <AxisChip label="Modalidade" value="No-Gi (sem kimono)" sub="Toggle acima" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Combinando os eixos:{' '}
                        <span className="font-semibold text-foreground">
                            {totalCategorias} categorias por gênero
                        </span>{' '}
                        ({totalCategorias * 2} no total).
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex justify-end">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{totalVisiveis}</span> categorias
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeAge === 'all'} onClick={() => setActiveAge('all')}>Todos os grupos</Chip>
                    {KIDS_NOGI_AGES.map((a) => (
                        <Chip
                            key={a.key}
                            active={activeAge === a.key}
                            onClick={() => setActiveAge(a.key)}
                        >
                            {a.label} <span className="text-muted-foreground/70 font-normal ml-1">· {a.ageRange} anos</span>
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>
                        Todas as faixas
                    </Chip>
                    {KIDS_NOGI_BELTS.map((b) => (
                        <Chip
                            key={b.key}
                            active={activeBelt === b.key}
                            onClick={() => setActiveBelt(b.key)}
                            dot={b.dot}
                        >
                            {b.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {visibleAges.map((age) => {
                    const belts = activeBelt === 'all' ? age.belts : age.belts.filter((b) => b === activeBelt);
                    if (!belts.length) return null;
                    const weights = getNogiWeights(age, genero);
                    return (
                        <Card key={age.key} className="overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-semibold">
                                        {age.label}{' '}
                                        <span className="text-muted-foreground font-normal">· {age.ageRange} anos</span>
                                    </span>
                                    <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                        {belts.length} {belts.length === 1 ? 'faixa' : 'faixas'} × {weights.length} pesos
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground hidden md:inline capitalize">
                                    {genero} · No-Gi
                                </span>
                            </div>

                            <CardContent className="p-0">
                                {belts.map((beltKey) => {
                                    const belt = getNogiBelt(beltKey);
                                    return (
                                        <div key={beltKey} className="border-b last:border-b-0">
                                            <div className="flex items-center gap-2 px-5 py-2 bg-muted/10">
                                                <span className={cn('inline-block w-3 h-3 rounded-full border', belt.dot)} />
                                                <span className="text-sm font-semibold">{belt.label}</span>
                                            </div>
                                            <div className="grid gap-px bg-border md:grid-cols-2">
                                                {weights.map((w, idx) => (
                                                    <div
                                                        key={w.key}
                                                        className={cn(
                                                            'flex items-center justify-between px-5 py-2.5 bg-background hover:bg-muted/40 transition-colors',
                                                            idx >= weights.length - 3 && 'bg-amber-50/40 dark:bg-amber-950/20',
                                                        )}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {w.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {formatWeightRange(w.min, w.max)}
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
                {visibleAges.length === 0 && (
                    <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
                        Nenhum grupo corresponde ao filtro.
                    </div>
                )}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Por que a estrutura é diferente do Gi:</strong> no No-Gi
                        infantil, a IBJJF agrupa as idades em pares (Pré-mirim 4–5, Mirim/Little 6–7, Infantil A 8–9,
                        Infantil B 10–11, Infanto Juvenil A 12–13 e Infanto Juvenil B 14–15) e usa apenas 6 faixas
                        progressivas (Branca → Azul) — sem as variantes Branca-Preta do Gi.
                    </p>
                    <p>
                        <strong className="text-foreground">Pesos:</strong> 12 categorias com nomes (Galo até Extra
                        Pesadíssimo 3), iguais para todos os grupos etários — mas com ranges em kg que crescem com
                        a idade.
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

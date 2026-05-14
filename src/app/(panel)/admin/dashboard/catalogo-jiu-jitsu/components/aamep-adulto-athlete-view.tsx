'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBagIcon, CheckIcon, MagnifyingGlassIcon, UserCircleIcon } from '@phosphor-icons/react';
import { getBeltStyle } from '@/lib/belt-theme';
import { cn } from '@/lib/utils';
import { formatWeightRange } from '../lib/adulto-masculino';
import { AAMEP_ADULTO, AAMEP_ADULTO_BELTS, getAamepAdultoWeights } from '../lib/aamep-adulto';

type Genero = 'masculino' | 'feminino';

function fakeFee(beltKey: string): number {
    const base = beltKey === 'preta' ? 220 : beltKey === 'marrom' ? 200 : beltKey === 'roxa' ? 190 : beltKey === 'azul' ? 180 : 170;
    return base;
}

export function AamepAdultoAthleteView() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [activeBelt, setActiveBelt] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<Set<string>>(new Set());

    const WEIGHTS = getAamepAdultoWeights(genero);
    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

    const allCategories = useMemo(() => {
        const list: Array<{
            id: string;
            beltKey: string;
            beltLabel: string;
            weightKey: string;
            weightName: string;
            range: string;
            categoryName: string;
            fee: number;
        }> = [];
        for (const belt of AAMEP_ADULTO_BELTS) {
            for (const w of WEIGHTS) {
                const range = formatWeightRange(w.range.min, w.range.max);
                list.push({
                    id: `aamep-adulto-${belt.key}-${w.key}`,
                    beltKey: belt.key,
                    beltLabel: belt.label,
                    weightKey: w.key,
                    weightName: w.name,
                    range,
                    categoryName: `Adulto • ${generoLabel} • ${belt.label} • ${w.name} (${range}) • Kimono`,
                    fee: fakeFee(belt.key),
                });
            }
        }
        return list;
    }, [WEIGHTS, generoLabel]);

    const filtered = useMemo(() => {
        let list = allCategories;
        if (activeBelt !== 'all') list = list.filter((c) => c.beltKey === activeBelt);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((c) => c.categoryName.toLowerCase().includes(q));
        }
        return list;
    }, [allCategories, activeBelt, search]);

    function toggleCart(id: string) {
        setCart((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="space-y-5">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-4 flex flex-wrap items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <UserCircleIcon size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Inscrição em evento</p>
                        <h3 className="font-bold leading-tight">AAMEP Adulto Demo 2026</h3>
                        <p className="text-xs text-muted-foreground">Federação AAMEP · {AAMEP_ADULTO.ageRange} · {AAMEP_ADULTO.fightTime} de luta</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">Visão do atleta · AAMEP</Badge>
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border bg-background p-1">
                    {(['masculino', 'feminino'] as const).map((g) => (
                        <button
                            key={g}
                            onClick={() => setGenero(g)}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize',
                                genero === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {g}
                        </button>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground">
                    Adulto · {generoLabel} · Gi · {filtered.length} visíveis
                </div>
            </div>

            <div className="relative">
                <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar pela categoria... (ex: pena, leve, azul)"
                    className="w-full h-12 rounded-2xl border bg-background pl-10 pr-4 text-sm shadow-xs focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                <Chip active={activeBelt === 'all'} onClick={() => setActiveBelt('all')}>Todas as faixas</Chip>
                {AAMEP_ADULTO_BELTS.map((b) => (
                    <Chip key={b.key} active={activeBelt === b.key} onClick={() => setActiveBelt(b.key)} dot={b.color}>
                        {b.label}
                    </Chip>
                ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((c) => {
                    const inCart = cart.has(c.id);
                    return (
                        <div
                            key={c.id}
                            className={cn(
                                'group flex flex-col p-4 rounded-3xl border shadow-sm transition-all overflow-hidden',
                                inCart
                                    ? 'border-green-500 bg-green-50/40 dark:bg-green-500/10'
                                    : 'border-border bg-card hover:shadow-md hover:border-primary/30',
                            )}
                        >
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                    {c.categoryName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-3">
                                    <Badge
                                        variant="outline"
                                        style={getBeltStyle(c.beltKey)}
                                        className="text-xs px-3 py-1 uppercase tracking-wider shadow-sm rounded-full border-border/50"
                                    >
                                        {c.beltLabel}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">{c.weightName}</Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">{c.range}</Badge>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-auto pt-1 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">Inscrição</span>
                                        <span className="text-base font-bold text-primary tabular-nums">R$ {c.fee},00</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleCart(c.id)}
                                        className={cn(
                                            'flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all w-full sm:w-auto',
                                            inCart
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                                : 'bg-primary text-primary-foreground hover:opacity-90',
                                        )}
                                    >
                                        {inCart ? (
                                            <><CheckIcon size={14} weight="duotone" /> Na sacola</>
                                        ) : (
                                            <><ShoppingBagIcon size={14} weight="duotone" /> Inscrever</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="md:col-span-2 text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
                        Nenhuma categoria corresponde aos filtros.
                    </div>
                )}
            </div>

            {cart.size > 0 && (
                <div className="sticky bottom-4 z-10">
                    <Card className="bg-primary text-primary-foreground border-0 shadow-2xl">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingBagIcon size={20} weight="duotone" />
                                <div>
                                    <p className="text-xs opacity-80">Sua sacola</p>
                                    <p className="text-sm font-bold">
                                        {cart.size} {cart.size === 1 ? 'categoria' : 'categorias'} selecionadas
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setCart(new Set())} className="text-xs underline opacity-80 hover:opacity-100">
                                Limpar
                            </button>
                        </CardContent>
                    </Card>
                </div>
            )}
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
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-colors',
                active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted',
            )}
        >
            {dot && <span className={cn('w-2.5 h-2.5 rounded-full border', dot)} />}
            {children}
        </button>
    );
}

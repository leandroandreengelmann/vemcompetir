'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBagIcon, CheckIcon, MagnifyingGlassIcon, MedalIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { AAMEP_ABSOLUTOS } from '../lib/aamep-absolutos';

type GeneroFilter = 'all' | 'masculino' | 'feminino';

const GENERO_LABEL: Record<Exclude<GeneroFilter, 'all'>, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
};

function fakeFee(faixaEtaria: string): number {
    if (faixaEtaria.startsWith('Master')) return 250;
    if (faixaEtaria.startsWith('Adulto')) return 230;
    return 200;
}

export function AamepAbsolutosAthleteView() {
    const [genero, setGenero] = useState<GeneroFilter>('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<Set<string>>(new Set());

    const allCategories = useMemo(() => {
        const list: Array<{
            id: string;
            faixaEtaria: string;
            genero: 'masculino' | 'feminino';
            generoLabel: string;
            entryKey: string;
            entryLabel: string;
            max: number | null;
            fightTime: string;
            categoryName: string;
            fee: number;
        }> = [];
        for (const group of AAMEP_ABSOLUTOS) {
            for (const e of group.entries) {
                list.push({
                    id: `aamep-absoluto-${group.key}-${e.key}`,
                    faixaEtaria: group.faixaEtaria,
                    genero: group.genero,
                    generoLabel: GENERO_LABEL[group.genero],
                    entryKey: e.key,
                    entryLabel: e.label,
                    max: e.max,
                    fightTime: e.fightTime,
                    categoryName: `${group.faixaEtaria} • ${GENERO_LABEL[group.genero]} • ${e.label} • Kimono`,
                    fee: fakeFee(group.faixaEtaria),
                });
            }
        }
        return list;
    }, []);

    const filtered = useMemo(() => {
        let list = allCategories;
        if (genero !== 'all') list = list.filter((c) => c.genero === genero);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((c) => c.categoryName.toLowerCase().includes(q));
        }
        return list;
    }, [allCategories, genero, search]);

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
                        <MedalIcon size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Inscrição em evento</p>
                        <h3 className="font-bold leading-tight">AAMEP Absolutos Demo 2026</h3>
                        <p className="text-xs text-muted-foreground">Federação AAMEP · Tabela própria · Faixas definidas pelo organizador</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">Visão do atleta · AAMEP</Badge>
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border bg-background p-1">
                    {(['all', 'masculino', 'feminino'] as const).map((g) => (
                        <button
                            key={g}
                            onClick={() => setGenero(g)}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize',
                                genero === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {g === 'all' ? 'Todos' : g}
                        </button>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground">
                    Absolutos · Gi · {filtered.length} visíveis
                </div>
            </div>

            <div className="relative">
                <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar pelo absoluto... (ex: adulto, juvenil 65, master)"
                    className="w-full h-12 rounded-2xl border bg-background pl-10 pr-4 text-sm shadow-xs focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
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
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">{c.faixaEtaria}</Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">{c.generoLabel}</Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                                        {c.max === null ? 'Sem limite' : `Até ${c.max} kg`}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">{c.fightTime}</Badge>
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
                        Nenhum absoluto corresponde aos filtros.
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
                                        {cart.size} {cart.size === 1 ? 'absoluto' : 'absolutos'} selecionados
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

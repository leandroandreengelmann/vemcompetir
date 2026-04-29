'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    ShoppingBagIcon,
    CheckIcon,
    InfoIcon,
    UsersIcon,
    MagnifyingGlassIcon,
    BarbellIcon,
} from '@phosphor-icons/react';
import { getBeltStyle } from '@/lib/belt-theme';
import { cn } from '@/lib/utils';
import { ADULT_MALE_BELTS, ADULT_MALE_WEIGHTS, formatWeightRange } from '../lib/adulto-masculino';
import { ADULT_FEMALE_BELTS, ADULT_FEMALE_WEIGHTS } from '../lib/adulto-feminino';

type Modalidade = 'gi' | 'nogi';
type Genero = 'masculino' | 'feminino';

const FAKE_ATHLETES = [
    'João Silva', 'Lucas Pereira', 'Pedro Santos', 'Ricardo Almeida',
    'Felipe Souza', 'Gabriel Lima', 'Rafael Costa', 'Bruno Oliveira',
    'Marcos Ribeiro', 'André Fernandes', 'Thiago Mendes', 'Vinicius Rocha',
];

function fakeRegisteredCount(beltKey: string, weightKey: string): number {
    const seed = (beltKey.length * 7 + weightKey.length * 11) % 17;
    return seed;
}

function fakeFee(beltKey: string, weightKey: string): number {
    const base = beltKey === 'preta' ? 220 : beltKey === 'marrom' ? 200 : 180;
    return weightKey === 'absoluto' ? base + 50 : base;
}

function buildCategoryName(beltLabel: string, weight: typeof ADULT_MALE_WEIGHTS[number], modalidade: Modalidade, generoLabel: string) {
    const range = weight[modalidade];
    const peso = formatWeightRange(range.min, range.max);
    const uniforme = modalidade === 'gi' ? 'Kimono' : 'Sem Kimono';
    return `Adulto • 18 anos a 29 anos • ${generoLabel} • ${beltLabel} • ${weight.name} (${peso}) • ${uniforme}`;
}

export function AthleteViewPreview() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [modalidade, setModalidade] = useState<Modalidade>('gi');
    const [search, setSearch] = useState('');
    const [activeBelt, setActiveBelt] = useState<string>('azul');
    const [cart, setCart] = useState<Set<string>>(new Set());

    const BELTS = genero === 'masculino' ? ADULT_MALE_BELTS : ADULT_FEMALE_BELTS;
    const WEIGHTS = genero === 'masculino' ? ADULT_MALE_WEIGHTS : ADULT_FEMALE_WEIGHTS;
    const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

    const allCategories = useMemo(() => {
        const list: Array<{
            id: string;
            beltKey: string;
            beltLabel: string;
            weightKey: string;
            weightName: string;
            categoryName: string;
            range: string;
            registered: number;
            fee: number;
            isOpen: boolean;
        }> = [];
        for (const belt of BELTS) {
            for (const w of WEIGHTS) {
                const r = w[modalidade];
                list.push({
                    id: `${belt.key}-${w.key}`,
                    beltKey: belt.key,
                    beltLabel: belt.label,
                    weightKey: w.key,
                    weightName: w.name,
                    categoryName: buildCategoryName(belt.label, w, modalidade, generoLabel),
                    range: formatWeightRange(r.min, r.max),
                    registered: fakeRegisteredCount(belt.key, w.key),
                    fee: fakeFee(belt.key, w.key),
                    isOpen: w.key === 'absoluto',
                });
            }
        }
        return list;
    }, [modalidade, BELTS, WEIGHTS, generoLabel]);

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
            {/* Mock do header de evento */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-4 flex flex-wrap items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <BarbellIcon size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Inscrição em evento</p>
                        <h3 className="font-bold leading-tight">Open Demo Jiu-Jitsu 2026</h3>
                        <p className="text-xs text-muted-foreground">15 de junho · São Paulo · IBJJF</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">Visão do atleta</Badge>
                </CardContent>
            </Card>

            {/* Toggle gênero + modalidade */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
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
                    <div className="inline-flex rounded-full border bg-background p-1">
                        {(['gi', 'nogi'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setModalidade(m)}
                                className={cn(
                                    'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                                    modalidade === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {m === 'gi' ? 'Com Kimono' : 'Sem Kimono'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    Adulto · {generoLabel} · {filtered.length} categorias visíveis
                </div>
            </div>

            {/* Busca + chips de faixa */}
            <div className="space-y-3">
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
                    <FaixaChip
                        active={activeBelt === 'all'}
                        onClick={() => setActiveBelt('all')}
                        label="Todas"
                    />
                    {BELTS.map((b) => (
                        <FaixaChip
                            key={b.key}
                            active={activeBelt === b.key}
                            onClick={() => setActiveBelt(b.key)}
                            label={b.label}
                            beltColor={BELT_THEME[b.key]}
                        />
                    ))}
                </div>
            </div>

            {/* Lista de categorias estilo atleta */}
            <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((c) => {
                    const inCart = cart.has(c.id);
                    return (
                        <div
                            key={c.id}
                            className={cn(
                                'group flex flex-col p-4 rounded-3xl border shadow-sm transition-all cursor-pointer overflow-hidden',
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
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                                        {c.weightName}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                                        {c.range}
                                    </Badge>
                                    {c.isOpen && (
                                        <Badge className="rounded-full text-[10px] bg-amber-500 hover:bg-amber-500 text-white">
                                            Open Class
                                        </Badge>
                                    )}
                                </div>

                                {c.beltKey === 'branca' && (
                                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                                        <InfoIcon size={14} weight="duotone" className="mt-0.5 shrink-0 text-amber-500" />
                                        <p className="text-xs leading-relaxed">
                                            Atletas faixa-branca: leve documento de comprovação de graduação.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-auto pt-1 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">Inscrição</span>
                                        <span className="text-base font-bold text-primary tabular-nums">
                                            R$ {c.fee},00
                                        </span>
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
                                            <>
                                                <CheckIcon size={14} weight="duotone" /> Na sacola
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingBagIcon size={14} weight="duotone" /> Inscrever
                                            </>
                                        )}
                                    </button>
                                </div>

                                {c.registered > 0 && (
                                    <div className="mt-1 pt-2 border-t border-dashed border-border/60">
                                        <div className="w-full flex items-center justify-between p-2.5 rounded-xl border border-primary/10 bg-primary/5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    {FAKE_ATHLETES.slice(0, Math.min(3, c.registered)).map((name, i) => (
                                                        <div
                                                            key={i}
                                                            title={name}
                                                            className="inline-flex h-6 w-6 rounded-full ring-2 ring-background bg-primary/20 text-primary items-center justify-center text-[10px] font-bold"
                                                        >
                                                            {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                                        </div>
                                                    ))}
                                                    {c.registered > 3 && (
                                                        <div className="inline-flex h-6 w-6 rounded-full ring-2 ring-background bg-muted text-muted-foreground items-center justify-center text-[10px] font-bold">
                                                            +{c.registered - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-foreground/80">
                                                    {c.registered} {c.registered === 1 ? 'inscrição' : 'inscrições'}
                                                </span>
                                            </div>
                                            <UsersIcon size={14} weight="duotone" className="text-primary" />
                                        </div>
                                    </div>
                                )}
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

            {/* Sacola fake */}
            {cart.size > 0 && (
                <div className="sticky bottom-4 z-10">
                    <Card className="bg-primary text-primary-foreground border-0 shadow-2xl">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingBagIcon size={20} weight="duotone" />
                                <div>
                                    <p className="text-xs opacity-80">Sua sacola</p>
                                    <p className="text-sm font-bold">{cart.size} {cart.size === 1 ? 'categoria' : 'categorias'} selecionadas</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCart(new Set())}
                                className="text-xs underline opacity-80 hover:opacity-100"
                            >
                                Limpar
                            </button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

const BELT_THEME: Record<string, string> = {
    branca: 'bg-zinc-100 border-zinc-300',
    azul: 'bg-blue-500',
    roxa: 'bg-purple-600',
    marrom: 'bg-amber-800',
    preta: 'bg-zinc-900',
};

function FaixaChip({
    active,
    onClick,
    label,
    beltColor,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    beltColor?: string;
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
            {beltColor && <span className={cn('w-2.5 h-2.5 rounded-full border', beltColor)} />}
            {label}
        </button>
    );
}

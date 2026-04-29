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
    BabyIcon,
} from '@phosphor-icons/react';
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

const FAKE_KIDS = [
    'Lucas M.', 'Sofia A.', 'Pedro S.', 'Helena R.', 'Miguel O.',
    'Alice F.', 'Theo C.', 'Manuela L.', 'Davi P.', 'Laura B.',
];

function fakeRegistered(seed1: string, seed2: string, weightIdx: number): number {
    return (seed1.length * 5 + seed2.length * 7 + weightIdx * 3) % 12;
}

function fakeFeeGi(group: KidsAgeGroup, weightIdx: number): number {
    const base = group === 'pre-mirim' ? 120 : group === 'mirim' ? 140 : group === 'infantil' ? 150 : 160;
    return weightIdx === 8 ? base + 20 : base;
}

function fakeFeeNoGi(group: KidsNogiAgeGroupKey, weightIdx: number): number {
    const base =
        group === 'pre-mirim' ? 120 :
        group === 'mirim-little' ? 140 :
        group === 'infantil-a' || group === 'infantil-b' ? 150 :
        160;
    return weightIdx >= 9 ? base + 20 : base;
}

type CategoryItem = {
    id: string;
    ageLabel: string;
    ageDisplay: string;
    ageKey: string;
    groupKey: string;
    beltKey: string;
    beltLabel: string;
    beltDot: string;
    weightIdx: number;
    weightName: string | null;
    range: string;
    categoryName: string;
    registered: number;
    fee: number;
    isHeaviest: boolean;
    needsResponsavel: boolean;
};

export function KidsAthleteView() {
    const [genero, setGenero] = useState<Genero>('masculino');
    const [modalidade, setModalidade] = useState<Modalidade>('gi');
    const [activeGroupGi, setActiveGroupGi] = useState<KidsAgeGroup | 'all'>('infantil');
    const [activeBeltGi, setActiveBeltGi] = useState<KidsBeltKey | 'all'>('all');
    const [activeGroupNoGi, setActiveGroupNoGi] = useState<KidsNogiAgeGroupKey | 'all'>('infantil-b');
    const [activeBeltNoGi, setActiveBeltNoGi] = useState<KidsNogiBeltKey | 'all'>('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<Set<string>>(new Set());

    const allCategories = useMemo<CategoryItem[]>(() => {
        const list: CategoryItem[] = [];
        const generoLabel = genero === 'masculino' ? 'Masculino' : 'Feminino';

        if (modalidade === 'gi') {
            for (const age of KIDS_AGES) {
                for (const beltKey of age.belts) {
                    const belt = getBelt(beltKey);
                    age.weights.forEach((w, idx) => {
                        const range = formatWeightRange(w.min, w.max);
                        list.push({
                            id: `gi-${age.key}-${beltKey}-${idx}`,
                            ageLabel: age.label,
                            ageDisplay: `${age.age} anos`,
                            ageKey: age.key,
                            groupKey: age.group,
                            beltKey,
                            beltLabel: belt.label,
                            beltDot: belt.dot,
                            weightIdx: idx,
                            weightName: null,
                            range,
                            categoryName: `${age.label} • ${age.age} anos • ${generoLabel} • ${belt.label} • Peso ${idx + 1} (${range}) • Kimono`,
                            registered: fakeRegistered(age.key, beltKey, idx),
                            fee: fakeFeeGi(age.group, idx),
                            isHeaviest: idx === age.weights.length - 1,
                            needsResponsavel: age.group === 'pre-mirim' || age.group === 'mirim',
                        });
                    });
                }
            }
        } else {
            for (const age of KIDS_NOGI_AGES) {
                const weights = getNogiWeights(age, genero);
                for (const beltKey of age.belts) {
                    const belt = getNogiBelt(beltKey);
                    weights.forEach((w, idx) => {
                        const range = formatWeightRange(w.min, w.max);
                        list.push({
                            id: `nogi-${age.key}-${beltKey}-${w.key}`,
                            ageLabel: age.label,
                            ageDisplay: `${age.ageRange} anos`,
                            ageKey: age.key,
                            groupKey: age.key,
                            beltKey,
                            beltLabel: belt.label,
                            beltDot: belt.dot,
                            weightIdx: idx,
                            weightName: w.name,
                            range,
                            categoryName: `${age.label} (${age.ageRange}) • ${generoLabel} • ${belt.label} • ${w.name} (${range}) • Sem kimono`,
                            registered: fakeRegistered(age.key, beltKey, idx),
                            fee: fakeFeeNoGi(age.key, idx),
                            isHeaviest: idx === weights.length - 1,
                            needsResponsavel: age.key === 'pre-mirim' || age.key === 'mirim-little',
                        });
                    });
                }
            }
        }
        return list;
    }, [genero, modalidade]);

    const filtered = useMemo(() => {
        let list = allCategories;
        if (modalidade === 'gi') {
            if (activeGroupGi !== 'all') list = list.filter((c) => c.groupKey === activeGroupGi);
            if (activeBeltGi !== 'all') list = list.filter((c) => c.beltKey === activeBeltGi);
        } else {
            if (activeGroupNoGi !== 'all') list = list.filter((c) => c.groupKey === activeGroupNoGi);
            if (activeBeltNoGi !== 'all') list = list.filter((c) => c.beltKey === activeBeltNoGi);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((c) => c.categoryName.toLowerCase().includes(q));
        }
        return list.slice(0, 60);
    }, [allCategories, modalidade, activeGroupGi, activeBeltGi, activeGroupNoGi, activeBeltNoGi, search]);

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
                        <BabyIcon size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Inscrição em evento</p>
                        <h3 className="font-bold leading-tight">Kids Demo Jiu-Jitsu 2026</h3>
                        <p className="text-xs text-muted-foreground">22 de junho · São Paulo · Categorias 4 a 15 anos</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                        Visão do atleta · Infantil {modalidade === 'gi' ? 'Gi' : 'No-Gi'}
                    </Badge>
                </CardContent>
            </Card>

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
                        <button
                            onClick={() => setModalidade('gi')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                                modalidade === 'gi' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Gi
                        </button>
                        <button
                            onClick={() => setModalidade('nogi')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                                modalidade === 'nogi' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            No-Gi
                        </button>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {filtered.length} categorias visíveis (limitado a 60)
                </div>
            </div>

            <div className="relative">
                <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar pela categoria... (ex: mirim, amarela, leve)"
                    className="w-full h-12 rounded-2xl border bg-background pl-10 pr-4 text-sm shadow-xs focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
            </div>

            {modalidade === 'gi' ? (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Chip active={activeGroupGi === 'all'} onClick={() => setActiveGroupGi('all')}>Todos os grupos</Chip>
                        {KIDS_GROUPS.map((g) => (
                            <Chip key={g.key} active={activeGroupGi === g.key} onClick={() => setActiveGroupGi(g.key)}>
                                {g.label} <span className="opacity-70 font-normal ml-1">· {g.sub}</span>
                            </Chip>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Chip active={activeBeltGi === 'all'} onClick={() => setActiveBeltGi('all')}>Todas as faixas</Chip>
                        {KIDS_BELTS.map((b) => (
                            <Chip key={b.key} active={activeBeltGi === b.key} onClick={() => setActiveBeltGi(b.key)} dot={b.dot}>
                                {b.label}
                            </Chip>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Chip active={activeGroupNoGi === 'all'} onClick={() => setActiveGroupNoGi('all')}>Todos os grupos</Chip>
                        {KIDS_NOGI_AGES.map((a) => (
                            <Chip key={a.key} active={activeGroupNoGi === a.key} onClick={() => setActiveGroupNoGi(a.key)}>
                                {a.label} <span className="opacity-70 font-normal ml-1">· {a.ageRange} anos</span>
                            </Chip>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Chip active={activeBeltNoGi === 'all'} onClick={() => setActiveBeltNoGi('all')}>Todas as faixas</Chip>
                        {KIDS_NOGI_BELTS.map((b) => (
                            <Chip key={b.key} active={activeBeltNoGi === b.key} onClick={() => setActiveBeltNoGi(b.key)} dot={b.dot}>
                                {b.label}
                            </Chip>
                        ))}
                    </div>
                </>
            )}

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
                                        className="text-xs px-3 py-1 rounded-full inline-flex items-center gap-1.5"
                                    >
                                        <span className={cn('inline-block w-2.5 h-2.5 rounded-full border', c.beltDot)} />
                                        {c.beltLabel}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                                        {c.weightName ?? `Peso ${c.weightIdx + 1}`}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                                        {c.range}
                                    </Badge>
                                    {c.isHeaviest && (
                                        <Badge className="rounded-full text-[10px] bg-amber-500 hover:bg-amber-500 text-white">
                                            Mais pesado
                                        </Badge>
                                    )}
                                </div>

                                {c.needsResponsavel && (
                                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-blue-800">
                                        <InfoIcon size={14} weight="duotone" className="mt-0.5 shrink-0 text-blue-500" />
                                        <p className="text-xs leading-relaxed">
                                            Categoria infantil: presença obrigatória do responsável legal no dia.
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
                                                    {FAKE_KIDS.slice(0, Math.min(3, c.registered)).map((name, i) => (
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

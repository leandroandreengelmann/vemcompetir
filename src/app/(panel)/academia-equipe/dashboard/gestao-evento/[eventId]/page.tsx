'use client';

import { use, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import {
    ArrowLeftIcon,
    KeyIcon,
    MagnifyingGlassIcon,
    UsersIcon,
    PulseIcon,
    TrophyIcon,
    XCircleIcon,
    LinkSimpleIcon,
    LinkBreakIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import {
    listCategoriasComContagem,
    criarCategoriaJuntada,
    desfazerCategoriaJuntada,
} from '../../actions/gestao-evento';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    parseCategoria,
    faixaSortKey,
    getFaixaColor,
    getSuperDivisao,
    getModalidadeKey,
    MODALIDADE_LABELS,
    SUPER_DIVISAO_LABELS,
    SUPER_DIVISAO_ORDER,
    type SuperDivisao,
    type ModalidadeKey,
} from '@/lib/gestao-evento/parse-categoria';

const POLL_MS = 30_000;

type Categoria = {
    name: string;
    count: number;
    peso_min_kg: number | null;
    peso_max_kg: number | null;
    isMerged?: boolean;
    mergedId?: string;
    mergedItems?: string[];
    chaveGerada?: boolean;
    chaveStatus?: string | null;
};
type Bucket = 'all' | 'wo' | 'final' | 'rr' | 'elim';

function suggestMergedName(names: string[]): string {
    if (names.length === 0) return '';
    const parsedList = names.map((n) => parseCategoria(n));
    const slots: (keyof ReturnType<typeof parseCategoria>)[] = ['grupo', 'idade', 'genero', 'faixa', 'peso', 'modalidade'];
    const parts: string[] = [];
    for (const slot of slots) {
        const uniques = Array.from(new Set(parsedList.map((p) => p[slot]).filter(Boolean)));
        if (uniques.length === 0) continue;
        parts.push(uniques.join('/'));
    }
    return parts.join(' • ');
}

function detectMergeWarnings(names: string[]): string[] {
    if (names.length < 2) return [];
    const parsed = names.map((n) => parseCategoria(n));
    const warnings: string[] = [];
    const generos = new Set(parsed.map((p) => p.genero).filter(Boolean));
    if (generos.size > 1) warnings.push('Gêneros diferentes na seleção.');
    const modalidades = new Set(parsed.map((p) => p.modalidade).filter(Boolean));
    if (modalidades.size > 1) warnings.push('Modalidades diferentes (Kimono + No-Gi).');
    const faixas = new Set(parsed.map((p) => p.faixa).filter(Boolean));
    if (faixas.size > 1) warnings.push(`Faixas diferentes: ${Array.from(faixas).join(', ')}.`);
    const grupos = new Set(parsed.map((p) => p.grupo).filter(Boolean));
    if (grupos.size > 1) warnings.push(`Divisões diferentes: ${Array.from(grupos).join(', ')}.`);
    return warnings;
}

function formatKg(value: number): string {
    return Number.isInteger(value) ? `${value}kg` : `${value.toString().replace('.', ',')}kg`;
}

function formatPesoRange(min: number | null, max: number | null): string | null {
    if (min == null && max == null) return null;
    if (min != null && max != null) return `${formatKg(min)} – ${formatKg(max)}`;
    if (max != null) return `Até ${formatKg(max)}`;
    if (min != null) return `Acima de ${formatKg(min)}`;
    return null;
}

function formatBracketHint(count: number): { label: string; tone: 'wo' | 'final' | 'rr' | 'elim' | 'wait' } {
    if (count === 0) return { label: 'Sem inscritos', tone: 'wait' };
    if (count === 1) return { label: 'W.O.', tone: 'wo' };
    if (count === 2) return { label: 'Final direta', tone: 'final' };
    if (count === 3) return { label: 'Round-Robin', tone: 'rr' };
    return { label: `Eliminatória`, tone: 'elim' };
}

type CategoriaParaSugerir = {
    name: string;
    count: number;
    peso_min_kg: number | null;
    peso_max_kg: number | null;
    isMerged?: boolean;
    chaveGerada?: boolean;
    parsed: ReturnType<typeof parseCategoria>;
    superDivisao: SuperDivisao;
    modalidadeKey: ModalidadeKey;
};

function findMergeCandidates(
    target: CategoriaParaSugerir,
    all: CategoriaParaSugerir[],
): CategoriaParaSugerir[] {
    if (target.count < 1 || target.count > 3) return [];
    if (target.isMerged) return [];
    if (target.chaveGerada) return [];
    const candidates = all.filter((c) => {
        if (c.name === target.name) return false;
        if (c.isMerged) return false;
        if (c.chaveGerada) return false;
        if (c.count < 1) return false;
        if (c.parsed.genero !== target.parsed.genero) return false;
        if (c.modalidadeKey !== target.modalidadeKey) return false;
        if (c.parsed.faixa !== target.parsed.faixa) return false;
        if (c.superDivisao !== target.superDivisao) return false;
        return true;
    });
    return candidates
        .map((c) => {
            const aMid =
                target.peso_min_kg != null && target.peso_max_kg != null
                    ? (target.peso_min_kg + target.peso_max_kg) / 2
                    : target.peso_min_kg ?? target.peso_max_kg;
            const bMid =
                c.peso_min_kg != null && c.peso_max_kg != null
                    ? (c.peso_min_kg + c.peso_max_kg) / 2
                    : c.peso_min_kg ?? c.peso_max_kg;
            const dist = aMid != null && bMid != null ? Math.abs(aMid - bMid) : 999;
            return { c, dist };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
        .map((x) => x.c);
}

function matchesBucket(count: number, bucket: Bucket): boolean {
    if (bucket === 'all') return true;
    if (bucket === 'wo') return count === 1;
    if (bucket === 'final') return count === 2;
    if (bucket === 'rr') return count === 3;
    if (bucket === 'elim') return count >= 4;
    return true;
}

export default function GestaoEventoCategoriasPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const [eventName, setEventName] = useState<string>('');
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [bucket, setBucket] = useState<Bucket>('all');
    const [activeFaixas, setActiveFaixas] = useState<Set<string>>(new Set());
    const [activeDivisoes, setActiveDivisoes] = useState<Set<SuperDivisao>>(new Set());
    const [activeModalidades, setActiveModalidades] = useState<Set<ModalidadeKey>>(new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeName, setMergeName] = useState('');
    const [merging, setMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const [confirmDesfazer, setConfirmDesfazer] = useState<{ id: string; name: string } | null>(null);
    const [desfazendo, setDesfazendo] = useState(false);
    const [desfazerError, setDesfazerError] = useState<string | null>(null);
    const [chipSelecoes, setChipSelecoes] = useState<Map<string, Set<string>>>(new Map());

    async function load() {
        try {
            const res = await listCategoriasComContagem(eventId);
            setEventName((res.event as any)?.name || '');
            setCategorias((res.data as Categoria[]) || []);
            setUpdatedAt(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const id = setInterval(load, POLL_MS);
        return () => clearInterval(id);
    }, [eventId]);

    const categoriasParsed = useMemo(
        () =>
            categorias.map((c) => {
                const parsed = parseCategoria(c.name);
                return {
                    ...c,
                    parsed,
                    superDivisao: getSuperDivisao(parsed.grupo),
                    modalidadeKey: getModalidadeKey(parsed.modalidade),
                };
            }),
        [categorias],
    );

    const faixasDisponiveis = useMemo(() => {
        const set = new Set<string>();
        for (const c of categoriasParsed) if (c.parsed.faixa) set.add(c.parsed.faixa);
        return Array.from(set).sort((a, b) => {
            const ka = faixaSortKey(a);
            const kb = faixaSortKey(b);
            if (ka !== kb) return ka - kb;
            return a.localeCompare(b);
        });
    }, [categoriasParsed]);

    const divisoesDisponiveis = useMemo(() => {
        const set = new Set<SuperDivisao>();
        for (const c of categoriasParsed) set.add(c.superDivisao);
        return SUPER_DIVISAO_ORDER.filter((d) => set.has(d));
    }, [categoriasParsed]);

    const modalidadesDisponiveis = useMemo(() => {
        const set = new Set<ModalidadeKey>();
        for (const c of categoriasParsed) set.add(c.modalidadeKey);
        return (['kimono', 'nogi'] as ModalidadeKey[]).filter((m) => set.has(m));
    }, [categoriasParsed]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return categoriasParsed.filter((c) => {
            if (q && !c.name.toLowerCase().includes(q)) return false;
            if (!matchesBucket(c.count, bucket)) return false;
            if (activeFaixas.size > 0 && !activeFaixas.has(c.parsed.faixa)) return false;
            if (activeDivisoes.size > 0 && !activeDivisoes.has(c.superDivisao)) return false;
            if (activeModalidades.size > 0 && !activeModalidades.has(c.modalidadeKey)) return false;
            return true;
        });
    }, [categoriasParsed, search, bucket, activeFaixas, activeDivisoes, activeModalidades]);

    const totals = useMemo(() => {
        const totalAtletas = categorias.reduce((s, c) => s + c.count, 0);
        const wo = categorias.filter((c) => c.count === 1).length;
        const finals = categorias.filter((c) => c.count === 2).length;
        const rr = categorias.filter((c) => c.count === 3).length;
        const elims = categorias.filter((c) => c.count >= 4).length;
        return { totalAtletas, wo, finals, rr, elims, totalCat: categorias.length };
    }, [categorias]);

    const hasActiveFilter =
        bucket !== 'all' ||
        activeFaixas.size > 0 ||
        activeDivisoes.size > 0 ||
        activeModalidades.size > 0 ||
        search.trim().length > 0;

    function toggleFaixa(faixa: string) {
        setActiveFaixas((prev) => {
            const next = new Set(prev);
            if (next.has(faixa)) next.delete(faixa);
            else next.add(faixa);
            return next;
        });
    }

    function toggleDivisao(divisao: SuperDivisao) {
        setActiveDivisoes((prev) => {
            const next = new Set(prev);
            if (next.has(divisao)) next.delete(divisao);
            else next.add(divisao);
            return next;
        });
    }

    function toggleModalidade(mod: ModalidadeKey) {
        setActiveModalidades((prev) => {
            const next = new Set(prev);
            if (next.has(mod)) next.delete(mod);
            else next.add(mod);
            return next;
        });
    }

    function clearFilters() {
        setBucket('all');
        setActiveFaixas(new Set());
        setActiveDivisoes(new Set());
        setActiveModalidades(new Set());
        setSearch('');
    }

    function toggleSelected(name: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }

    function exitSelectMode() {
        setSelectMode(false);
        setSelected(new Set());
    }

    const selectedCategorias = useMemo(
        () => categoriasParsed.filter((c) => selected.has(c.name)),
        [categoriasParsed, selected],
    );

    const selectedTotalAtletas = useMemo(
        () => selectedCategorias.reduce((s, c) => s + c.count, 0),
        [selectedCategorias],
    );

    const mergeWarnings = useMemo(
        () => detectMergeWarnings(Array.from(selected)),
        [selected],
    );

    const sugestoesPorCategoria = useMemo(() => {
        const map = new Map<string, CategoriaParaSugerir[]>();
        for (const c of categoriasParsed) {
            const sugs = findMergeCandidates(c, categoriasParsed);
            if (sugs.length > 0) map.set(c.name, sugs);
        }
        return map;
    }, [categoriasParsed]);

    function openSuggestedMerge(catA: string, catB: string) {
        const names = [catA, catB];
        setSelectMode(true);
        setSelected(new Set(names));
        setMergeName(suggestMergedName(names));
        setMergeError(null);
        setShowMergeModal(true);
    }

    function toggleChipSelecao(catName: string, sugName: string) {
        setChipSelecoes((prev) => {
            const next = new Map(prev);
            const current = new Set(next.get(catName) || []);
            if (current.has(sugName)) current.delete(sugName);
            else current.add(sugName);
            if (current.size === 0) next.delete(catName);
            else next.set(catName, current);
            return next;
        });
    }

    function openMultiSuggestedMerge(catName: string) {
        const sugs = chipSelecoes.get(catName);
        if (!sugs || sugs.size === 0) return;
        const names = [catName, ...Array.from(sugs)];
        setSelectMode(true);
        setSelected(new Set(names));
        setMergeName(suggestMergedName(names));
        setMergeError(null);
        setShowMergeModal(true);
    }

    function formatChipKgRange(min: number | null, max: number | null): string | null {
        if (min == null && max == null) return null;
        const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toString().replace('.', ','));
        if (min != null && max != null) return `${fmt(min)}–${fmt(max)}kg`;
        if (max != null) return `até ${fmt(max)}kg`;
        if (min != null) return `+${fmt(min)}kg`;
        return null;
    }

    function openMergeModal() {
        const names = Array.from(selected);
        if (names.length < 2) return;
        setMergeName(suggestMergedName(names));
        setMergeError(null);
        setShowMergeModal(true);
    }

    async function handleConfirmMerge() {
        const names = Array.from(selected);
        if (names.length < 2) return;
        setMerging(true);
        setMergeError(null);
        const res = await criarCategoriaJuntada(eventId, mergeName.trim(), names);
        setMerging(false);
        if (!res.ok) {
            setMergeError(res.error || 'Falha ao juntar categorias.');
            return;
        }
        setShowMergeModal(false);
        exitSelectMode();
        await load();
    }

    async function handleDesfazer(juntadaId: string) {
        setDesfazendo(true);
        setDesfazerError(null);
        try {
            const res = await desfazerCategoriaJuntada(eventId, juntadaId);
            if (!res.ok) {
                setDesfazerError(res.error || 'Falha ao desfazer junção.');
                return;
            }
            setConfirmDesfazer(null);
            await load();
        } catch (err: any) {
            setDesfazerError(err?.message || 'Erro inesperado ao desfazer junção.');
        } finally {
            setDesfazendo(false);
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Chaveamento ao vivo"
                description={eventName ? `${eventName} · ${totals.totalAtletas} atletas em ${totals.totalCat} categorias` : 'Carregando...'}
                rightElement={
                    <div className="flex items-center gap-2">
                        {selectMode ? (
                            <Button
                                variant="outline"
                                pill
                                className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                                onClick={exitSelectMode}
                            >
                                <XCircleIcon size={16} weight="duotone" />
                                Cancelar seleção
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                pill
                                className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                                onClick={() => setSelectMode(true)}
                            >
                                <LinkSimpleIcon size={16} weight="duotone" />
                                Juntar categorias
                            </Button>
                        )}
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm" asChild>
                            <Link href="/academia-equipe/dashboard/gestao-evento">
                                <ArrowLeftIcon size={16} weight="duotone" />
                                Voltar
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard
                    icon={<UsersIcon size={18} weight="duotone" />}
                    label="Atletas"
                    value={totals.totalAtletas}
                    active={bucket === 'all'}
                    onClick={() => setBucket('all')}
                    tone="all"
                />
                <KpiCard
                    icon={<TrophyIcon size={18} weight="duotone" />}
                    label="W.O."
                    value={totals.wo}
                    active={bucket === 'wo'}
                    onClick={() => setBucket(bucket === 'wo' ? 'all' : 'wo')}
                    tone="wo"
                />
                <KpiCard
                    icon={<KeyIcon size={18} weight="duotone" />}
                    label="Finais diretas"
                    value={totals.finals}
                    active={bucket === 'final'}
                    onClick={() => setBucket(bucket === 'final' ? 'all' : 'final')}
                    tone="final"
                />
                <KpiCard
                    icon={<KeyIcon size={18} weight="duotone" />}
                    label="Round-Robin"
                    value={totals.rr}
                    active={bucket === 'rr'}
                    onClick={() => setBucket(bucket === 'rr' ? 'all' : 'rr')}
                    tone="rr"
                />
                <KpiCard
                    icon={<KeyIcon size={18} weight="duotone" />}
                    label="Eliminatórias"
                    value={totals.elims}
                    active={bucket === 'elim'}
                    onClick={() => setBucket(bucket === 'elim' ? 'all' : 'elim')}
                    tone="elim"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {divisoesDisponiveis.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={`flex items-center justify-between gap-1.5 h-auto px-3 py-1.5 rounded-full text-sm font-semibold border transition-all bg-background shadow-none focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                    activeDivisoes.size > 0
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-border text-muted-foreground hover:bg-muted/40'
                                }`}
                            >
                                <span>
                                    Divisão
                                    {activeDivisoes.size > 0 && (
                                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                                            {activeDivisoes.size}
                                        </span>
                                    )}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56 p-2">
                            <div className="space-y-1">
                                {divisoesDisponiveis.map((divisao) => {
                                    const isActive = activeDivisoes.has(divisao);
                                    return (
                                        <label
                                            key={divisao}
                                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={isActive}
                                                onCheckedChange={() => toggleDivisao(divisao)}
                                            />
                                            <span className="text-sm font-medium">
                                                {SUPER_DIVISAO_LABELS[divisao]}
                                            </span>
                                        </label>
                                    );
                                })}
                                {activeDivisoes.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveDivisoes(new Set())}
                                        className="w-full text-left px-2 py-1.5 mt-1 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted/60 border-t border-border/40 pt-2"
                                    >
                                        Limpar seleção
                                    </button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {modalidadesDisponiveis.length > 0 &&
                    modalidadesDisponiveis.map((mod) => {
                        const isActive = activeModalidades.has(mod);
                        return (
                            <button
                                key={mod}
                                type="button"
                                onClick={() => toggleModalidade(mod)}
                                aria-pressed={isActive}
                                className={`inline-flex items-center h-auto px-3 py-1.5 rounded-full text-sm font-semibold border transition-all shadow-none focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                                    isActive
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-border text-muted-foreground bg-background hover:bg-muted/40'
                                }`}
                            >
                                {MODALIDADE_LABELS[mod]}
                            </button>
                        );
                    })}
            </div>

            {faixasDisponiveis.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-panel-sm font-semibold text-muted-foreground mr-1">Faixa:</span>
                    {faixasDisponiveis.map((faixa) => {
                        const isActive = activeFaixas.has(faixa);
                        const c = getFaixaColor(faixa);
                        return (
                            <button
                                key={faixa}
                                type="button"
                                onClick={() => toggleFaixa(faixa)}
                                aria-pressed={isActive}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                                    isActive
                                        ? `${c.activeBg} ${c.activeBorder} ${c.activeText}`
                                        : `${c.bg} ${c.border} ${c.text} hover:opacity-80`
                                }`}
                            >
                                {faixa}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-full sm:w-72">
                        <MagnifyingGlassIcon
                            size={16}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            placeholder="Buscar categoria..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl text-panel-sm"
                        />
                    </div>
                    {hasActiveFilter && (
                        <>
                            <span className="text-panel-sm text-muted-foreground">
                                <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> de{' '}
                                <span className="tabular-nums">{categorias.length}</span> categorias
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 gap-1.5 text-panel-sm"
                            >
                                <XCircleIcon size={14} weight="duotone" />
                                Limpar
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 text-panel-sm text-muted-foreground">
                    <PulseIcon size={14} weight="duotone" className="text-emerald-500 animate-pulse" />
                    Atualizando ao vivo{updatedAt ? ` · última: ${updatedAt.toLocaleTimeString('pt-BR')}` : ''}
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-border/30">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-panel-sm">
                        {categorias.length === 0
                            ? 'Nenhuma categoria com inscrição confirmada ainda.'
                            : 'Nenhuma categoria encontrada com os filtros aplicados.'}
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {filtered.map((cat) => {
                            const hint = formatBracketHint(cat.count);
                            const pesoRange = cat.superDivisao === 'absoluto'
                                ? null
                                : formatPesoRange(cat.peso_min_kg, cat.peso_max_kg);
                            const isMerged = !!cat.isMerged;
                            const isSelected = selected.has(cat.name);
                            // Em modo seleção, junções não podem ser re-selecionadas
                            const canSelect = selectMode && !isMerged;
                            return (
                                <div
                                    key={cat.name}
                                    className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                                    } ${selectMode && canSelect ? 'cursor-pointer' : ''}`}
                                    onClick={() => canSelect && toggleSelected(cat.name)}
                                >
                                    {selectMode && (
                                        <div className="shrink-0">
                                            {canSelect ? (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelected(cat.name)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded border border-border/40 bg-muted/40" title="Já é uma junção" />
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-panel-sm line-clamp-1" title={cat.name}>
                                                {cat.name}
                                            </p>
                                            {isMerged && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-violet-500/40 text-violet-700 bg-violet-500/10 shrink-0"
                                                >
                                                    Juntada
                                                </Badge>
                                            )}
                                            {cat.chaveGerada && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-emerald-500/40 text-emerald-700 bg-emerald-500/10 shrink-0 inline-flex items-center gap-1"
                                                >
                                                    <KeyIcon size={11} weight="fill" />
                                                    Chave gerada
                                                </Badge>
                                            )}
                                        </div>
                                        {isMerged && cat.mergedItems && cat.mergedItems.length > 0 && (
                                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                                Inclui: {cat.mergedItems.join(' · ')}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 ${
                                                    hint.tone === 'wo'
                                                        ? 'border-amber-500/40 text-amber-700 bg-amber-500/10'
                                                        : hint.tone === 'final'
                                                        ? 'border-blue-500/40 text-blue-700 bg-blue-500/10'
                                                        : hint.tone === 'rr'
                                                        ? 'border-violet-500/40 text-violet-700 bg-violet-500/10'
                                                        : hint.tone === 'elim'
                                                        ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10'
                                                        : 'border-muted-foreground/30 text-muted-foreground'
                                                }`}
                                            >
                                                {hint.label}
                                            </Badge>
                                            {pesoRange && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-foreground">
                                                    {pesoRange}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                <UsersIcon size={14} weight="duotone" />
                                                {cat.count}{' '}
                                                {cat.count === 1 ? 'atleta' : 'atletas'}
                                            </span>
                                        </div>
                                        {!selectMode && sugestoesPorCategoria.get(cat.name) && (() => {
                                            const sugs = sugestoesPorCategoria.get(cat.name)!;
                                            const sel = chipSelecoes.get(cat.name) || new Set<string>();
                                            const selCount = sel.size;
                                            const totalAtletasMerge =
                                                cat.count +
                                                sugs.filter((s) => sel.has(s.name)).reduce((acc, s) => acc + s.count, 0);
                                            return (
                                                <div className="mt-3 space-y-2 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-amber-800">
                                                        <LinkSimpleIcon size={16} weight="fill" />
                                                        Pode juntar com (toque para selecionar):
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <TooltipProvider delayDuration={150}>
                                                            {sugs.map((sug) => {
                                                                const isSel = sel.has(sug.name);
                                                                const range = formatChipKgRange(
                                                                    sug.peso_min_kg,
                                                                    sug.peso_max_kg,
                                                                );
                                                                return (
                                                                    <Tooltip key={sug.name}>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleChipSelecao(cat.name, sug.name);
                                                                                }}
                                                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${
                                                                                    isSel
                                                                                        ? 'border-amber-600 bg-amber-500 text-white shadow-md'
                                                                                        : 'border-amber-400/60 bg-white text-amber-900 hover:bg-amber-100'
                                                                                }`}
                                                                            >
                                                                                <span
                                                                                    className={`inline-flex items-center justify-center h-4 w-4 rounded border-2 ${
                                                                                        isSel
                                                                                            ? 'border-white bg-white text-amber-700'
                                                                                            : 'border-amber-500 bg-white'
                                                                                    }`}
                                                                                >
                                                                                    {isSel && (
                                                                                        <svg viewBox="0 0 16 16" className="h-3 w-3">
                                                                                            <path
                                                                                                d="M3 8l3 3 7-7"
                                                                                                fill="none"
                                                                                                stroke="currentColor"
                                                                                                strokeWidth="2.5"
                                                                                                strokeLinecap="round"
                                                                                                strokeLinejoin="round"
                                                                                            />
                                                                                        </svg>
                                                                                    )}
                                                                                </span>
                                                                                <span className="uppercase tracking-wide">
                                                                                    {sug.parsed.peso || sug.name}
                                                                                </span>
                                                                                {range && (
                                                                                    <span
                                                                                        className={`normal-case font-semibold ${
                                                                                            isSel ? 'text-amber-50' : 'text-amber-700'
                                                                                        }`}
                                                                                    >
                                                                                        {range}
                                                                                    </span>
                                                                                )}
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1 normal-case font-semibold ${
                                                                                        isSel ? 'text-amber-50' : 'text-amber-700'
                                                                                    }`}
                                                                                >
                                                                                    · {sug.count} {sug.count === 1 ? 'atleta' : 'atletas'}
                                                                                </span>
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent
                                                                            side="top"
                                                                            className="max-w-sm font-medium space-y-1 px-4 py-3 text-sm"
                                                                        >
                                                                            <div className="text-base font-bold">{sug.name}</div>
                                                                            {range && (
                                                                                <div className="text-sm opacity-80">
                                                                                    Peso: {range}
                                                                                </div>
                                                                            )}
                                                                            <div className="text-sm opacity-80">
                                                                                {sug.count} {sug.count === 1 ? 'atleta' : 'atletas'}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                );
                                                            })}
                                                        </TooltipProvider>
                                                    </div>
                                                    {selCount > 0 && (
                                                        <div className="flex items-center justify-between pt-1">
                                                            <span className="text-sm text-amber-800 font-semibold">
                                                                {selCount === 1
                                                                    ? '1 categoria selecionada'
                                                                    : `${selCount} categorias selecionadas`}
                                                                {' · '}
                                                                <span className="tabular-nums">{totalAtletasMerge}</span>{' '}
                                                                atletas no total
                                                            </span>
                                                            <Button
                                                                pill
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openMultiSuggestedMerge(cat.name);
                                                                }}
                                                                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                                            >
                                                                <LinkSimpleIcon size={14} weight="fill" />
                                                                Juntar selecionadas
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    {!selectMode && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isMerged && cat.mergedId && (
                                                <Button
                                                    pill
                                                    variant="outline"
                                                    className="font-semibold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                                    onClick={() => {
                                                        setDesfazerError(null);
                                                        setConfirmDesfazer({ id: cat.mergedId!, name: cat.name });
                                                    }}
                                                >
                                                    <LinkBreakIcon size={14} weight="duotone" />
                                                    Desfazer
                                                </Button>
                                            )}
                                            <Button
                                                asChild
                                                pill
                                                variant="outline"
                                                className={
                                                    cat.chaveGerada
                                                        ? 'font-semibold gap-2 bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 shadow-md shadow-emerald-600/20'
                                                        : 'font-semibold gap-2'
                                                }
                                            >
                                                <Link
                                                    href={`/academia-equipe/dashboard/gestao-evento/${eventId}/chaveamento/${encodeURIComponent(cat.name)}`}
                                                >
                                                    <KeyIcon size={14} weight={cat.chaveGerada ? 'fill' : 'duotone'} />
                                                    {cat.chaveGerada ? 'Abrir chave' : 'Ver chave'}
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectMode && selected.size > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-full border border-border bg-background shadow-xl">
                    <span className="text-panel-sm font-semibold">
                        <span className="text-foreground tabular-nums">{selected.size}</span>{' '}
                        {selected.size === 1 ? 'categoria' : 'categorias'} ·{' '}
                        <span className="text-foreground tabular-nums">{selectedTotalAtletas}</span>{' '}
                        {selectedTotalAtletas === 1 ? 'atleta' : 'atletas'}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(new Set())}
                        className="h-9 text-panel-sm"
                    >
                        Limpar
                    </Button>
                    <Button
                        pill
                        onClick={openMergeModal}
                        disabled={selected.size < 2}
                        className="h-9 gap-2 font-semibold"
                    >
                        <LinkSimpleIcon size={14} weight="duotone" />
                        Juntar ({selected.size})
                    </Button>
                </div>
            )}

            <Dialog open={showMergeModal} onOpenChange={(open) => !merging && setShowMergeModal(open)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold flex items-center gap-2">
                            <LinkSimpleIcon size={20} weight="duotone" className="text-primary" />
                            Juntar categorias
                        </DialogTitle>
                        <DialogDescription>
                            Estas categorias serão tratadas como uma só no chaveamento. As inscrições dos atletas
                            permanecem na categoria original.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5 max-h-44 overflow-y-auto">
                            {selectedCategorias.map((c) => (
                                <div key={c.name} className="flex items-center justify-between gap-2 text-panel-sm">
                                    <span className="font-medium line-clamp-1" title={c.name}>{c.name}</span>
                                    <span className="text-muted-foreground tabular-nums shrink-0">
                                        {c.count} {c.count === 1 ? 'atleta' : 'atletas'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="text-panel-sm font-semibold block mb-1.5">Nome da categoria juntada</label>
                            <Input
                                value={mergeName}
                                onChange={(e) => setMergeName(e.target.value)}
                                className="h-11 text-panel-sm"
                                placeholder="Ex: Adulto Branca/Azul até 82,3kg"
                            />
                        </div>

                        <div className="flex items-center justify-between text-panel-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <span className="font-semibold">Total de atletas</span>
                            <span className="font-bold tabular-nums text-primary">{selectedTotalAtletas}</span>
                        </div>

                        {mergeWarnings.length > 0 && (
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-panel-sm">
                                    <WarningIcon size={16} weight="duotone" />
                                    Atenção
                                </div>
                                <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
                                    {mergeWarnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {mergeError && (
                            <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-panel-sm px-3 py-2">
                                {mergeError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowMergeModal(false)}
                            disabled={merging}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmMerge}
                            disabled={merging || !mergeName.trim()}
                            className="gap-2 font-semibold"
                        >
                            <LinkSimpleIcon size={14} weight="duotone" />
                            {merging ? 'Juntando...' : 'Confirmar junção'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!confirmDesfazer}
                onOpenChange={(open) => {
                    if (desfazendo || open) return;
                    setConfirmDesfazer(null);
                    setDesfazerError(null);
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold flex items-center gap-2">
                            <LinkBreakIcon size={20} weight="duotone" className="text-destructive" />
                            Desfazer junção?
                        </DialogTitle>
                        <DialogDescription>
                            As categorias voltarão a aparecer separadas. Se uma chave oficial foi gerada para essa
                            junção, ela será apagada.
                        </DialogDescription>
                    </DialogHeader>
                    {confirmDesfazer && (
                        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-panel-sm font-medium">
                            {confirmDesfazer.name}
                        </div>
                    )}
                    {desfazerError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-panel-sm text-destructive">
                            {desfazerError}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setConfirmDesfazer(null);
                                setDesfazerError(null);
                            }}
                            disabled={desfazendo}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => confirmDesfazer && handleDesfazer(confirmDesfazer.id)}
                            disabled={desfazendo}
                            className="gap-2 font-semibold"
                        >
                            <LinkBreakIcon size={14} weight="duotone" />
                            {desfazendo ? 'Desfazendo...' : 'Desfazer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const TONE_STYLES: Record<string, { ring: string; bg: string; iconBg: string }> = {
    all: {
        ring: 'ring-foreground/40 bg-foreground/5',
        bg: 'bg-muted/40',
        iconBg: 'bg-foreground/10',
    },
    wo: {
        ring: 'ring-amber-500/60 bg-amber-500/10',
        bg: 'bg-muted/40',
        iconBg: 'bg-amber-500/15 text-amber-700',
    },
    final: {
        ring: 'ring-blue-500/60 bg-blue-500/10',
        bg: 'bg-muted/40',
        iconBg: 'bg-blue-500/15 text-blue-700',
    },
    rr: {
        ring: 'ring-violet-500/60 bg-violet-500/10',
        bg: 'bg-muted/40',
        iconBg: 'bg-violet-500/15 text-violet-700',
    },
    elim: {
        ring: 'ring-emerald-500/60 bg-emerald-500/10',
        bg: 'bg-muted/40',
        iconBg: 'bg-emerald-500/15 text-emerald-700',
    },
};

function KpiCard({
    icon,
    label,
    value,
    active,
    onClick,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
    tone: 'all' | 'wo' | 'final' | 'rr' | 'elim';
}) {
    const style = TONE_STYLES[tone];
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? `ring-2 ${style.ring}` : `${style.bg} hover:bg-muted/60`
            }`}
        >
            <div
                className={`flex items-center justify-center h-9 w-9 rounded-lg ${
                    active ? style.iconBg : 'bg-foreground/10'
                }`}
            >
                {icon}
            </div>
            <div>
                <p className="text-panel-sm text-muted-foreground font-medium">{label}</p>
                <p className="text-lg font-bold tabular-nums">{value}</p>
            </div>
        </button>
    );
}

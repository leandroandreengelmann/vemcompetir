'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    Search,
    Users,
    ChevronRight,
    Trophy,
    CalendarClock,
    ListTree,
    Loader2,
    UserSearch,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getSuperDivisao,
    getFaixaColor,
    parseCategoria,
    SUPER_DIVISAO_LABELS,
    SUPER_DIVISAO_ORDER,
    type SuperDivisao,
} from '@/lib/gestao-evento/parse-categoria';
import { CronogramaMatupa } from './CronogramaMatupa';
import { usePresence } from './usePresence';
import {
    buscarAtletaPublico,
    registrarAcesso,
    type ChavePublicaItem,
    type AtletaPublicoResultado,
} from '@/lib/public/chaves-publicas';

type Tab = 'chaves' | 'cronograma';

interface Props {
    eventId: string;
    eventTitle: string;
    chaves: ChavePublicaItem[];
}

function formatoLabel(formato: string): string {
    if (formato === 'single_elimination') return 'Eliminatória';
    if (formato === 'final_only') return 'Final direta';
    if (formato === 'round_robin') return 'Todos contra todos';
    return 'Chaveamento';
}

export function ChavesPublicasBrowser({ eventId, eventTitle, chaves }: Props) {
    const [tab, setTab] = useState<Tab>('chaves');
    const [term, setTerm] = useState('');
    const [filtroDiv, setFiltroDiv] = useState<SuperDivisao | 'all'>('all');

    const [results, setResults] = useState<AtletaPublicoResultado[]>([]);
    const [searching, setSearching] = useState(false);

    // Marca presença (tempo real) + registra 1 acesso por sessão.
    usePresence(eventId, true);
    useEffect(() => {
        const key = `chaves-acesso:${eventId}`;
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        registrarAcesso(eventId).catch(() => {});
    }, [eventId]);

    // Busca por nome/CPF com debounce.
    useEffect(() => {
        const t = term.trim();
        if (t.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        let active = true;
        const timer = setTimeout(async () => {
            try {
                const data = await buscarAtletaPublico(eventId, t);
                if (active) setResults(data);
            } catch {
                if (active) setResults([]);
            } finally {
                if (active) setSearching(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [term, eventId]);

    // Divisões presentes (para os chips de filtro).
    const divisoesPresentes = useMemo(() => {
        const set = new Set<SuperDivisao>();
        for (const c of chaves) set.add(c.superDivisao);
        return SUPER_DIVISAO_ORDER.filter((d) => set.has(d));
    }, [chaves]);

    const chavesFiltradas = useMemo(() => {
        if (filtroDiv === 'all') return chaves;
        return chaves.filter((c) => c.superDivisao === filtroDiv);
    }, [chaves, filtroDiv]);

    const isSearching = term.trim().length >= 2;

    return (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
            {/* Hero */}
            <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary mb-3">
                    <Trophy className="h-3.5 w-3.5" />
                    Chaves do evento
                </span>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground leading-tight">
                    {eventTitle}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Consulte as categorias sorteadas e o cronograma. Busque pelo seu nome ou CPF.
                </p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted/60 mb-6 sticky top-16 sm:top-[calc(var(--header-height,90px)+0.5rem)] z-30 backdrop-blur">
                <button
                    onClick={() => setTab('chaves')}
                    className={cn(
                        'flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-colors',
                        tab === 'chaves'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <ListTree className="h-4 w-4" />
                    Chaves
                </button>
                <button
                    onClick={() => setTab('cronograma')}
                    className={cn(
                        'flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-colors',
                        tab === 'cronograma'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <CalendarClock className="h-4 w-4" />
                    Cronograma
                </button>
            </div>

            {tab === 'cronograma' ? (
                <CronogramaMatupa />
            ) : (
                <div className="space-y-5">
                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            inputMode="search"
                            placeholder="Buscar por nome ou CPF do atleta"
                            className="w-full h-14 pl-12 pr-11 rounded-2xl border border-border bg-card text-base font-medium shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                        />
                        {term && (
                            <button
                                onClick={() => setTerm('')}
                                aria-label="Limpar busca"
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Resultados da busca por atleta */}
                    {isSearching ? (
                        <div className="space-y-3">
                            {searching ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Buscando atletas...
                                </div>
                            ) : results.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10 text-center">
                                    <UserSearch className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhum atleta encontrado em categorias já sorteadas.
                                    </p>
                                </div>
                            ) : (
                                results.map((a, idx) => (
                                    <div
                                        key={`${a.name}-${idx}`}
                                        className="rounded-2xl border border-border/60 bg-card shadow-sm p-4"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                                                {getInitials(a.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-foreground truncate">{a.name}</p>
                                                {a.team && (
                                                    <p className="text-xs text-muted-foreground truncate">{a.team}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {a.categorias.map((cat) => (
                                                <CategoriaLink key={cat} eventId={eventId} categoria={cat} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Filtro por divisão */}
                            {divisoesPresentes.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                    <FiltroChip
                                        active={filtroDiv === 'all'}
                                        onClick={() => setFiltroDiv('all')}
                                        label="Todas"
                                    />
                                    {divisoesPresentes.map((d) => (
                                        <FiltroChip
                                            key={d}
                                            active={filtroDiv === d}
                                            onClick={() => setFiltroDiv(d)}
                                            label={SUPER_DIVISAO_LABELS[d]}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Lista de categorias */}
                            {chaves.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-16 text-center">
                                    <ListTree className="h-12 w-12 text-muted-foreground/30" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Nenhuma categoria sorteada ainda.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Assim que as chaves forem definidas, elas aparecem aqui.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                        {chavesFiltradas.length}{' '}
                                        {chavesFiltradas.length === 1 ? 'categoria' : 'categorias'}
                                    </p>
                                    {chavesFiltradas.map((c) => (
                                        <CategoriaCard key={c.category_name} eventId={eventId} chave={c} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function FiltroChip({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'shrink-0 h-9 px-4 rounded-full text-sm font-bold border transition-colors whitespace-nowrap',
                active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
            )}
        >
            {label}
        </button>
    );
}

function CategoriaCard({ eventId, chave }: { eventId: string; chave: ChavePublicaItem }) {
    const cor = getFaixaColor(chave.faixa);
    return (
        <Link
            href={`/eventos/${eventId}/chaves/${encodeURIComponent(chave.category_name)}`}
            className="group flex items-stretch gap-3 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
        >
            <span className={cn('w-1.5 shrink-0', cor.activeBg)} />
            <div className="flex-1 min-w-0 py-3 pr-2">
                <p className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                    {chave.category_name}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold">
                        <Users className="h-3.5 w-3.5" />
                        {chave.total_atletas}
                    </span>
                    <span>{formatoLabel(chave.formato)}</span>
                </div>
            </div>
            <span className="flex items-center pr-3 text-muted-foreground group-hover:text-primary transition-colors">
                <ChevronRight className="h-5 w-5" />
            </span>
        </Link>
    );
}

function CategoriaLink({ eventId, categoria }: { eventId: string; categoria: string }) {
    const parsed = parseCategoria(categoria);
    const cor = getFaixaColor(parsed.faixa);
    return (
        <Link
            href={`/eventos/${eventId}/chaves/${encodeURIComponent(categoria)}`}
            className="group flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 hover:border-primary/40 hover:bg-card transition-all"
        >
            <span className={cn('h-7 w-1.5 rounded-full shrink-0', cor.activeBg)} />
            <span className="flex-1 min-w-0 text-sm font-semibold text-foreground line-clamp-2">
                {categoria}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
    );
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

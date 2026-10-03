'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon, XIcon, CaretDownIcon, ArrowsOutSimpleIcon, ArrowsInSimpleIcon } from '@phosphor-icons/react';
import { nomeDivisao, coresDaFaixa, type MapaGrupo, type CategoriaDetalhe } from '@/lib/mapa-categorias';

interface MapaCategoriasClientProps {
    grupos: MapaGrupo[];
}

const CORES_CLARAS = ['#FDFDFD', '#FDB022'];

/** Pílula com as cores da faixa. Faixas combinadas recebem metade de cada cor. */
function estiloFaixa(faixa: string): CSSProperties {
    const cores = coresDaFaixa(faixa);
    const texto = cores[0] && CORES_CLARAS.includes(cores[0]) ? '#1c1917' : '#ffffff';
    const fundo = cores.length === 0
        ? undefined
        : cores.length === 1
            ? cores[0]
            : `linear-gradient(90deg, ${cores[0]} 50%, ${cores[1]} 50%)`;
    return {
        background: fundo,
        color: fundo ? texto : undefined,
        textShadow: fundo && texto === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
        boxShadow: 'inset 0 0 0 1px rgba(127,127,127,0.35)',
    };
}

/** Faixa vertical na borda do card, nas cores da faixa. */
function estiloBorda(faixa: string): CSSProperties {
    const cores = coresDaFaixa(faixa);
    if (cores.length === 0) return {};
    const fundo = cores.length === 1 ? cores[0] : `linear-gradient(180deg, ${cores[0]} 50%, ${cores[1]} 50%)`;
    return { background: fundo };
}

function FaixaPill({ faixa, className = '' }: { faixa: string; className?: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${className}`}
            style={estiloFaixa(faixa)}
        >
            {faixa}
        </span>
    );
}

function ModalidadeTag({ modalidade }: { modalidade: string }) {
    if (!modalidade) return null;
    const noGi = modalidade === 'No-Gi';
    return (
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${noGi ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
            {modalidade}
        </span>
    );
}

function filtrarCategorias(categorias: CategoriaDetalhe[], modalidade: string, query: string, contexto: string) {
    const q = query.trim().toLowerCase();
    return categorias.filter((c) => {
        if (modalidade && c.modalidade !== modalidade) return false;
        if (!q) return true;
        return `${contexto} ${c.peso} ${c.modalidade} ${c.textoPeso}`.toLowerCase().includes(q);
    });
}

const SEXO_OPCOES = [
    { value: '', label: 'Todos' },
    { value: 'Masculino', label: 'Masculino' },
    { value: 'Feminino', label: 'Feminino' },
] as const;

function Segmentado({ label, opcoes, valor, onChange }: {
    label: string;
    opcoes: ReadonlyArray<{ value: string; label: string }>;
    valor: string;
    onChange: (v: string) => void;
}) {
    return (
        <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-full border border-border bg-card p-1">
            {opcoes.map((op) => {
                const ativo = valor === op.value;
                return (
                    <button
                        key={op.value || 'todos'}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => onChange(op.value)}
                        className={`rounded-full px-3.5 py-1.5 text-panel-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${ativo ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {op.label}
                    </button>
                );
            })}
        </div>
    );
}

export function MapaCategoriasClient({ grupos }: MapaCategoriasClientProps) {
    const [sexo, setSexo] = useState('');
    const [modalidade, setModalidade] = useState('');
    const [query, setQuery] = useState('');
    // Trocar `versao` remonta os <details> com o estado de `abrirTudo`, o que expande ou recolhe todos de uma vez.
    const [versao, setVersao] = useState(0);
    const [abrirTudo, setAbrirTudo] = useState(false);

    const totais = useMemo(() => {
        const divisoes = new Set<string>();
        const faixas = new Set<string>();
        const modalidades = new Set<string>();
        let categorias = 0;
        for (const g of grupos) for (const s of g.sexos) for (const d of s.divisoes) {
            divisoes.add(d.divisao);
            for (const f of d.faixas) {
                faixas.add(f.faixa);
                categorias += f.categorias.length;
                for (const c of f.categorias) if (c.modalidade) modalidades.add(c.modalidade);
            }
        }
        return { grupos: grupos.length, divisoes: divisoes.size, faixas: faixas.size, categorias, modalidades: [...modalidades].sort() };
    }, [grupos]);

    // Só mostra as modalidades que existem no evento. Com uma só, o filtro não aparece.
    const opcoesModalidade = useMemo(
        () => [{ value: '', label: 'Todas' }, ...totais.modalidades.map((m) => ({ value: m, label: m }))],
        [totais.modalidades],
    );

    const filtrados = useMemo(() => {
        return grupos
            .map((g) => ({
                ...g,
                sexos: g.sexos
                    .filter((s) => !sexo || s.sexo === sexo)
                    .map((s) => ({
                        ...s,
                        divisoes: s.divisoes
                            .map((d) => ({
                                ...d,
                                faixas: d.faixas
                                    .map((f) => ({
                                        ...f,
                                        categorias: filtrarCategorias(f.categorias, modalidade, query, `${nomeDivisao(d.divisao)} ${f.faixa}`),
                                    }))
                                    .filter((f) => f.categorias.length > 0),
                            }))
                            .filter((d) => d.faixas.length > 0),
                    }))
                    .filter((s) => s.divisoes.length > 0),
            }))
            .filter((g) => g.sexos.length > 0);
    }, [grupos, sexo, modalidade, query]);

    const mostradas = useMemo(
        () => filtrados.reduce((t, g) => t + g.sexos.reduce((ts, s) => ts + s.divisoes.reduce((td, d) => td + d.faixas.reduce((tf, f) => tf + f.categorias.length, 0), 0), 0), 0),
        [filtrados],
    );

    const filtrando = Boolean(sexo || modalidade || query.trim());

    function limparFiltros() {
        setSexo('');
        setModalidade('');
        setQuery('');
    }

    function alternarTudo(abrir: boolean) {
        setAbrirTudo(abrir);
        setVersao((v) => v + 1);
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    { valor: totais.grupos, rotulo: 'grupos' },
                    { valor: totais.divisoes, rotulo: 'divisões de idade' },
                    { valor: totais.faixas, rotulo: 'faixas' },
                    { valor: totais.categorias.toLocaleString('pt-BR'), rotulo: 'categorias ativas' },
                ].map((item) => (
                    <div key={item.rotulo} className="rounded-2xl border border-border bg-card px-4 py-3">
                        <div className="text-2xl font-bold tabular-nums font-display">{item.valor}</div>
                        <div className="text-panel-sm text-muted-foreground">{item.rotulo}</div>
                    </div>
                ))}
            </div>

            <div className="sticky top-0 z-10 -mx-1 space-y-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="flex flex-wrap items-center gap-2">
                    <Segmentado label="Filtrar por sexo" opcoes={SEXO_OPCOES} valor={sexo} onChange={setSexo} />
                    {totais.modalidades.length > 1 && (
                        <Segmentado label="Filtrar por modalidade" opcoes={opcoesModalidade} valor={modalidade} onChange={setModalidade} />
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar divisão, faixa ou peso"
                            aria-label="Buscar categoria"
                            className="pl-9"
                        />
                    </div>
                    <button type="button" onClick={() => alternarTudo(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-panel-sm font-semibold text-muted-foreground hover:text-foreground">
                        <ArrowsOutSimpleIcon size={14} /> Expandir tudo
                    </button>
                    <button type="button" onClick={() => alternarTudo(false)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-panel-sm font-semibold text-muted-foreground hover:text-foreground">
                        <ArrowsInSimpleIcon size={14} /> Recolher tudo
                    </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-panel-sm text-muted-foreground">
                    <span>
                        Mostrando <b className="text-foreground tabular-nums">{mostradas.toLocaleString('pt-BR')}</b> de {totais.categorias.toLocaleString('pt-BR')} categorias
                    </span>
                    {filtrando && (
                        <button type="button" onClick={limparFiltros} className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline">
                            <XIcon size={12} /> Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {filtrados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="text-panel-sm text-muted-foreground">Nenhuma categoria ativa encontrada com esses filtros.</p>
                    {filtrando && (
                        <button type="button" onClick={limparFiltros} className="mt-3 text-panel-sm font-semibold underline underline-offset-4">
                            Limpar filtros
                        </button>
                    )}
                </div>
            ) : (
                filtrados.map((g, gi) => {
                    const categoriasGrupo = g.sexos.reduce((t, s) => t + s.divisoes.reduce((td, d) => td + d.faixas.reduce((tf, f) => tf + f.categorias.length, 0), 0), 0);
                    return (
                        <section key={`${gi}-${g.nome}`} className="overflow-hidden rounded-3xl border border-border bg-card">
                            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
                                <h2 className="font-display text-xl font-bold">{g.nome}</h2>
                                <span className="text-panel-sm text-muted-foreground tabular-nums">{categoriasGrupo} categorias</span>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {g.sexos.map((s, idx) => {
                                    const masc = s.sexo === 'Masculino';
                                    return (
                                        <div key={s.sexo} className={`min-w-0 space-y-3 p-4 md:p-5 ${idx > 0 ? 'border-t border-border md:border-l md:border-t-0' : ''}`}>
                                            <div className="flex items-center gap-2 px-1">
                                                <span className={`h-2.5 w-2.5 rounded-full ${masc ? 'bg-blue-600' : 'bg-pink-600'}`} aria-hidden />
                                                <h3 className="text-panel-sm font-extrabold uppercase tracking-wider text-foreground">{s.sexo}</h3>
                                            </div>

                                            {s.divisoes.map((d) => {
                                                const faixasDivisao = d.faixas.length;
                                                const categoriasDivisao = d.faixas.reduce((t, f) => t + f.categorias.length, 0);
                                                return (
                                                    <details key={`${versao}-${d.divisao}`} open={abrirTudo} className="group rounded-2xl border border-border bg-background/40 open:bg-background">
                                                        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                                                            <CaretDownIcon size={14} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate font-bold">{nomeDivisao(d.divisao)}</div>
                                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                                    {d.faixas.map((f) => (
                                                                        <FaixaPill key={f.faixa} faixa={f.faixa} className="text-[10px] py-px" />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right text-panel-sm text-muted-foreground tabular-nums">
                                                                <div>{categoriasDivisao} cat.</div>
                                                                <div>{faixasDivisao} {faixasDivisao === 1 ? 'faixa' : 'faixas'}</div>
                                                            </div>
                                                        </summary>

                                                        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
                                                            {d.faixas.map((f) => (
                                                                <div key={f.faixa} className="space-y-2.5">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <FaixaPill faixa={f.faixa} />
                                                                        <span className="text-panel-sm text-muted-foreground tabular-nums">
                                                                            {f.categorias.length} {f.categorias.length === 1 ? 'categoria' : 'categorias'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
                                                                        {f.categorias.map((c, i) => (
                                                                            <article key={`${c.peso}-${c.minKg}-${i}`} className="flex min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                                                                                <div className="w-1.5 shrink-0" style={estiloBorda(f.faixa)} aria-hidden />
                                                                                <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <h4 className="break-words text-panel-sm font-bold leading-snug">{c.peso}</h4>
                                                                                    </div>
                                                                                    <span className="text-panel-sm text-muted-foreground">{c.textoPeso}</span>
                                                                                    <div className="mt-auto pt-1">
                                                                                        <ModalidadeTag modalidade={c.modalidade} />
                                                                                    </div>
                                                                                </div>
                                                                            </article>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })
            )}
        </div>
    );
}

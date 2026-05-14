'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    BuildingsIcon,
    LinkIcon,
    CheckCircleIcon,
    EyeSlashIcon,
    EyeIcon,
    TrashIcon,
    CurrencyDollarIcon,
    CheckIcon,
    LightningIcon,
    ProhibitIcon,
    SparkleIcon,
    ArrowCounterClockwiseIcon,
    TrophyIcon,
    ShieldCheckIcon,
    StackIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import {
    flattenTudo,
    reconstruirOriginais,
    mesclarPorFaixa,
    mesclarPorIdade,
    mesclarFaixasEmMassa,
    mesclarIdadesEmMassa,
    mesclarIdadesUnindoPesos,
    desativarFaixasEmMassa,
    reativarFaixasEmMassa,
    podeMesclarPorFaixa,
    podeMesclarPorIdade,
    faixasDisponiveis,
    GRUPO_LABEL,
    type EventoCategoria,
    type Federacao,
    type Genero,
    type Grupo,
    type Modalidade,
} from '../lib/template-flatten';
import { getBeltStyle } from '@/lib/belt-theme';

const GRUPOS_AAMEP: Grupo[] = ['adulto', 'juvenil', 'master', 'kids', 'absolutos'];
const GRUPOS_IBJJF: Grupo[] = ['adulto', 'juvenil', 'master', 'kids'];

export function CategoriasFederacaoEditor({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
    const [federation, setFederation] = useState<Federacao | null>(null);
    const [modalidades, setModalidades] = useState<Set<Modalidade>>(new Set(['gi']));
    const [grupos, setGrupos] = useState<Set<Grupo>>(new Set());
    const [grupoAtivo, setGrupoAtivo] = useState<Grupo | null>(null);
    const [modalidadeAtiva, setModalidadeAtiva] = useState<Modalidade | 'all'>('all');
    const [genero, setGenero] = useState<Genero>('masculino');

    const [categorias, setCategorias] = useState<EventoCategoria[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loadedFor, setLoadedFor] = useState<{ federacao: Federacao; modalidades: Modalidade[] } | null>(null);
    const [idadeAtiva, setIdadeAtiva] = useState<string | 'all'>('all');
    const [faixaAtiva, setFaixaAtiva] = useState<string | 'all'>('all');
    const [beltsMassaAlvo, setBeltsMassaAlvo] = useState<Set<string>>(new Set());
    const [idadesMassaAlvo, setIdadesMassaAlvo] = useState<Set<string>>(new Set());
    const [beltsDesativarAlvo, setBeltsDesativarAlvo] = useState<Set<string>>(new Set());
    const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);
    // Chave: `${grupo}` ou `${grupo}-abs` (separa absolutos dentro de cada grupo)
    const [precosPorBucket, setPrecosPorBucket] = useState<Record<string, string>>({});
    // Aba ativa do painel de operações em massa
    const [opTab, setOpTab] = useState<'precos' | 'desativar' | 'mesclar'>('mesclar');
    // Histórico de lotes aplicados — cada entrada guarda um snapshot do estado anterior pra desfazer
    type LoteAplicado = {
        id: string;
        tipo: 'preco' | 'desativar' | 'reativar' | 'mesclar-faixa' | 'mesclar-idade' | 'unir-pesos';
        label: string;
        resumo: string;
        snapshot: EventoCategoria[];
    };
    const [lotesAplicados, setLotesAplicados] = useState<LoteAplicado[]>([]);
    // IDs de categorias recém-criadas/duplicadas — usado pra animar entrada
    const [categoriasFrescas, setCategoriasFrescas] = useState<Set<string>>(new Set());

    function pushLote(tipo: LoteAplicado['tipo'], label: string, resumo: string, snapshot: EventoCategoria[]) {
        setLotesAplicados((prev) => [
            { id: `lote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, tipo, label, resumo, snapshot },
            ...prev,
        ].slice(0, 12));
    }

    function desfazerLote(id: string) {
        const lote = lotesAplicados.find((l) => l.id === id);
        if (!lote) return;
        setCategorias(lote.snapshot);
        setLotesAplicados((prev) => prev.filter((l) => l.id !== id));
        setUltimoResultado(`Desfeito: ${lote.label}.`);
    }

    const gruposDisponiveis = federation === 'aamep' ? GRUPOS_AAMEP : federation === 'ibjjf' ? GRUPOS_IBJJF : [];

    function pickFederation(f: Federacao) {
        setFederation(f);
        setGrupos(new Set());
        setGrupoAtivo(null);
        if (f === 'aamep') setModalidades(new Set(['gi']));
        else setModalidades(new Set(['gi']));
    }

    function toggleModalidade(m: Modalidade) {
        if (federation === 'aamep') return; // AAMEP só Gi
        setModalidades((prev) => {
            const next = new Set(prev);
            if (next.has(m)) {
                if (next.size === 1) return prev; // não pode esvaziar
                next.delete(m);
            } else {
                next.add(m);
            }
            return next;
        });
    }

    function toggleGrupo(g: Grupo) {
        setGrupos((prev) => {
            const next = new Set(prev);
            if (next.has(g)) next.delete(g);
            else next.add(g);
            return next;
        });
    }

    function clonarTemplate() {
        if (!federation || grupos.size === 0 || modalidades.size === 0) return;
        const mods = federation === 'aamep' ? (['gi'] as Modalidade[]) : [...modalidades];
        const list = flattenTudo({ federacao: federation, modalidades: mods, grupos: [...grupos] });
        setCategorias(list);
        setSelectedIds(new Set());
        setLoadedFor({ federacao: federation, modalidades: mods });
        const primeiro = [...grupos][0];
        setGrupoAtivo(primeiro);
        setModalidadeAtiva(mods.length === 1 ? mods[0] : 'all');
        setGenero('masculino');
        setIdadeAtiva('all');
        setFaixaAtiva('all');
    }

    function resetMassa() {
        setBeltsMassaAlvo(new Set());
        setIdadesMassaAlvo(new Set());
        setBeltsDesativarAlvo(new Set());
        setUltimoResultado(null);
    }

    function changeGrupoAtivo(g: Grupo) {
        setGrupoAtivo(g);
        setIdadeAtiva('all');
        setFaixaAtiva('all');
        setSelectedIds(new Set());
        resetMassa();
    }

    function changeGenero(g: Genero) {
        setGenero(g);
        setIdadeAtiva('all');
        setFaixaAtiva('all');
        resetMassa();
    }

    function changeModalidadeAtiva(m: Modalidade | 'all') {
        setModalidadeAtiva(m);
        setIdadeAtiva('all');
        setFaixaAtiva('all');
        resetMassa();
    }

    function changeIdadeAtiva(k: string | 'all') {
        setIdadeAtiva(k);
        setFaixaAtiva('all');
    }

    function toggleAtiva(id: string) {
        setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ativa: !c.ativa } : c)));
    }

    function toggleSelected(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function limparSelecao() {
        setSelectedIds(new Set());
    }

    function mesclar(modo: 'faixa' | 'idade') {
        const selecionadas = categorias.filter((c) => selectedIds.has(c.id));
        if (selecionadas.length < 2) return;
        const valido = modo === 'faixa' ? podeMesclarPorFaixa(selecionadas) : podeMesclarPorIdade(selecionadas);
        if (!valido) return;
        const merged = modo === 'faixa' ? mesclarPorFaixa(selecionadas) : mesclarPorIdade(selecionadas);
        setCategorias((prev) => [...prev.filter((c) => !selectedIds.has(c.id)), merged]);
        setSelectedIds(new Set());
    }

    function desfazerMesclagem(id: string) {
        if (!loadedFor) return;
        const cat = categorias.find((c) => c.id === id);
        if (!cat || cat.origemTemplateIds.length <= 1) return;
        const restored = reconstruirOriginais(cat.origemTemplateIds, {
            federacao: loadedFor.federacao,
            modalidades: loadedFor.modalidades,
            grupos: [...grupos],
        });
        setCategorias((prev) => [...prev.filter((c) => c.id !== id), ...restored]);
    }

    function setValor(id: string, valor: number | null) {
        setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, valorInscricao: valor } : c)));
    }

    // Atribui/remove uma faixa em uma categoria absoluto (AAMEP cria absolutos sem faixa).
    function toggleAbsolutoBelt(catId: string, beltKey: string, beltLabel: string) {
        setCategorias((prev) =>
            prev.map((c) => {
                if (c.id !== catId || !c.isAbsoluto) return c;
                const has = c.beltKeys.includes(beltKey);
                const beltKeys = has ? c.beltKeys.filter((k) => k !== beltKey) : [...c.beltKeys, beltKey];
                const beltLabels = has ? c.beltLabels.filter((_, i) => c.beltKeys[i] !== beltKey) : [...c.beltLabels, beltLabel];
                const next = { ...c, beltKeys, beltLabels };
                return { ...next, label: rebuildAbsolutoLabel(next) };
            }),
        );
    }

    // Edita campos do absoluto (só AAMEP).
    function salvarAbsolutoEdit(catId: string, patch: Partial<Pick<EventoCategoria, 'weightName' | 'range' | 'pesoMin' | 'pesoMax' | 'fightTime'>>) {
        setCategorias((prev) =>
            prev.map((c) => {
                if (c.id !== catId || !c.isAbsoluto || c.federacao !== 'aamep') return c;
                const next = { ...c, ...patch };
                return { ...next, label: rebuildAbsolutoLabel(next) };
            }),
        );
    }

    // Duplica um absoluto AAMEP (gera novo id, mantém todos os dados).
    function duplicarAbsoluto(catId: string) {
        const novoId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setCategorias((prev) => {
            const idx = prev.findIndex((c) => c.id === catId);
            if (idx < 0) return prev;
            const orig = prev[idx];
            if (!orig.isAbsoluto || orig.federacao !== 'aamep') return prev;
            const novo: EventoCategoria = {
                ...orig,
                id: novoId,
                origemTemplateIds: [],
                weightName: `${orig.weightName} (cópia)`,
            };
            const novoComLabel = { ...novo, label: rebuildAbsolutoLabel(novo) };
            return [...prev.slice(0, idx + 1), novoComLabel, ...prev.slice(idx + 1)];
        });
        // Marca como "fresca" pra animar a entrada e destacar por ~2s
        setCategoriasFrescas((prev) => new Set(prev).add(novoId));
        window.setTimeout(() => {
            setCategoriasFrescas((prev) => {
                const next = new Set(prev);
                next.delete(novoId);
                return next;
            });
        }, 2200);
        // Scroll suave até a nova linha após o React montar
        window.setTimeout(() => {
            document.getElementById(`cat-row-${novoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    }

    function toggleBeltMassa(k: string) {
        setBeltsMassaAlvo((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }

    function toggleIdadeMassa(k: string) {
        setIdadesMassaAlvo((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }

    function aplicarMesclagemFaixasEmMassa() {
        if (!grupoAtivo || beltsMassaAlvo.size < 2) return;
        const snapshot = categorias;
        const r = mesclarFaixasEmMassa(categorias, [...beltsMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        setCategorias(r.categorias);
        setSelectedIds(new Set());
        const beltLabels = faixasIndividuaisNoEscopo
            .filter((f) => beltsMassaAlvo.has(f.key))
            .map((f) => f.label)
            .join(' + ');
        setBeltsMassaAlvo(new Set());
        if (r.mescladas === 0) {
            setUltimoResultado('Essas faixas não têm pesos coincidentes para juntar neste recorte.');
            return;
        }
        const resumo = `${r.mescladas} ${r.mescladas === 1 ? 'grupo' : 'grupos'} · ${r.afetadas} linhas`;
        pushLote('mesclar-faixa', `Mesclar ${beltLabels}`, resumo, snapshot);
        setUltimoResultado(`Pronto. ${beltLabels} viraram ${r.mescladas} ${r.mescladas === 1 ? 'lote único' : 'lotes únicos'} (${r.afetadas} linhas combinadas).`);
    }

    function toggleBeltDesativar(k: string) {
        setBeltsDesativarAlvo((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }

    function aplicarDesativacaoEmMassa() {
        if (!grupoAtivo || beltsDesativarAlvo.size === 0) return;
        const snapshot = categorias;
        const r = desativarFaixasEmMassa(categorias, [...beltsDesativarAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        setCategorias(r.categorias);
        const beltLabels = faixasIndividuaisNoEscopo
            .filter((f) => beltsDesativarAlvo.has(f.key))
            .map((f) => f.label)
            .join(' + ');
        setBeltsDesativarAlvo(new Set());
        if (r.afetadas === 0) {
            setUltimoResultado('Não havia categoria ativa tocando essas faixas neste recorte.');
            return;
        }
        pushLote('desativar', `Desativar ${beltLabels}`, `${r.afetadas} linhas`, snapshot);
        setUltimoResultado(`${beltLabels} ${r.afetadas === 1 ? 'desativada' : 'desativadas'} (${r.afetadas} ${r.afetadas === 1 ? 'linha' : 'linhas'}).`);
    }

    function aplicarReativacaoEmMassa() {
        if (!grupoAtivo || beltsDesativarAlvo.size === 0) return;
        const snapshot = categorias;
        const r = reativarFaixasEmMassa(categorias, [...beltsDesativarAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        setCategorias(r.categorias);
        const beltLabels = faixasIndividuaisNoEscopo
            .filter((f) => beltsDesativarAlvo.has(f.key))
            .map((f) => f.label)
            .join(' + ');
        setBeltsDesativarAlvo(new Set());
        if (r.afetadas === 0) {
            setUltimoResultado('Não havia categoria desativada tocando essas faixas neste recorte.');
            return;
        }
        pushLote('reativar', `Reativar ${beltLabels}`, `${r.afetadas} linhas`, snapshot);
        setUltimoResultado(`${beltLabels} ${r.afetadas === 1 ? 'reativada' : 'reativadas'} (${r.afetadas} ${r.afetadas === 1 ? 'linha' : 'linhas'}).`);
    }

    function aplicarMesclagemIdadesEmMassa() {
        if (!grupoAtivo || idadesMassaAlvo.size < 2) return;
        const snapshot = categorias;
        const r = mesclarIdadesEmMassa(categorias, [...idadesMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        setCategorias(r.categorias);
        setSelectedIds(new Set());
        const ageLabels = idadesIndividuaisNoEscopo
            .filter((a) => idadesMassaAlvo.has(a.key))
            .map((a) => a.label)
            .join(' + ');
        setIdadesMassaAlvo(new Set());
        if (r.mescladas === 0) {
            setUltimoResultado('Pesos divergem entre essas idades — tente "Unir pesos".');
            return;
        }
        pushLote('mesclar-idade', `Juntar ${ageLabels}`, `${r.mescladas} grupos · ${r.afetadas} linhas`, snapshot);
        setUltimoResultado(`${ageLabels} viraram ${r.mescladas} ${r.mescladas === 1 ? 'lote' : 'lotes'} (${r.afetadas} linhas combinadas).`);
    }

    function aplicarMesclagemIdadesUnindoPesos() {
        if (!grupoAtivo || idadesMassaAlvo.size < 2) return;
        const snapshot = categorias;
        const r = mesclarIdadesUnindoPesos(categorias, [...idadesMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        setCategorias(r.categorias);
        setSelectedIds(new Set());
        const ageLabels = idadesIndividuaisNoEscopo
            .filter((a) => idadesMassaAlvo.has(a.key))
            .map((a) => a.label)
            .join(' + ');
        setIdadesMassaAlvo(new Set());
        if (r.gruposCriados === 0) {
            setUltimoResultado('Não há linhas elegíveis pra unir nessas idades.');
            return;
        }
        pushLote('unir-pesos', `Unir pesos ${ageLabels}`, `${r.gruposCriados} faixas · ${r.afetadas} originais`, snapshot);
        setUltimoResultado(`${ageLabels} unidas em ${r.gruposCriados} ${r.gruposCriados === 1 ? 'faixa' : 'faixas'} (${r.afetadas} linhas originais combinadas em pesos novos).`);
    }

    function bucketKey(grupo: Grupo, isAbsoluto: boolean): string {
        return isAbsoluto ? `${grupo}-abs` : grupo;
    }

    function aplicarPrecoNoBucket(grupo: Grupo, isAbsoluto: boolean, label: string) {
        const k = bucketKey(grupo, isAbsoluto);
        const raw = (precosPorBucket[k] ?? '').trim();
        const v = raw === '' ? null : Number(raw.replace(',', '.'));
        if (v !== null && (Number.isNaN(v) || v < 0)) return;
        const snapshot = categorias;
        let afetadas = 0;
        setCategorias((prev) =>
            prev.map((c) => {
                if (c.grupo !== grupo) return c;
                if (c.isAbsoluto !== isAbsoluto) return c;
                if (!c.ativa) return c;
                afetadas += 1;
                return { ...c, valorInscricao: v };
            }),
        );
        if (afetadas === 0) {
            setUltimoResultado('Nenhuma categoria ativa neste bucket.');
            return;
        }
        const valorTxt = v === null ? 'sem valor' : `R$ ${v.toFixed(2).replace('.', ',')}`;
        pushLote('preco', `Preço ${label} = ${valorTxt}`, `${afetadas} linhas`, snapshot);
        setUltimoResultado(`${label}: ${afetadas} ${afetadas === 1 ? 'categoria' : 'categorias'} com ${valorTxt}.`);
    }

    function aplicarPrecosTodos() {
        const snapshot = categorias;
        let total = 0;
        setCategorias((prev) =>
            prev.map((c) => {
                if (!c.ativa) return c;
                const k = bucketKey(c.grupo, c.isAbsoluto);
                const raw = (precosPorBucket[k] ?? '').trim();
                if (raw === '') return c;
                const v = Number(raw.replace(',', '.'));
                if (Number.isNaN(v) || v < 0) return c;
                total += 1;
                return { ...c, valorInscricao: v };
            }),
        );
        if (total === 0) {
            setUltimoResultado('Nenhum bucket tem valor preenchido pra aplicar.');
            return;
        }
        pushLote('preco', 'Preços (todos os buckets preenchidos)', `${total} linhas`, snapshot);
        setUltimoResultado(`Preços aplicados em ${total} ${total === 1 ? 'categoria' : 'categorias'}.`);
    }

    // Recorte base (sem idade/faixa) — usado para gerar as opções dos sub-filtros
    const recorteBase = useMemo(() => {
        if (!grupoAtivo) return [];
        return categorias
            .filter((c) => c.grupo === grupoAtivo && c.genero === genero)
            .filter((c) => modalidadeAtiva === 'all' || c.modalidade === modalidadeAtiva);
    }, [categorias, grupoAtivo, genero, modalidadeAtiva]);

    // Idades distintas no recorte atual
    const idadesNoRecorte = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of recorteBase) {
            const k = c.ageKeys.join(',');
            const l = c.ageLabels.join('/');
            if (!map.has(k)) map.set(k, l);
        }
        return [...map.entries()].map(([key, label]) => ({ key, label }));
    }, [recorteBase]);

    // Faixas distintas no recorte atual (depois do filtro de idade)
    const faixasNoRecorte = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of recorteBase) {
            if (idadeAtiva !== 'all' && c.ageKeys.join(',') !== idadeAtiva) continue;
            const k = c.beltKeys.join(',') || '__sem-faixa__';
            const l = c.beltLabels.join('/') || 'Sem faixa';
            if (!map.has(k)) map.set(k, l);
        }
        return [...map.entries()].map(([key, label]) => ({ key, label }));
    }, [recorteBase, idadeAtiva]);

    // Faixas individuais — TODAS (inclui de linhas desativadas) → card de desativar/reativar
    const faixasIndividuaisNoEscopo = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of recorteBase) {
            for (let i = 0; i < c.beltKeys.length; i++) {
                const k = c.beltKeys[i];
                const l = c.beltLabels[i] ?? k;
                if (!map.has(k)) map.set(k, l);
            }
        }
        const order = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta'];
        return [...map.entries()]
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => {
                const ai = order.indexOf(a.key.toLowerCase().split('-')[0] ?? '');
                const bi = order.indexOf(b.key.toLowerCase().split('-')[0] ?? '');
                if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                return a.label.localeCompare(b.label);
            });
    }, [recorteBase]);

    // Faixas individuais — só de linhas ATIVAS, e exclui chips marcados pra desativar (preview)
    const faixasAtivasNoEscopo = useMemo(() => {
        const ativosKeys = new Set<string>();
        for (const c of recorteBase) if (c.ativa) for (const k of c.beltKeys) ativosKeys.add(k);
        return faixasIndividuaisNoEscopo
            .filter((f) => ativosKeys.has(f.key))
            .filter((f) => !beltsDesativarAlvo.has(f.key));
    }, [recorteBase, faixasIndividuaisNoEscopo, beltsDesativarAlvo]);

    // Idades individuais — só de linhas ATIVAS → mesclagem em massa (com anos)
    const idadesIndividuaisNoEscopo = useMemo(() => {
        const map = new Map<string, { label: string; years: string }>();
        for (const c of recorteBase) {
            if (!c.ativa) continue;
            for (let i = 0; i < c.ageKeys.length; i++) {
                const k = c.ageKeys[i];
                const l = c.ageLabels[i] ?? k;
                const y = c.ageYears?.[i] ?? '';
                if (!map.has(k)) map.set(k, { label: l, years: y });
            }
        }
        return [...map.entries()].map(([key, v]) => ({ key, label: v.label, years: v.years }));
    }, [recorteBase]);

    // Filtro final: recorte base + idade + faixa
    const filtered = useMemo(() => {
        return recorteBase
            .filter((c) => idadeAtiva === 'all' || c.ageKeys.join(',') === idadeAtiva)
            .filter((c) => {
                if (faixaAtiva === 'all') return true;
                if (faixaAtiva === '__sem-faixa__') return c.beltKeys.length === 0;
                return c.beltKeys.join(',') === faixaAtiva;
            })
            .sort(ordenar);
    }, [recorteBase, idadeAtiva, faixaAtiva]);

    const selecionadas = categorias.filter((c) => selectedIds.has(c.id));
    const podePorFaixa = podeMesclarPorFaixa(selecionadas);
    const podePorIdade = podeMesclarPorIdade(selecionadas);

    const stats = useMemo(() => {
        const total = filtered.length;
        const ativas = filtered.filter((c) => c.ativa).length;
        const desativadas = filtered.filter((c) => !c.ativa).length;
        const mescladas = filtered.filter((c) => c.origemTemplateIds.length > 1).length;
        const semFaixa = filtered.filter((c) => c.beltKeys.length === 0).length;
        const semValor = filtered.filter((c) => c.valorInscricao === null).length;
        return { total, ativas, desativadas, mescladas, semFaixa, semValor };
    }, [filtered]);

    // Master AAMEP só tem masculino
    const generoFFDisabled = federation === 'aamep' && grupoAtivo === 'master';

    // Grupos realmente presentes nas categorias (inclui 'absolutos' criado automaticamente)
    const gruposPresentes = useMemo(() => {
        const order: Grupo[] = ['adulto', 'juvenil', 'master', 'kids', 'absolutos'];
        const set = new Set<Grupo>();
        for (const c of categorias) set.add(c.grupo);
        return order.filter((g) => set.has(g));
    }, [categorias]);

    // Buckets de preço: pra cada grupo presente nas categorias, separa "com peso" e "absolutos"
    const bucketsPreco = useMemo(() => {
        const list: { key: string; grupo: Grupo; isAbsoluto: boolean; label: string; total: number }[] = [];
        const order: Grupo[] = ['adulto', 'juvenil', 'master', 'kids', 'absolutos'];
        const presentes = new Set<Grupo>();
        for (const c of categorias) presentes.add(c.grupo);
        const gruposOrdenados = order.filter((g) => presentes.has(g));
        for (const g of gruposOrdenados) {
            const comPeso = categorias.filter((c) => c.grupo === g && !c.isAbsoluto && c.ativa).length;
            const abs = categorias.filter((c) => c.grupo === g && c.isAbsoluto && c.ativa).length;
            if (comPeso > 0) {
                list.push({
                    key: bucketKey(g, false),
                    grupo: g,
                    isAbsoluto: false,
                    label: GRUPO_LABEL[g],
                    total: comPeso,
                });
            }
            if (abs > 0) {
                list.push({
                    key: bucketKey(g, true),
                    grupo: g,
                    isAbsoluto: true,
                    label: g === 'absolutos' ? 'Absolutos' : `${GRUPO_LABEL[g]} · Absolutos`,
                    total: abs,
                });
            }
        }
        return list;
    }, [categorias]);

    // Prévias (dry-run) — calculam o impacto antes do clique no CTA
    const previewDesativar = useMemo(() => {
        if (beltsDesativarAlvo.size === 0) return { aDesativar: 0, aReativar: 0 };
        const aDesativar = recorteBase.filter(
            (c) => c.ativa && c.beltKeys.some((k) => beltsDesativarAlvo.has(k)),
        ).length;
        const aReativar = recorteBase.filter(
            (c) => !c.ativa && c.beltKeys.some((k) => beltsDesativarAlvo.has(k)),
        ).length;
        return { aDesativar, aReativar };
    }, [recorteBase, beltsDesativarAlvo]);

    const previewMesclarFaixas = useMemo(() => {
        if (!grupoAtivo || beltsMassaAlvo.size < 2) return { mescladas: 0, afetadas: 0 };
        const r = mesclarFaixasEmMassa(categorias, [...beltsMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        return { mescladas: r.mescladas, afetadas: r.afetadas };
    }, [categorias, beltsMassaAlvo, grupoAtivo, genero, modalidadeAtiva]);

    const previewMesclarIdades = useMemo(() => {
        if (!grupoAtivo || idadesMassaAlvo.size < 2) return { mescladas: 0, afetadas: 0 };
        const r = mesclarIdadesEmMassa(categorias, [...idadesMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        return { mescladas: r.mescladas, afetadas: r.afetadas };
    }, [categorias, idadesMassaAlvo, grupoAtivo, genero, modalidadeAtiva]);

    const previewUnirPesos = useMemo(() => {
        if (!grupoAtivo || idadesMassaAlvo.size < 2) return { gruposCriados: 0, afetadas: 0 };
        const r = mesclarIdadesUnindoPesos(categorias, [...idadesMassaAlvo], {
            grupo: grupoAtivo,
            genero,
            modalidade: modalidadeAtiva,
        });
        return { gruposCriados: r.gruposCriados, afetadas: r.afetadas };
    }, [categorias, idadesMassaAlvo, grupoAtivo, genero, modalidadeAtiva]);

    const previewPrecosTotal = useMemo(() => {
        let total = 0;
        for (const c of categorias) {
            if (!c.ativa) continue;
            const k = bucketKey(c.grupo, c.isAbsoluto);
            const raw = (precosPorBucket[k] ?? '').trim();
            if (raw === '') continue;
            const v = Number(raw.replace(',', '.'));
            if (Number.isNaN(v) || v < 0) continue;
            total += 1;
        }
        return total;
    }, [categorias, precosPorBucket]);

    const beltLabelsMassaAlvo = faixasIndividuaisNoEscopo
        .filter((f) => beltsMassaAlvo.has(f.key))
        .map((f) => f.label);
    const beltLabelsDesativarAlvo = faixasIndividuaisNoEscopo
        .filter((f) => beltsDesativarAlvo.has(f.key))
        .map((f) => f.label);
    const ageLabelsMassaAlvo = idadesIndividuaisNoEscopo
        .filter((a) => idadesMassaAlvo.has(a.key))
        .map((a) => a.label);

    return (
        <div className="space-y-6">
            <style>{`
                @keyframes catRowFreshIn {
                    0%   { opacity: 0; transform: translateY(-12px) scale(0.96); }
                    60%  { opacity: 1; transform: translateY(2px) scale(1.02); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes catRowFreshPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb, 59 130 246) / 0.45); }
                    50%      { box-shadow: 0 0 0 12px rgba(var(--primary-rgb, 59 130 246) / 0); }
                }
                .cat-row-fresh {
                    animation: catRowFreshIn 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 0ms 1 both,
                               catRowFreshPulse 1200ms ease-out 420ms 2 both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .cat-row-fresh { animation: none; }
                }
            `}</style>
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b px-6 py-5 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <StackIcon size={26} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base uppercase tracking-[0.12em] text-primary font-bold">Comece por aqui</p>
                        <h2 className="text-xl font-bold leading-tight mt-0.5">
                            Clone um template de federação
                        </h2>
                        <p className="text-base text-muted-foreground mt-1 leading-snug">
                            Você parte das categorias oficiais e depois ajusta tudo para o seu evento — desativa o que não tem,
                            mescla grupos, define faixas dos absolutos e os valores de inscrição.
                        </p>
                    </div>
                </div>

                <CardContent className="px-6 py-6 space-y-6">
                    <NumberedStep step={1} title="Escolha a federação">
                        <div className="grid gap-3 md:grid-cols-2">
                            <FederationCard
                                active={federation === 'ibjjf'}
                                onClick={() => pickFederation('ibjjf')}
                                label="IBJJF / CBJJ"
                                sub="Adulto · Juvenil · Master · Kids"
                                tag="Gi e No-Gi"
                                icon={<ShieldCheckIcon size={28} weight="duotone" />}
                            />
                            <FederationCard
                                active={federation === 'aamep'}
                                onClick={() => pickFederation('aamep')}
                                label="AAMEP"
                                sub="Adulto · Juvenil · Master · Kids · Absolutos"
                                tag="Só Gi"
                                icon={<TrophyIcon size={28} weight="duotone" />}
                            />
                        </div>
                    </NumberedStep>

                    {federation && (
                        <NumberedStep step={2} title="Defina modalidades e grupos">
                            <div className="space-y-4">
                                {federation === 'ibjjf' && (
                                    <div>
                                        <p className="text-base font-semibold text-muted-foreground mb-2">Modalidades</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {(['gi', 'nogi'] as const).map((m) => (
                                                <PickerChip
                                                    key={m}
                                                    on={modalidades.has(m)}
                                                    onClick={() => toggleModalidade(m)}
                                                    label={m === 'gi' ? 'Kimono (Gi)' : 'No-Gi'}
                                                />
                                            ))}
                                            <span className="text-base text-muted-foreground ml-1">
                                                Pode marcar as duas.
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {federation === 'aamep' && (
                                    <div>
                                        <p className="text-base font-semibold text-muted-foreground mb-2">Modalidade</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border bg-muted text-base font-semibold text-muted-foreground">
                                                <CheckIcon size={16} weight="bold" /> Kimono
                                            </span>
                                            <span className="text-base text-muted-foreground">AAMEP não tem No-Gi.</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-base font-semibold text-muted-foreground">Grupos para clonar</p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                grupos.size === gruposDisponiveis.length
                                                    ? setGrupos(new Set())
                                                    : setGrupos(new Set(gruposDisponiveis))
                                            }
                                            className="text-base font-semibold text-primary hover:underline"
                                        >
                                            {grupos.size === gruposDisponiveis.length ? 'limpar' : 'selecionar todos'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {gruposDisponiveis.map((g) => (
                                            <PickerChip
                                                key={g}
                                                on={grupos.has(g)}
                                                onClick={() => toggleGrupo(g)}
                                                label={GRUPO_LABEL[g]}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </NumberedStep>
                    )}

                    {federation && (
                        <NumberedStep step={3} title="Clone o template">
                            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                        <UsersThreeIcon size={22} weight="duotone" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-bold leading-tight">
                                            {grupos.size === 0
                                                ? 'Selecione ao menos 1 grupo acima'
                                                : `Vai clonar ${grupos.size} ${grupos.size === 1 ? 'grupo' : 'grupos'} de ${federation === 'ibjjf' ? 'IBJJF/CBJJ' : 'AAMEP'}`}
                                        </p>
                                        {loadedFor && (
                                            <p className="text-base text-muted-foreground mt-0.5">
                                                Hoje carregado:{' '}
                                                <strong className="text-foreground">
                                                    {loadedFor.federacao.toUpperCase()} ·{' '}
                                                    {loadedFor.modalidades.map((m) => (m === 'gi' ? 'Gi' : 'No-Gi')).join(' + ')}
                                                </strong>{' '}
                                                · {categorias.length} categorias
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    pill
                                    size="lg"
                                    onClick={clonarTemplate}
                                    disabled={grupos.size === 0}
                                    className="gap-2 h-12 px-6 text-base font-bold shadow-md shrink-0"
                                >
                                    {categorias.length === 0 ? (
                                        <><LinkIcon size={18} weight="duotone" /> Clonar template</>
                                    ) : (
                                        <><ArrowCounterClockwiseIcon size={18} weight="duotone" /> Reclonar (descarta alterações)</>
                                    )}
                                </Button>
                            </div>
                        </NumberedStep>
                    )}
                </CardContent>
            </Card>

            {categorias.length > 0 && grupoAtivo && (
                <>
                    <Card>
                        <CardContent className="py-4 space-y-4">
                            <div>
                                <p className="text-base uppercase tracking-wide text-muted-foreground font-semibold">Passo 2</p>
                                <h3 className="text-lg font-bold leading-tight mt-0.5">
                                    Edite as categorias deste evento
                                </h3>
                                <p className="text-base text-muted-foreground mt-1">
                                    Navegue pelos grupos clonados, desative o que não vai existir, mescle quando fizer sentido,
                                    atribua faixas aos absolutos e defina os valores de inscrição.
                                </p>
                            </div>

                            {/* Tabs por grupo — destaque grande, primeira escolha */}
                            <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
                                {gruposPresentes.map((g) => {
                                    const on = grupoAtivo === g;
                                    const count = categorias.filter((c) => c.grupo === g).length;
                                    return (
                                        <button
                                            key={g}
                                            onClick={() => changeGrupoAtivo(g)}
                                            aria-pressed={on}
                                            className={cn(
                                                'inline-flex items-center gap-2 h-10 px-4 rounded-full border-2 text-base font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                                on
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/40',
                                            )}
                                        >
                                            {GRUPO_LABEL[g]}
                                            <span className={cn(
                                                'text-base tabular-nums rounded-full px-2 py-0.5',
                                                on ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                                            )}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bloco Gênero + Stats — duas colunas no desktop */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-base uppercase tracking-wide text-muted-foreground font-bold mb-1.5">Gênero</p>
                                    <div className="inline-flex rounded-full border-2 bg-background p-1 shadow-sm">
                                        {(['masculino', 'feminino'] as const).map((g) => {
                                            const disabled = g === 'feminino' && generoFFDisabled;
                                            return (
                                                <button
                                                    key={g}
                                                    onClick={() => !disabled && changeGenero(g)}
                                                    disabled={disabled}
                                                    className={cn(
                                                        'px-5 h-9 text-base font-bold rounded-full transition-all capitalize',
                                                        genero === g
                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                            : 'text-muted-foreground hover:text-foreground',
                                                        disabled && 'opacity-40 cursor-not-allowed',
                                                    )}
                                                >
                                                    {g}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <StatBadge label="Total" value={stats.total} />
                                    <StatBadge label="Ativas" value={stats.ativas} tone="green" />
                                    <StatBadge label="Desativadas" value={stats.desativadas} tone="muted" />
                                    <StatBadge label="Mescladas" value={stats.mescladas} tone="amber" />
                                    {stats.semFaixa > 0 && (
                                        <StatBadge label="Sem faixa" value={stats.semFaixa} tone="rose" />
                                    )}
                                    {stats.semValor > 0 && (
                                        <StatBadge label="Sem valor" value={stats.semValor} tone="rose" />
                                    )}
                                </div>
                            </div>

                            {/* Filtros refinados — agrupados em card sutil */}
                            {((loadedFor?.modalidades.length ?? 0) > 1 || idadesNoRecorte.length > 1 || faixasNoRecorte.length > 1) && (
                                <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <p className="text-base uppercase tracking-wide text-muted-foreground font-bold">Filtrar lista</p>
                                        <span className="text-base text-muted-foreground">(opcional, refina o que aparece abaixo)</span>
                                    </div>

                                    {(loadedFor?.modalidades.length ?? 0) > 1 && (
                                        <FilterRow label="Modalidade">
                                            {(['all', 'gi', 'nogi'] as const).map((m) => {
                                                const on = modalidadeAtiva === m;
                                                const count =
                                                    m === 'all'
                                                        ? categorias.filter((c) => c.grupo === grupoAtivo).length
                                                        : categorias.filter((c) => c.grupo === grupoAtivo && c.modalidade === m).length;
                                                return (
                                                    <FilterChip
                                                        key={m}
                                                        on={on}
                                                        onClick={() => changeModalidadeAtiva(m)}
                                                        label={m === 'all' ? 'Todas' : m === 'gi' ? 'Kimono' : 'No-Gi'}
                                                        count={count}
                                                    />
                                                );
                                            })}
                                        </FilterRow>
                                    )}

                                    {idadesNoRecorte.length > 1 && (
                                        <FilterRow label="Idade">
                                            <FilterChip
                                                on={idadeAtiva === 'all'}
                                                onClick={() => changeIdadeAtiva('all')}
                                                label="Todas"
                                                count={recorteBase.length}
                                            />
                                            {idadesNoRecorte.map((a) => {
                                                const on = idadeAtiva === a.key;
                                                const count = recorteBase.filter((c) => c.ageKeys.join(',') === a.key).length;
                                                return (
                                                    <FilterChip
                                                        key={a.key}
                                                        on={on}
                                                        onClick={() => changeIdadeAtiva(a.key)}
                                                        label={a.label}
                                                        count={count}
                                                    />
                                                );
                                            })}
                                        </FilterRow>
                                    )}

                                    {faixasNoRecorte.length > 1 && (
                                        <FilterRow label="Faixa">
                                            <FilterChip
                                                on={faixaAtiva === 'all'}
                                                onClick={() => setFaixaAtiva('all')}
                                                label="Todas"
                                            />
                                            {faixasNoRecorte.map((f) => {
                                                const on = faixaAtiva === f.key;
                                                const count = recorteBase.filter((c) => {
                                                    if (idadeAtiva !== 'all' && c.ageKeys.join(',') !== idadeAtiva) return false;
                                                    if (f.key === '__sem-faixa__') return c.beltKeys.length === 0;
                                                    return c.beltKeys.join(',') === f.key;
                                                }).length;
                                                return (
                                                    <FilterChip
                                                        key={f.key}
                                                        on={on}
                                                        onClick={() => setFaixaAtiva(f.key)}
                                                        label={f.label}
                                                        count={count}
                                                    />
                                                );
                                            })}
                                        </FilterRow>
                                    )}
                                </div>
                            )}

                            {/* === Painel de Operações em Massa (preços, desativar, mesclar) === */}
                            <OperacoesPanel
                                opTab={opTab}
                                setOpTab={setOpTab}
                                grupoAtivo={grupoAtivo}
                                genero={genero}
                                modalidadeAtiva={modalidadeAtiva}

                                // Preços
                                bucketsPreco={bucketsPreco}
                                precosPorBucket={precosPorBucket}
                                setPrecosPorBucket={setPrecosPorBucket}
                                aplicarPrecoNoBucket={aplicarPrecoNoBucket}
                                aplicarPrecosTodos={aplicarPrecosTodos}
                                previewPrecosTotal={previewPrecosTotal}

                                // Desativar
                                faixasIndividuaisNoEscopo={faixasIndividuaisNoEscopo}
                                beltsDesativarAlvo={beltsDesativarAlvo}
                                toggleBeltDesativar={toggleBeltDesativar}
                                setBeltsDesativarAlvo={setBeltsDesativarAlvo}
                                aplicarDesativacaoEmMassa={aplicarDesativacaoEmMassa}
                                aplicarReativacaoEmMassa={aplicarReativacaoEmMassa}
                                previewDesativar={previewDesativar}
                                beltLabelsDesativarAlvo={beltLabelsDesativarAlvo}

                                // Mesclar
                                faixasAtivasNoEscopo={faixasAtivasNoEscopo}
                                beltsMassaAlvo={beltsMassaAlvo}
                                toggleBeltMassa={toggleBeltMassa}
                                setBeltsMassaAlvo={setBeltsMassaAlvo}
                                aplicarMesclagemFaixasEmMassa={aplicarMesclagemFaixasEmMassa}
                                previewMesclarFaixas={previewMesclarFaixas}
                                beltLabelsMassaAlvo={beltLabelsMassaAlvo}

                                idadesIndividuaisNoEscopo={idadesIndividuaisNoEscopo}
                                idadesMassaAlvo={idadesMassaAlvo}
                                toggleIdadeMassa={toggleIdadeMassa}
                                setIdadesMassaAlvo={setIdadesMassaAlvo}
                                aplicarMesclagemIdadesEmMassa={aplicarMesclagemIdadesEmMassa}
                                aplicarMesclagemIdadesUnindoPesos={aplicarMesclagemIdadesUnindoPesos}
                                previewMesclarIdades={previewMesclarIdades}
                                previewUnirPesos={previewUnirPesos}
                                ageLabelsMassaAlvo={ageLabelsMassaAlvo}

                                ultimoResultado={ultimoResultado}
                                setUltimoResultado={setUltimoResultado}

                                lotesAplicados={lotesAplicados}
                                desfazerLote={desfazerLote}
                            />

                            {selecionadas.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                                    <span className="text-base font-semibold">
                                        {selecionadas.length} {selecionadas.length === 1 ? 'selecionada' : 'selecionadas'}
                                    </span>
                                    <Button
                                        type="button"
                                        pill
                                        size="sm"
                                        disabled={!podePorFaixa}
                                        onClick={() => mesclar('faixa')}
                                        className="gap-1.5"
                                    >
                                        Mesclar por faixa
                                    </Button>
                                    <Button
                                        type="button"
                                        pill
                                        size="sm"
                                        variant="secondary"
                                        disabled={!podePorIdade}
                                        onClick={() => mesclar('idade')}
                                        className="gap-1.5"
                                    >
                                        Mesclar por idade
                                    </Button>
                                    <Button type="button" pill size="sm" variant="outline" onClick={limparSelecao}>
                                        Limpar seleção
                                    </Button>
                                    {!podePorFaixa && !podePorIdade && (
                                        <span className="text-base text-muted-foreground">
                                            Mesma fatia: gênero + peso + (idade ou faixa). Modalidade e grupo precisam coincidir.
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                {filtered.map((c) => (
                                    <CategoriaRow
                                        key={c.id}
                                        cat={c}
                                        selected={selectedIds.has(c.id)}
                                        fresh={categoriasFrescas.has(c.id)}
                                        onToggleSelected={() => toggleSelected(c.id)}
                                        onToggleAtiva={() => toggleAtiva(c.id)}
                                        onDesfazer={() => desfazerMesclagem(c.id)}
                                        onSetValor={(v) => setValor(c.id, v)}
                                        onToggleAbsolutoBelt={(beltKey, beltLabel) => toggleAbsolutoBelt(c.id, beltKey, beltLabel)}
                                        onSalvarAbsolutoEdit={(patch) => salvarAbsolutoEdit(c.id, patch)}
                                        onDuplicarAbsoluto={() => duplicarAbsoluto(c.id)}
                                    />
                                ))}
                                {filtered.length === 0 && (
                                    <div className="text-center py-8 text-base text-muted-foreground border-2 border-dashed rounded-2xl">
                                        Nenhuma categoria neste recorte.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="py-4 text-base text-muted-foreground space-y-1">
                            <p className="flex items-center gap-2">
                                <CheckCircleIcon size={14} weight="duotone" className="text-primary" /> Estado em memória —
                                recarregar a página descarta tudo.
                            </p>
                            <p>
                                Próxima fase: persistir em banco (migração própria). Aqui você está validando UX, regras de mesclagem,
                                faixas dinâmicas dos absolutos e valores de inscrição.
                            </p>
                            <p>
                                Evento: <code className="px-1.5 py-0.5 rounded bg-muted">{eventId}</code> · {eventTitle}
                            </p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

const BELT_ORDER = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta'];

function ordenar(a: EventoCategoria, b: EventoCategoria): number {
    const ai = BELT_ORDER.indexOf(a.beltKeys[0] ?? '');
    const bi = BELT_ORDER.indexOf(b.beltKeys[0] ?? '');
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    if (a.pesoMin !== b.pesoMin) return a.pesoMin - b.pesoMin;
    return a.ageKeys.join(',').localeCompare(b.ageKeys.join(','));
}

function CategoriaRow({
    cat,
    selected,
    fresh,
    onToggleSelected,
    onToggleAtiva,
    onDesfazer,
    onSetValor,
    onToggleAbsolutoBelt,
    onSalvarAbsolutoEdit,
    onDuplicarAbsoluto,
}: {
    cat: EventoCategoria;
    selected: boolean;
    fresh?: boolean;
    onToggleSelected: () => void;
    onToggleAtiva: () => void;
    onDesfazer: () => void;
    onSetValor: (v: number | null) => void;
    onToggleAbsolutoBelt?: (beltKey: string, beltLabel: string) => void;
    onSalvarAbsolutoEdit?: (patch: Partial<Pick<EventoCategoria, 'weightName' | 'range' | 'pesoMin' | 'pesoMax' | 'fightTime'>>) => void;
    onDuplicarAbsoluto?: () => void;
}) {
    const mesclada = cat.origemTemplateIds.length > 1;
    const semFaixa = cat.beltKeys.length === 0;
    const beltOptions = cat.isAbsoluto ? faixasDisponiveis(cat) : [];
    const aamepAbsoluto = cat.isAbsoluto && cat.federacao === 'aamep';

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        weightName: cat.weightName,
        range: cat.range,
        pesoMin: cat.pesoMin,
        pesoMax: cat.pesoMax,
        fightTime: cat.fightTime,
    });

    function abrirEdicao() {
        setDraft({
            weightName: cat.weightName,
            range: cat.range,
            pesoMin: cat.pesoMin,
            pesoMax: cat.pesoMax,
            fightTime: cat.fightTime,
        });
        setEditing(true);
    }

    function salvar() {
        onSalvarAbsolutoEdit?.(draft);
        setEditing(false);
    }

    return (
        <div
            id={`cat-row-${cat.id}`}
            className={cn(
                'rounded-2xl border transition-all',
                !cat.ativa && 'opacity-60 bg-muted/40',
                selected && 'border-primary bg-primary/5',
                !selected && cat.ativa && 'bg-card hover:bg-muted/30',
                semFaixa && cat.ativa && !selected && 'border-rose-500/40 bg-rose-500/5',
                fresh && 'cat-row-fresh ring-4 ring-primary/40 border-primary shadow-lg shadow-primary/20 bg-primary/5',
            )}
        >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelected}
                    className="h-5 w-5 accent-primary cursor-pointer"
                    aria-label="Selecionar para mesclar"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold leading-tight truncate">{cat.label}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(cat.ageYears?.length ?? 0) > 0 && (
                            <Badge
                                variant="outline"
                                className="text-base px-2.5 py-0.5 rounded-full bg-sky-500/10 border-sky-500/30 text-sky-700"
                            >
                                {cat.ageYears!.join(' / ')}
                            </Badge>
                        )}
                        {cat.beltLabels.map((bl) => (
                            <Badge
                                key={bl}
                                variant="outline"
                                className="text-base px-2.5 py-0.5 rounded-full"
                                style={getBeltStyle(bl)}
                            >
                                {bl}
                            </Badge>
                        ))}
                        {cat.beltLabels.length === 0 && (
                            <Badge className="text-base px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 border-rose-500/30">
                                Sem faixa
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-base px-2.5 py-0.5 rounded-full">
                            {cat.weightName} · {cat.range}
                        </Badge>
                        {cat.isAbsoluto && (
                            <Badge className="text-base px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 border-violet-500/30">
                                Absoluto
                            </Badge>
                        )}
                        {mesclada && (
                            <Badge className="text-base px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border-amber-500/30">
                                Mesclada ({cat.origemTemplateIds.length})
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Valor */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-base uppercase tracking-wide text-muted-foreground font-semibold">R$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="—"
                        value={cat.valorInscricao === null ? '' : String(cat.valorInscricao).replace('.', ',')}
                        onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (raw === '') return onSetValor(null);
                            const n = Number(raw.replace(',', '.'));
                            if (!Number.isNaN(n) && n >= 0) onSetValor(n);
                        }}
                        className="h-10 w-24 rounded-full border bg-background px-3 text-base tabular-nums focus-visible:outline-none focus-visible:border-ring"
                    />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {mesclada && (
                        <Button
                            type="button"
                            variant="outline"
                            pill
                            onClick={onDesfazer}
                            className="gap-1.5 text-base h-10 px-4"
                        >
                            <TrashIcon size={16} weight="duotone" />
                            Desfazer
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant={cat.ativa ? 'outline' : 'secondary'}
                        pill
                        onClick={onToggleAtiva}
                        className="gap-1.5 text-base h-10 px-4"
                    >
                        {cat.ativa ? (
                            <>
                                <EyeIcon size={16} weight="duotone" />
                                Ativa
                            </>
                        ) : (
                            <>
                                <EyeSlashIcon size={16} weight="duotone" />
                                Desativada
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {cat.isAbsoluto && onToggleAbsolutoBelt && beltOptions.length > 0 && (
                <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base uppercase tracking-wide text-muted-foreground font-bold mr-1">
                            Faixas que disputam:
                        </span>
                        {beltOptions.map((b) => {
                            const on = cat.beltKeys.includes(b.key);
                            return (
                                <button
                                    key={b.key}
                                    type="button"
                                    onClick={() => onToggleAbsolutoBelt(b.key, b.label)}
                                    aria-pressed={on}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 text-base font-semibold transition-all active:scale-95',
                                        on
                                            ? 'border-primary shadow-sm'
                                            : 'border-border bg-background hover:border-primary/40',
                                    )}
                                    style={on ? getBeltStyle(b.label) : undefined}
                                >
                                    {on && <CheckIcon size={14} weight="bold" />}
                                    {b.label}
                                </button>
                            );
                        })}
                    </div>

                    {aamepAbsoluto && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                            {!editing && (
                                <>
                                    <Button type="button" variant="outline" pill onClick={abrirEdicao} className="h-9 px-3 text-base gap-1.5">
                                        <SparkleIcon size={14} weight="duotone" />
                                        Editar absoluto
                                    </Button>
                                    {onDuplicarAbsoluto && (
                                        <Button type="button" variant="outline" pill onClick={onDuplicarAbsoluto} className="h-9 px-3 text-base gap-1.5">
                                            <StackIcon size={14} weight="duotone" />
                                            Duplicar
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {aamepAbsoluto && editing && (
                        <div className="rounded-2xl border-2 border-primary/30 bg-background p-4 space-y-3">
                            <p className="text-base font-bold">Editar dados do absoluto</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-base font-bold text-muted-foreground">Nome do peso</span>
                                    <input
                                        type="text"
                                        value={draft.weightName}
                                        onChange={(e) => setDraft({ ...draft, weightName: e.target.value })}
                                        placeholder="Ex: Médio, Sem limite"
                                        className="w-full h-10 rounded-full border-2 px-3 text-base bg-background focus:outline-none focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-base font-bold text-muted-foreground">Faixa de peso (display)</span>
                                    <input
                                        type="text"
                                        value={draft.range}
                                        onChange={(e) => setDraft({ ...draft, range: e.target.value })}
                                        placeholder="Ex: 76,0 – 82,3 kg"
                                        className="w-full h-10 rounded-full border-2 px-3 text-base bg-background focus:outline-none focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-base font-bold text-muted-foreground">Peso mínimo (kg)</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={draft.pesoMin}
                                        onChange={(e) => setDraft({ ...draft, pesoMin: Number(e.target.value) })}
                                        className="w-full h-10 rounded-full border-2 px-3 text-base bg-background focus:outline-none focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-base font-bold text-muted-foreground">Peso máximo (kg, vazio = sem limite)</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={draft.pesoMax ?? ''}
                                        onChange={(e) => setDraft({ ...draft, pesoMax: e.target.value === '' ? null : Number(e.target.value) })}
                                        className="w-full h-10 rounded-full border-2 px-3 text-base bg-background focus:outline-none focus:border-primary"
                                    />
                                </label>
                                <label className="space-y-1 sm:col-span-2">
                                    <span className="text-base font-bold text-muted-foreground">Tempo de luta</span>
                                    <input
                                        type="text"
                                        value={draft.fightTime}
                                        onChange={(e) => setDraft({ ...draft, fightTime: e.target.value })}
                                        placeholder="Ex: 6 min"
                                        className="w-full h-10 rounded-full border-2 px-3 text-base bg-background focus:outline-none focus:border-primary"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                <Button type="button" pill onClick={salvar} className="h-10 px-5 text-base font-bold gap-1.5">
                                    <CheckIcon size={16} weight="bold" />
                                    Salvar alterações
                                </Button>
                                <Button type="button" variant="outline" pill onClick={() => setEditing(false)} className="h-10 px-5 text-base">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FederationCard({
    active,
    onClick,
    label,
    sub,
    tag,
    icon,
    disabled,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    sub: string;
    tag?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                'group relative flex items-start gap-4 p-5 rounded-3xl border-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm',
                disabled && 'opacity-50 cursor-not-allowed',
            )}
        >
            {active && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-base font-bold uppercase tracking-wide text-primary bg-primary/15 rounded-full px-2 py-0.5">
                    <CheckIcon size={12} weight="bold" /> Selecionado
                </span>
            )}
            <div
                className={cn(
                    'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                )}
            >
                {icon ?? <BuildingsIcon size={28} weight="duotone" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold leading-tight">{label}</p>
                    {tag && (
                        <span className={cn(
                            'text-base font-bold uppercase tracking-wide rounded-full px-2 py-0.5',
                            active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                            {tag}
                        </span>
                    )}
                </div>
                <p className="text-base text-muted-foreground mt-1.5 leading-snug">{sub}</p>
            </div>
        </button>
    );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-start gap-2">
            <span className="inline-flex items-center h-9 text-base uppercase tracking-wide text-muted-foreground font-bold shrink-0 min-w-[72px]">
                {label}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">{children}</div>
        </div>
    );
}

function FilterChip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count?: number }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={on}
            className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-base font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                on
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/40',
            )}
        >
            <span>{label}</span>
            {count !== undefined && (
                <span className={cn(
                    'text-base tabular-nums rounded-full px-1.5 py-0',
                    on ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}

function PickerChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={on}
            className={cn(
                'inline-flex items-center gap-1.5 h-11 px-4 rounded-full border-2 text-base font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                on
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/40',
            )}
        >
            {on && <CheckIcon size={14} weight="bold" />}
            {label}
        </button>
    );
}

function StatBadge({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: number;
    tone?: 'default' | 'green' | 'muted' | 'amber' | 'rose';
}) {
    const toneClass: Record<string, string> = {
        default: 'bg-background border-border text-foreground',
        green: 'bg-green-500/10 border-green-500/30 text-green-700',
        muted: 'bg-muted border-border text-muted-foreground',
        amber: 'bg-amber-500/15 border-amber-500/30 text-amber-700',
        rose: 'bg-rose-500/10 border-rose-500/30 text-rose-700',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold',
                toneClass[tone],
            )}
        >
            <span className="opacity-70">{label}</span>
            <span className="tabular-nums">{value}</span>
        </span>
    );
}

function NumberedStep({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background text-base font-bold tabular-nums">
                    {step}
                </span>
                <span className="text-base font-bold">{title}</span>
            </div>
            <div className="pl-8">{children}</div>
        </div>
    );
}

function BeltChip({
    label,
    on,
    onClick,
    accent,
}: {
    label: string;
    on: boolean;
    onClick: () => void;
    accent: 'rose' | 'sky';
}) {
    const ringOn = accent === 'rose' ? 'ring-rose-500/40' : 'ring-sky-500/40';
    const borderOn = accent === 'rose' ? 'border-rose-700' : 'border-sky-700';
    const bgOn = accent === 'rose' ? 'bg-rose-600' : 'bg-sky-600';
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'h-11 px-4 rounded-full border-2 text-base font-bold transition-all flex items-center gap-1.5 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                accent === 'rose' ? 'focus-visible:ring-rose-500/40' : 'focus-visible:ring-sky-500/40',
                on
                    ? `${bgOn} text-white ${borderOn} ring-2 ${ringOn}`
                    : 'bg-background text-foreground border-border hover:brightness-95',
            )}
            style={!on ? getBeltStyle(label) : undefined}
            aria-pressed={on}
        >
            {on && <CheckIcon size={14} weight="bold" />}
            {label}
        </button>
    );
}

type Preview2 = { mescladas: number; afetadas: number };
type PreviewUnir = { gruposCriados: number; afetadas: number };
type PreviewDes = { aDesativar: number; aReativar: number };
type Bucket = { key: string; grupo: Grupo; isAbsoluto: boolean; label: string; total: number };
type ChipItem = { key: string; label: string };
type AgeChip = ChipItem & { years: string };
type Lote = {
    id: string;
    tipo: 'preco' | 'desativar' | 'reativar' | 'mesclar-faixa' | 'mesclar-idade' | 'unir-pesos';
    label: string;
    resumo: string;
    snapshot: EventoCategoria[];
};

function OperacoesPanel(props: {
    opTab: 'precos' | 'desativar' | 'mesclar';
    setOpTab: (t: 'precos' | 'desativar' | 'mesclar') => void;
    grupoAtivo: Grupo;
    genero: Genero;
    modalidadeAtiva: Modalidade | 'all';

    bucketsPreco: Bucket[];
    precosPorBucket: Record<string, string>;
    setPrecosPorBucket: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    aplicarPrecoNoBucket: (g: Grupo, isAbs: boolean, label: string) => void;
    aplicarPrecosTodos: () => void;
    previewPrecosTotal: number;

    faixasIndividuaisNoEscopo: ChipItem[];
    beltsDesativarAlvo: Set<string>;
    toggleBeltDesativar: (k: string) => void;
    setBeltsDesativarAlvo: React.Dispatch<React.SetStateAction<Set<string>>>;
    aplicarDesativacaoEmMassa: () => void;
    aplicarReativacaoEmMassa: () => void;
    previewDesativar: PreviewDes;
    beltLabelsDesativarAlvo: string[];

    faixasAtivasNoEscopo: ChipItem[];
    beltsMassaAlvo: Set<string>;
    toggleBeltMassa: (k: string) => void;
    setBeltsMassaAlvo: React.Dispatch<React.SetStateAction<Set<string>>>;
    aplicarMesclagemFaixasEmMassa: () => void;
    previewMesclarFaixas: Preview2;
    beltLabelsMassaAlvo: string[];

    idadesIndividuaisNoEscopo: AgeChip[];
    idadesMassaAlvo: Set<string>;
    toggleIdadeMassa: (k: string) => void;
    setIdadesMassaAlvo: React.Dispatch<React.SetStateAction<Set<string>>>;
    aplicarMesclagemIdadesEmMassa: () => void;
    aplicarMesclagemIdadesUnindoPesos: () => void;
    previewMesclarIdades: Preview2;
    previewUnirPesos: PreviewUnir;
    ageLabelsMassaAlvo: string[];

    ultimoResultado: string | null;
    setUltimoResultado: (s: string | null) => void;

    lotesAplicados: Lote[];
    desfazerLote: (id: string) => void;
}) {
    const {
        opTab, setOpTab, grupoAtivo, genero, modalidadeAtiva,
        bucketsPreco, precosPorBucket, setPrecosPorBucket, aplicarPrecoNoBucket, aplicarPrecosTodos, previewPrecosTotal,
        faixasIndividuaisNoEscopo, beltsDesativarAlvo, toggleBeltDesativar, setBeltsDesativarAlvo,
        aplicarDesativacaoEmMassa, aplicarReativacaoEmMassa, previewDesativar, beltLabelsDesativarAlvo,
        faixasAtivasNoEscopo, beltsMassaAlvo, toggleBeltMassa, setBeltsMassaAlvo,
        aplicarMesclagemFaixasEmMassa, previewMesclarFaixas, beltLabelsMassaAlvo,
        idadesIndividuaisNoEscopo, idadesMassaAlvo, toggleIdadeMassa, setIdadesMassaAlvo,
        aplicarMesclagemIdadesEmMassa, aplicarMesclagemIdadesUnindoPesos,
        previewMesclarIdades, previewUnirPesos, ageLabelsMassaAlvo,
        ultimoResultado, setUltimoResultado,
        lotesAplicados, desfazerLote,
    } = props;

    const escopoLabel = `${GRUPO_LABEL[grupoAtivo]} ${genero === 'masculino' ? 'M' : 'F'}${
        modalidadeAtiva !== 'all' ? ` · ${modalidadeAtiva === 'gi' ? 'Kimono' : 'No-Gi'}` : ''
    }`;

    const tabs: Array<{ key: 'precos' | 'desativar' | 'mesclar'; label: string; icon: typeof CurrencyDollarIcon; accent: 'emerald' | 'rose' | 'sky' }> = [
        { key: 'precos', label: 'Preços', icon: CurrencyDollarIcon, accent: 'emerald' },
        { key: 'desativar', label: 'Desativar faixas', icon: ProhibitIcon, accent: 'rose' },
        { key: 'mesclar', label: 'Mesclar em massa', icon: SparkleIcon, accent: 'sky' },
    ];

    const tabActiveClass = (accent: 'emerald' | 'rose' | 'sky'): string => {
        if (accent === 'emerald') return 'border-emerald-500 bg-emerald-500/5 text-emerald-700';
        if (accent === 'rose') return 'border-rose-500 bg-rose-500/5 text-rose-700';
        return 'border-sky-500 bg-sky-500/5 text-sky-700';
    };

    return (
        <div className="rounded-3xl border-2 border-border bg-background overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="grid grid-cols-3 border-b" role="tablist">
                {tabs.map((t) => {
                    const on = opTab === t.key;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setOpTab(t.key)}
                            className={cn(
                                'flex items-center justify-center gap-2 py-3.5 px-3 text-base font-bold transition-all border-b-2 -mb-[2px]',
                                on
                                    ? tabActiveClass(t.accent)
                                    : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                            )}
                        >
                            <Icon size={18} weight="duotone" />
                            <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="p-5 space-y-5">
                {opTab === 'precos' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CurrencyDollarIcon size={28} weight="duotone" className="text-emerald-600 shrink-0" />
                            <div>
                                <h4 className="text-lg font-bold leading-tight">Defina os preços base</h4>
                                <p className="text-base text-muted-foreground mt-0.5">
                                    Coloque o valor uma vez por bucket — aplica em todas as ativas. Pode ajustar linha por linha depois.
                                </p>
                            </div>
                        </div>

                        <NumberedStep step={1} title="Preencha o valor em cada bucket">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {bucketsPreco.map((b) => {
                                    const preenchido = (precosPorBucket[b.key] ?? '').trim() !== '';
                                    return (
                                        <div
                                            key={b.key}
                                            className={cn(
                                                'rounded-2xl border-2 bg-background p-3 space-y-2 transition-all',
                                                preenchido
                                                    ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                                                    : b.isAbsoluto ? 'border-violet-500/30' : 'border-border',
                                            )}
                                        >
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="text-base font-bold truncate">{b.label}</span>
                                                <Badge variant="outline" className="text-base shrink-0">
                                                    {b.total} {b.total === 1 ? 'ativa' : 'ativas'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base uppercase tracking-wide text-muted-foreground font-bold">R$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="—"
                                                    value={precosPorBucket[b.key] ?? ''}
                                                    onChange={(e) => setPrecosPorBucket((prev) => ({ ...prev, [b.key]: e.target.value }))}
                                                    className="h-10 flex-1 rounded-xl border-2 bg-background px-3 text-base font-semibold tabular-nums focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                pill
                                                variant="outline"
                                                onClick={() => aplicarPrecoNoBucket(b.grupo, b.isAbsoluto, b.label)}
                                                disabled={!preenchido}
                                                className="w-full h-9 text-base font-bold gap-1"
                                            >
                                                <CheckIcon size={14} weight="bold" />
                                                Aplicar só neste
                                            </Button>
                                        </div>
                                    );
                                })}
                                {bucketsPreco.length === 0 && (
                                    <p className="col-span-full text-base text-muted-foreground italic">
                                        Ainda não há categorias ativas pra precificar.
                                    </p>
                                )}
                            </div>
                        </NumberedStep>

                        <NumberedStep step={2} title="Prévia">
                            {previewPrecosTotal === 0 ? (
                                <p className="text-base text-muted-foreground">
                                    Preencha pelo menos um bucket pra ver a prévia.
                                </p>
                            ) : (
                                <p className="text-base">
                                    Vai aplicar o valor em{' '}
                                    <strong className="text-emerald-700">
                                        {previewPrecosTotal} {previewPrecosTotal === 1 ? 'categoria' : 'categorias ativas'}
                                    </strong>{' '}
                                    (somando os buckets preenchidos).
                                </p>
                            )}
                        </NumberedStep>

                        <Button
                            type="button"
                            onClick={aplicarPrecosTodos}
                            disabled={previewPrecosTotal === 0}
                            pill
                            className="w-full h-12 text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <CheckIcon size={18} weight="bold" />
                            Aplicar preços
                            {previewPrecosTotal > 0 && (
                                <span className="opacity-90">· {previewPrecosTotal} {previewPrecosTotal === 1 ? 'linha' : 'linhas'}</span>
                            )}
                        </Button>
                    </div>
                )}

                {opTab === 'desativar' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <ProhibitIcon size={28} weight="duotone" className="text-rose-600 shrink-0" />
                            <div>
                                <h4 className="text-lg font-bold leading-tight">Tire faixas inteiras do evento</h4>
                                <p className="text-base text-muted-foreground mt-0.5">
                                    Marque as cores que <strong>não vão existir</strong> em <strong>{escopoLabel}</strong>.
                                    Toda linha que tocar essas cores fica desativada (mescladas inclusive).
                                </p>
                            </div>
                        </div>

                        <NumberedStep step={1} title="Escolha as cores que vão sumir">
                            {faixasIndividuaisNoEscopo.length === 0 ? (
                                <p className="text-base text-muted-foreground italic">Não há faixas neste recorte.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {faixasIndividuaisNoEscopo.map((f) => (
                                        <BeltChip
                                            key={f.key}
                                            label={f.label}
                                            on={beltsDesativarAlvo.has(f.key)}
                                            onClick={() => toggleBeltDesativar(f.key)}
                                            accent="rose"
                                        />
                                    ))}
                                </div>
                            )}
                        </NumberedStep>

                        <NumberedStep step={2} title="Prévia">
                            {beltsDesativarAlvo.size === 0 ? (
                                <p className="text-base text-muted-foreground">Selecione pelo menos uma cor.</p>
                            ) : (
                                <div className="space-y-1 text-base">
                                    <p>
                                        <strong className="text-rose-700">{beltLabelsDesativarAlvo.join(' + ')}</strong>
                                    </p>
                                    <p className="text-muted-foreground">
                                        Vai desativar <strong className="text-foreground">{previewDesativar.aDesativar}</strong>{' '}
                                        {previewDesativar.aDesativar === 1 ? 'linha ativa' : 'linhas ativas'}
                                        {previewDesativar.aReativar > 0 &&
                                            ` (e tem ${previewDesativar.aReativar} desativadas tocando essas cores que dá pra reativar)`}
                                        .
                                    </p>
                                </div>
                            )}
                        </NumberedStep>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                onClick={aplicarDesativacaoEmMassa}
                                disabled={beltsDesativarAlvo.size === 0 || previewDesativar.aDesativar === 0}
                                pill
                                className="flex-1 h-12 text-base font-bold gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                            >
                                <ProhibitIcon size={18} weight="bold" />
                                Desativar essas cores
                                {previewDesativar.aDesativar > 0 && (
                                    <span className="opacity-90">· {previewDesativar.aDesativar}</span>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={aplicarReativacaoEmMassa}
                                disabled={beltsDesativarAlvo.size === 0 || previewDesativar.aReativar === 0}
                                pill
                                className="h-12 text-base font-bold gap-2"
                            >
                                <EyeIcon size={16} weight="duotone" />
                                Reativar
                                {previewDesativar.aReativar > 0 && ` (${previewDesativar.aReativar})`}
                            </Button>
                            {beltsDesativarAlvo.size > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    pill
                                    onClick={() => setBeltsDesativarAlvo(new Set())}
                                    className="h-12 text-base"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {opTab === 'mesclar' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <SparkleIcon size={28} weight="duotone" className="text-sky-600 shrink-0" />
                            <div>
                                <h4 className="text-lg font-bold leading-tight">Junte cores ou idades em um único lote</h4>
                                <p className="text-base text-muted-foreground mt-0.5">
                                    Marque 2+ chips e mescle todos os pesos de uma vez. Cada clique é um lote — pode aplicar várias
                                    combinações em sequência (ex: <em>Branca+Azul</em>, salva, depois <em>Roxa+Marrom</em>, salva).
                                </p>
                            </div>
                        </div>

                        {faixasAtivasNoEscopo.length > 1 && (
                            <div className="rounded-2xl border-2 border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 px-2 items-center rounded-full bg-sky-600 text-white text-base font-bold uppercase tracking-wide">
                                        Por cor de faixa
                                    </span>
                                </div>

                                <NumberedStep step={1} title="Escolha as cores que vão virar uma só">
                                    <div className="flex flex-wrap gap-2">
                                        {faixasAtivasNoEscopo.map((f) => (
                                            <BeltChip
                                                key={f.key}
                                                label={f.label}
                                                on={beltsMassaAlvo.has(f.key)}
                                                onClick={() => toggleBeltMassa(f.key)}
                                                accent="sky"
                                            />
                                        ))}
                                    </div>
                                </NumberedStep>

                                <NumberedStep step={2} title="Prévia">
                                    {beltsMassaAlvo.size < 2 ? (
                                        <p className="text-base text-muted-foreground">Selecione 2 ou mais cores.</p>
                                    ) : previewMesclarFaixas.mescladas === 0 ? (
                                        <p className="text-base text-amber-700">
                                            <strong>{beltLabelsMassaAlvo.join(' + ')}</strong> não compartilham pesos neste recorte. Não dá
                                            pra juntar essa combinação.
                                        </p>
                                    ) : (
                                        <p className="text-base">
                                            <strong className="text-sky-700">{beltLabelsMassaAlvo.join(' + ')}</strong> viram{' '}
                                            <strong>
                                                {previewMesclarFaixas.mescladas}{' '}
                                                {previewMesclarFaixas.mescladas === 1 ? 'lote' : 'lotes'}
                                            </strong>{' '}
                                            ({previewMesclarFaixas.afetadas} linhas combinadas).
                                        </p>
                                    )}
                                </NumberedStep>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        onClick={aplicarMesclagemFaixasEmMassa}
                                        disabled={beltsMassaAlvo.size < 2 || previewMesclarFaixas.mescladas === 0}
                                        pill
                                        className="flex-1 h-12 text-base font-bold gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                                    >
                                        <SparkleIcon size={18} weight="bold" />
                                        Juntar {beltsMassaAlvo.size > 0 && `${beltsMassaAlvo.size} cores`} em um lote
                                    </Button>
                                    {beltsMassaAlvo.size > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            pill
                                            onClick={() => setBeltsMassaAlvo(new Set())}
                                            className="h-12 text-base"
                                        >
                                            Limpar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {grupoAtivo !== 'kids' && idadesIndividuaisNoEscopo.length > 1 && (
                            <div className="rounded-2xl border-2 border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 px-2 items-center rounded-full bg-sky-600 text-white text-base font-bold uppercase tracking-wide">
                                        Por idade
                                    </span>
                                </div>

                                <NumberedStep step={1} title="Escolha as idades que vão virar uma só">
                                    <div className="flex flex-wrap gap-2">
                                        {idadesIndividuaisNoEscopo.map((a) => {
                                            const on = idadesMassaAlvo.has(a.key);
                                            return (
                                                <button
                                                    key={a.key}
                                                    type="button"
                                                    onClick={() => toggleIdadeMassa(a.key)}
                                                    aria-pressed={on}
                                                    className={cn(
                                                        'h-11 px-4 rounded-full border-2 text-base font-bold transition-all flex items-center gap-1.5 active:scale-95',
                                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-1',
                                                        on
                                                            ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-500/30'
                                                            : 'bg-background text-foreground border-border hover:border-sky-500/40 hover:bg-sky-500/5',
                                                    )}
                                                >
                                                    {on && <CheckIcon size={14} weight="bold" />}
                                                    {a.label}
                                                    {a.years && (
                                                        <span className={cn('font-normal text-base', on ? 'opacity-80' : 'opacity-60')}>
                                                            · {a.years}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </NumberedStep>

                                <NumberedStep step={2} title="Prévia">
                                    {idadesMassaAlvo.size < 2 ? (
                                        <p className="text-base text-muted-foreground">Selecione 2 ou mais idades.</p>
                                    ) : (
                                        <div className="space-y-1.5 text-base">
                                            <p>
                                                <strong className="text-sky-700">{ageLabelsMassaAlvo.join(' + ')}</strong>
                                            </p>
                                            <p className="text-muted-foreground">
                                                <strong className="text-foreground">Mesmo peso:</strong>{' '}
                                                {previewMesclarIdades.mescladas > 0
                                                    ? `${previewMesclarIdades.mescladas} ${previewMesclarIdades.mescladas === 1 ? 'lote' : 'lotes'} (${previewMesclarIdades.afetadas} linhas).`
                                                    : 'pesos divergem — use "Unir cortes de peso".'}
                                            </p>
                                            <p className="text-muted-foreground">
                                                <strong className="text-foreground">Unir cortes:</strong>{' '}
                                                {previewUnirPesos.gruposCriados > 0
                                                    ? `${previewUnirPesos.gruposCriados} ${previewUnirPesos.gruposCriados === 1 ? 'faixa' : 'faixas'} novas a partir de ${previewUnirPesos.afetadas} originais.`
                                                    : 'sem linhas elegíveis.'}
                                            </p>
                                        </div>
                                    )}
                                </NumberedStep>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        onClick={aplicarMesclagemIdadesEmMassa}
                                        disabled={idadesMassaAlvo.size < 2 || previewMesclarIdades.mescladas === 0}
                                        pill
                                        className="flex-1 h-12 text-base font-bold gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                                        title="Use quando as idades têm os mesmos cortes de peso"
                                    >
                                        <SparkleIcon size={16} weight="bold" />
                                        Juntar (mesmo peso)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={aplicarMesclagemIdadesUnindoPesos}
                                        disabled={idadesMassaAlvo.size < 2 || previewUnirPesos.gruposCriados === 0}
                                        pill
                                        className="flex-1 h-12 text-base font-bold gap-2"
                                        title="Une os cortes de peso (ex: Kids 4+5 anos com pesos diferentes)"
                                    >
                                        <SparkleIcon size={16} weight="bold" />
                                        Unir cortes de peso
                                    </Button>
                                    {idadesMassaAlvo.size > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            pill
                                            onClick={() => setIdadesMassaAlvo(new Set())}
                                            className="h-12 text-base"
                                        >
                                            Limpar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {faixasAtivasNoEscopo.length <= 1 &&
                            (grupoAtivo === 'kids' || idadesIndividuaisNoEscopo.length <= 1) && (
                                <p className="text-base text-muted-foreground italic">
                                    Este recorte não tem variedade suficiente para mesclar em massa.
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Banner de última ação */}
            {ultimoResultado && (
                <div className="border-t bg-muted/30 px-5 py-3 flex items-start gap-2 text-base">
                    <CheckCircleIcon size={18} weight="duotone" className="text-primary shrink-0 mt-0.5" />
                    <span className="flex-1">{ultimoResultado}</span>
                    <button
                        type="button"
                        onClick={() => setUltimoResultado(null)}
                        className="text-base text-muted-foreground hover:text-foreground underline shrink-0"
                    >
                        ok
                    </button>
                </div>
            )}

            {/* Histórico de lotes */}
            {lotesAplicados.length > 0 && (
                <div className="border-t bg-background px-5 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <ArrowCounterClockwiseIcon size={16} weight="duotone" className="text-muted-foreground" />
                        <span className="text-base uppercase tracking-wide text-muted-foreground font-bold">
                            Lotes desta sessão · {lotesAplicados.length}
                        </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {lotesAplicados.map((l) => (
                            <div
                                key={l.id}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-base',
                                    l.tipo === 'preco' && 'border-emerald-500/30',
                                    (l.tipo === 'desativar' || l.tipo === 'reativar') && 'border-rose-500/30',
                                    (l.tipo === 'mesclar-faixa' || l.tipo === 'mesclar-idade' || l.tipo === 'unir-pesos') &&
                                        'border-sky-500/30',
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{l.label}</p>
                                    <p className="text-muted-foreground text-base">{l.resumo}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => desfazerLote(l.id)}
                                    className="text-base font-bold text-muted-foreground hover:text-foreground underline shrink-0"
                                    title="Volta o estado de antes deste lote"
                                >
                                    Desfazer
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Reconstrói o label de um absoluto AAMEP a partir dos campos atuais.
function rebuildAbsolutoLabel(c: EventoCategoria): string {
    const grupo = GRUPO_LABEL[c.grupo];
    const generoLabel = c.genero === 'masculino' ? 'Masculino' : 'Feminino';
    const beltsLabel = c.beltLabels.length > 0 ? c.beltLabels.join('+') : 'Sem faixa';
    const modalidadeLabel = c.modalidade === 'gi' ? 'Kimono' : 'No-Gi';
    return `${grupo} • ${generoLabel} • ${beltsLabel} • ${c.weightName} (${c.range}) • ${modalidadeLabel}`;
}

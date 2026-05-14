'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeftIcon,
    CircleNotchIcon,
    LockKeyIcon,
    LockKeyOpenIcon,
    ShuffleIcon,
    PulseIcon,
    UsersIcon,
    ArrowsClockwiseIcon,
    WarningCircleIcon,
    FlaskIcon,
    BookOpenIcon,
    TrophyIcon,
    UsersThreeIcon,
    SwordIcon,
    TreeStructureIcon,
    PaletteIcon,
    HandshakeIcon,
    FilePdfIcon,
} from '@phosphor-icons/react';
import {
    getPreviewChave,
    getChaveOficial,
    gerarChaveDefinitiva,
    reverterChaveDefinitiva,
    listarGruposSeparacao,
    criarGrupoSeparacao,
    removerGrupoSeparacao,
    getEventoBasico,
    type GrupoSeparacao,
} from '../../../../actions/gestao-evento';
import { GeBracket } from '@/components/gestao-evento/GeBracket';
import { TeamsBar } from '@/components/gestao-evento/TeamsBar';
import {
    SeparationGroupsDialog,
    type LocalGrupo,
} from '@/components/gestao-evento/SeparationGroupsDialog';
import { generateBracket } from '@/lib/gestao-evento/bracket-generator';
import type {
    GenerateBracketResult,
    AthleteInput,
    BracketFormat,
    GeneratedMatch,
} from '@/lib/gestao-evento/bracket-generator';

const POLL_MS = 30_000;

const SIM_PRESETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 20, 24, 28, 32, 36, 40] as const;
type SimCount = (typeof SIM_PRESETS)[number];

const SIM_NAMES = [
    'Lucas Silva', 'Pedro Oliveira', 'Rafael Costa', 'João Souza',
    'Carlos Lima', 'Bruno Mendes', 'André Santos', 'Felipe Rocha',
    'Marcos Pinto', 'Diego Alves', 'Thiago Cunha', 'Gustavo Faria',
    'Eduardo Reis', 'Vinicius Dias', 'Henrique Lopes', 'Mateus Nunes',
];
const SIM_TEAMS = [
    'GF Team', 'Alliance', 'Gracie Barra', 'Atos JJ',
    'Checkmat', 'Nova União', 'CTA', 'Soul Fighters',
];

function buildMockAthletes(count: number): AthleteInput[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `sim-${i + 1}`,
        name: SIM_NAMES[i % SIM_NAMES.length] + (i >= SIM_NAMES.length ? ` ${Math.floor(i / SIM_NAMES.length) + 1}` : ''),
        team: SIM_TEAMS[i % SIM_TEAMS.length],
    }));
}

type LutaRow = {
    id: string;
    round: number;
    position: number;
    athlete_a_id: string | null;
    athlete_b_id: string | null;
    athlete_a_name: string | null;
    athlete_b_name: string | null;
    team_a: string | null;
    team_b: string | null;
    winner_id: string | null;
    is_bye: boolean;
};

type ChaveRow = {
    id: string;
    formato: BracketFormat;
    seed: string;
    bracket_size: number;
    total_rounds: number;
    total_atletas: number;
    placed_order: AthleteInput[];
    status: string;
};

export default function GestaoEventoChavePage({
    params,
}: {
    params: Promise<{ eventId: string; categoriaId: string }>;
}) {
    const { eventId, categoriaId } = use(params);
    const categoryName = decodeURIComponent(categoriaId);

    const [result, setResult] = useState<GenerateBracketResult | null>(null);
    const [athletes, setAthletes] = useState<AthleteInput[]>([]);
    const [oficialChave, setOficialChave] = useState<ChaveRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [seed, setSeed] = useState<string>('preview');
    const seedRef = useRef(seed);
    seedRef.current = seed;

    type DialogKind = 'definitiva' | 'reverter' | 'erro' | 'regras' | 'grupos' | null;
    const [dialogKind, setDialogKind] = useState<DialogKind>(null);
    const [dialogMsg, setDialogMsg] = useState<string>('');

    const [grupos, setGrupos] = useState<LocalGrupo[]>([]);
    const gruposRef = useRef<LocalGrupo[]>([]);
    gruposRef.current = grupos;

    const [pdfBusy, setPdfBusy] = useState(false);

    const [simEnabled, setSimEnabled] = useState(false);
    const [simCount, setSimCount] = useState<SimCount>(8);
    type ShufflePhase = 'idle' | 'leaving' | 'loading' | 'entering';
    const [phase, setPhase] = useState<ShufflePhase>('idle');
    const shuffleTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    function clearShuffleTimers() {
        shuffleTimersRef.current.forEach(clearTimeout);
        shuffleTimersRef.current = [];
    }

    const isDefinitiva = !simEnabled && !!oficialChave;

    const load = useCallback(async () => {
        if (simEnabled) {
            const mocks = buildMockAthletes(simCount);
            const r = generateBracket(mocks, {
                seed: seedRef.current,
                separationGroups: gruposRef.current.map((g) => g.atleta_ids),
            });
            setOficialChave(null);
            setResult(r);
            setAthletes(mocks);
            setUpdatedAt(new Date());
            setLoading(false);
            return;
        }
        try {
            const [oficial, gruposRes] = await Promise.all([
                getChaveOficial(eventId, categoryName),
                listarGruposSeparacao(eventId, categoryName),
            ]);
            const loadedGrupos: LocalGrupo[] = (gruposRes.data as GrupoSeparacao[]).map(
                (g) => ({ id: g.id, atleta_ids: g.atleta_ids }),
            );
            setGrupos(loadedGrupos);

            if (oficial.chave) {
                const matches: GeneratedMatch[] = (oficial.lutas as LutaRow[]).map((l) => ({
                    round: l.round,
                    position: l.position,
                    athlete_a_id: l.athlete_a_id,
                    athlete_b_id: l.athlete_b_id,
                    athlete_a_name: l.athlete_a_name,
                    athlete_b_name: l.athlete_b_name,
                    team_a: l.team_a,
                    team_b: l.team_b,
                    is_bye: l.is_bye,
                    winner_id: l.winner_id,
                }));
                const chave = oficial.chave as ChaveRow;
                setOficialChave(chave);
                setResult({
                    format: chave.formato,
                    matches,
                    total_rounds: chave.total_rounds,
                    main_bracket_size: chave.bracket_size,
                    seed: chave.seed,
                    placed_order: chave.placed_order || [],
                });
                setAthletes(chave.placed_order || []);
                setUpdatedAt(new Date());
                return;
            }

            const res = await getPreviewChave(
                eventId,
                categoryName,
                seedRef.current,
                loadedGrupos.map((g) => g.atleta_ids),
            );
            setOficialChave(null);
            setResult(res.result);
            setAthletes(res.athletes);
            setUpdatedAt(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [eventId, categoryName, simEnabled, simCount]);

    useEffect(() => {
        load();
        if (isDefinitiva || simEnabled) return;
        const id = setInterval(load, POLL_MS);
        return () => clearInterval(id);
    }, [load, isDefinitiva, simEnabled]);

    async function handleCriarGrupo(atletaIds: string[]) {
        if (simEnabled) {
            if (gruposRef.current.length > 0) {
                return {
                    ok: false,
                    error: 'Esta categoria já possui um grupo de separação. Remova-o antes de criar outro.',
                };
            }
            const newId = `sim-grupo-${Date.now()}`;
            setGrupos((prev) => [...prev, { id: newId, atleta_ids: atletaIds }]);
            setTimeout(() => load(), 0);
            return { ok: true };
        }
        const res = await criarGrupoSeparacao(eventId, categoryName, atletaIds);
        if (res.ok && res.grupo) {
            setGrupos((prev) => [...prev, { id: res.grupo!.id, atleta_ids: res.grupo!.atleta_ids }]);
            setTimeout(() => load(), 0);
            return { ok: true };
        }
        return { ok: false, error: res.error };
    }

    async function handleRemoverGrupo(grupoId: string) {
        if (simEnabled) {
            setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
            setTimeout(() => load(), 0);
            return { ok: true };
        }
        const res = await removerGrupoSeparacao(eventId, grupoId);
        if (res.ok) {
            setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
            setTimeout(() => load(), 0);
            return { ok: true };
        }
        return { ok: false, error: res.error };
    }

    async function handleDownloadPdf() {
        if (!result || athletes.length === 0 || pdfBusy) return;
        setPdfBusy(true);
        try {
            const [{ pdf }, { BracketPdfDocument }, evRes] = await Promise.all([
                import('@react-pdf/renderer'),
                import('@/components/gestao-evento/BracketPdfDocument'),
                simEnabled
                    ? Promise.resolve({ data: { name: 'Simulação' }, error: null })
                    : getEventoBasico(eventId),
            ]);
            const eventTitle = evRes?.data?.name || 'Evento';
            const blob = await pdf(
                <BracketPdfDocument
                    eventTitle={eventTitle}
                    categoryName={categoryName}
                    result={result}
                    athletes={athletes}
                    separationGroups={grupos.map((g) => g.atleta_ids)}
                    generatedAt={new Date()}
                />,
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = `${eventTitle}-${categoryName}`
                .replace(/[\\/:*?"<>|]+/g, '-')
                .slice(0, 120);
            a.href = url;
            a.download = `chaveamento-${safeName}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err: any) {
            setDialogMsg(err?.message || 'Falha ao gerar PDF.');
            setDialogKind('erro');
        } finally {
            setPdfBusy(false);
        }
    }

    function handleNewSeed() {
        clearShuffleTimers();
        setPhase('leaving');
        shuffleTimersRef.current.push(
            setTimeout(() => {
                const newSeed = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
                setSeed(newSeed);
                seedRef.current = newSeed;
                load();
                setPhase('loading');
            }, 400),
        );
        shuffleTimersRef.current.push(setTimeout(() => setPhase('entering'), 2400));
        shuffleTimersRef.current.push(setTimeout(() => setPhase('idle'), 3000));
    }

    useEffect(() => {
        return () => clearShuffleTimers();
    }, []);

    async function confirmReverter() {
        setDialogKind(null);
        setBusy(true);
        try {
            const res = await reverterChaveDefinitiva(eventId, categoryName);
            if (!res.ok) {
                setDialogMsg(res.error || 'Falha ao reverter chave.');
                setDialogKind('erro');
                return;
            }
            setOficialChave(null);
            setSeed('preview');
            seedRef.current = 'preview';
            await load();
        } catch (err: any) {
            setDialogMsg(err?.message || 'Erro inesperado ao reverter chave.');
            setDialogKind('erro');
        } finally {
            setBusy(false);
        }
    }

    async function confirmDefinitiva() {
        setDialogKind(null);
        setBusy(true);
        try {
            const res = await gerarChaveDefinitiva(eventId, categoryName, seedRef.current);
            if (!res.ok) {
                setDialogMsg(res.error || 'Falha ao gerar chave definitiva.');
                setDialogKind('erro');
                return;
            }
            await load();
        } catch (err: any) {
            setDialogMsg(err?.message || 'Erro inesperado ao gerar chave definitiva.');
            setDialogKind('erro');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Chaveamento"
                description={categoryName}
                rightElement={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            pill
                            onClick={() => setDialogKind('grupos')}
                            disabled={athletes.length === 0}
                            className="h-12 gap-2 text-panel-sm font-semibold shadow-sm relative"
                        >
                            <HandshakeIcon size={16} weight="duotone" />
                            Grupos de separação
                            {grupos.length > 0 && (
                                <span className="ml-1 inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-black">
                                    {grupos.length}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            pill
                            onClick={() => setDialogKind('regras')}
                            className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                        >
                            <BookOpenIcon size={16} weight="duotone" />
                            Como funciona
                        </Button>
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm" asChild>
                            <Link href={`/academia-equipe/dashboard/gestao-evento/${eventId}`}>
                                <ArrowLeftIcon size={16} weight="duotone" />
                                Voltar
                            </Link>
                        </Button>
                    </div>
                }
            />

            {/* Modo simulação (dev/QA) */}
            <div
                className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
                    simEnabled
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-dashed border-border/40 bg-muted/20'
                }`}
            >
                <div className="flex items-center gap-3 text-panel-sm">
                    <FlaskIcon
                        size={18}
                        weight="duotone"
                        className={simEnabled ? 'text-amber-600' : 'text-muted-foreground'}
                    />
                    <div className="flex flex-col">
                        <span className={`font-semibold ${simEnabled ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                            {simEnabled ? 'Modo simulação ATIVO' : 'Modo simulação'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {simEnabled
                                ? 'Atletas falsos · banco não é tocado · use pra testar layout/PDF'
                                : 'Ative pra simular qualquer quantidade de atletas sem mexer no banco'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {simEnabled && (
                        <select
                            value={simCount}
                            onChange={(e) => setSimCount(Number(e.target.value) as SimCount)}
                            className="h-9 rounded-full border border-amber-500/40 bg-background px-3 text-panel-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                            {SIM_PRESETS.map((n) => (
                                <option key={n} value={n}>
                                    {n} {n === 1 ? 'atleta' : 'atletas'}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button
                        variant={simEnabled ? 'default' : 'outline'}
                        pill
                        onClick={() => {
                            setSimEnabled((v) => !v);
                            setLoading(true);
                        }}
                        className={`gap-2 h-9 px-4 font-semibold ${simEnabled ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    >
                        <FlaskIcon size={14} weight="duotone" />
                        {simEnabled ? 'Sair da simulação' : 'Ativar simulação'}
                    </Button>
                </div>
            </div>

            {/* Barra de status / ações */}
            <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border/40 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3 text-panel-sm">
                    {simEnabled ? (
                        <>
                            <FlaskIcon size={16} weight="duotone" className="text-amber-600" />
                            <span className="text-foreground font-semibold">
                                Simulação · {athletes.length} {athletes.length === 1 ? 'atleta fake' : 'atletas fake'}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                                Formato: {result?.format ?? '—'}
                            </span>
                        </>
                    ) : isDefinitiva ? (
                        <>
                            <LockKeyIcon size={16} weight="duotone" className="text-emerald-600" />
                            <span className="text-foreground font-semibold">
                                Chave DEFINITIVA · congelada
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                                {oficialChave?.total_atletas} atletas
                            </span>
                        </>
                    ) : (
                        <>
                            <PulseIcon size={16} weight="duotone" className="text-emerald-500 animate-pulse" />
                            <span className="text-muted-foreground">
                                Prévia ao vivo · atualizando a cada {POLL_MS / 1000}s{updatedAt && (
                                    <>
                                        {' · última: '}
                                        <span className="font-semibold text-foreground">{updatedAt.toLocaleTimeString('pt-BR')}</span>
                                    </>
                                )}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="flex items-center gap-1 text-foreground font-semibold">
                                <UsersIcon size={14} weight="duotone" />
                                {athletes.length}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {simEnabled ? (
                        <>
                            <Button
                                variant="outline"
                                pill
                                onClick={handleDownloadPdf}
                                disabled={pdfBusy || !result || athletes.length === 0}
                                className="gap-2 h-9 px-4 font-semibold border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 hover:border-emerald-500/70 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                                {pdfBusy ? (
                                    <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
                                ) : (
                                    <FilePdfIcon size={14} weight="duotone" />
                                )}
                                {pdfBusy ? 'Gerando PDF...' : 'Baixar PDF'}
                            </Button>
                            <Button
                                variant="outline"
                                pill
                                onClick={handleNewSeed}
                                disabled={busy}
                                className="gap-2 h-9 px-4 font-semibold"
                            >
                                <ShuffleIcon
                                    size={14}
                                    weight="duotone"
                                    className={phase !== 'idle' ? 'ge-btn-icon-spin' : ''}
                                />
                                Novo sorteio
                            </Button>
                        </>
                    ) : isDefinitiva ? (
                        <>
                            <Button
                                variant="outline"
                                pill
                                onClick={handleDownloadPdf}
                                disabled={pdfBusy || !result || athletes.length === 0}
                                className="gap-2 h-9 px-4 font-semibold border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 hover:border-emerald-500/70 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                                {pdfBusy ? (
                                    <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
                                ) : (
                                    <FilePdfIcon size={14} weight="duotone" />
                                )}
                                {pdfBusy ? 'Gerando PDF...' : 'Baixar PDF'}
                            </Button>
                            <Button
                                variant="outline"
                                pill
                                onClick={() => setDialogKind('reverter')}
                                disabled={busy}
                                className="gap-2 h-9 px-4 font-semibold border-rose-500/40 text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 hover:border-rose-500/70 dark:text-rose-400 dark:hover:text-rose-300"
                            >
                                {busy ? (
                                    <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
                                ) : (
                                    <LockKeyOpenIcon size={14} weight="duotone" />
                                )}
                                Reverter chave
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                pill
                                onClick={handleNewSeed}
                                disabled={busy}
                                className="gap-2 h-9 px-4 font-semibold"
                            >
                                <ShuffleIcon size={14} weight="duotone" />
                                Novo sorteio
                            </Button>
                            <Button
                                pill
                                onClick={() => setDialogKind('definitiva')}
                                disabled={busy || athletes.length === 0}
                                className="gap-2 h-9 px-4 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {busy ? (
                                    <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
                                ) : (
                                    <LockKeyIcon size={14} weight="duotone" />
                                )}
                                Gerar chave definitiva
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {athletes.length > 0 && phase !== 'loading' && (
                <TeamsBar athletes={athletes} />
            )}

            {/* Conteúdo */}
            {phase === 'loading' ? (
                <ShuffleLoader />
            ) : loading && !result ? (
                <div className="flex items-center justify-center py-24">
                    <CircleNotchIcon size={32} weight="bold" className="animate-spin text-muted-foreground" />
                </div>
            ) : !result || athletes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border-2 border-dashed border-border/50 rounded-2xl">
                    <LockKeyOpenIcon size={48} weight="duotone" className="text-muted-foreground/30" />
                    <p className="text-ui text-muted-foreground font-medium">
                        Nenhum atleta confirmado nesta categoria ainda.
                    </p>
                    <p className="text-panel-sm text-muted-foreground">
                        Assim que houver inscrições pagas, a chave aparecerá aqui automaticamente.
                    </p>
                </div>
            ) : (
                <div
                    className={
                        phase === 'leaving'
                            ? 'ge-bracket-leaving'
                            : phase === 'entering'
                            ? 'ge-bracket-entering'
                            : ''
                    }
                >
                    <GeBracket
                        title={categoryName}
                        result={result}
                        athletes={athletes}
                        mode={isDefinitiva ? 'oficial' : 'previa'}
                        separationGroups={grupos.map((g) => g.atleta_ids)}
                    />
                </div>
            )}

            <style jsx global>{`
                .ge-btn-icon-spin {
                    animation: ge-btn-spin 1s linear infinite;
                }
                @keyframes ge-btn-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                .ge-bracket-leaving {
                    animation: ge-bracket-leave 400ms ease-in forwards;
                }
                .ge-bracket-entering {
                    animation: ge-bracket-enter 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes ge-bracket-leave {
                    0% {
                        opacity: 1;
                        transform: scale(1);
                        filter: blur(0);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.96);
                        filter: blur(3px);
                    }
                }
                @keyframes ge-bracket-enter {
                    0% {
                        opacity: 0;
                        transform: scale(0.94) translateY(8px);
                        filter: blur(3px);
                    }
                    60% {
                        opacity: 1;
                        transform: scale(1.01) translateY(-2px);
                        filter: blur(0);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .ge-shuffle-card {
                    position: absolute;
                    width: 140px;
                    height: 56px;
                    border-radius: 0.75rem;
                    background: hsl(var(--card));
                    border: 1px solid hsl(var(--border));
                    box-shadow: 0 8px 24px -8px hsl(var(--primary) / 0.4);
                    animation: ge-shuffle-cross 1.2s ease-in-out infinite;
                }
                .ge-shuffle-card-inner {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 0 12px;
                    gap: 4px;
                }
                .ge-shuffle-card-bar {
                    height: 8px;
                    border-radius: 999px;
                    background: hsl(var(--primary) / 0.25);
                }
                .ge-shuffle-card-bar.short {
                    width: 60%;
                    background: hsl(var(--primary) / 0.15);
                }
                .ge-shuffle-card:nth-child(1) {
                    animation-delay: 0s;
                }
                .ge-shuffle-card:nth-child(2) {
                    animation-delay: 0.4s;
                }
                .ge-shuffle-card:nth-child(3) {
                    animation-delay: 0.8s;
                }
                @keyframes ge-shuffle-cross {
                    0%,
                    100% {
                        transform: translate(-90px, 0) rotate(-8deg);
                        opacity: 0.9;
                    }
                    25% {
                        transform: translate(0, -28px) rotate(0deg) scale(1.05);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(90px, 0) rotate(8deg);
                        opacity: 0.9;
                    }
                    75% {
                        transform: translate(0, 28px) rotate(0deg) scale(0.95);
                        opacity: 0.7;
                    }
                }
                .ge-shuffle-loader-text {
                    animation: ge-shuffle-text-pulse 1.4s ease-in-out infinite;
                }
                @keyframes ge-shuffle-text-pulse {
                    0%,
                    100% {
                        opacity: 0.6;
                    }
                    50% {
                        opacity: 1;
                    }
                }
            `}</style>

            <Dialog open={dialogKind === 'definitiva'} onOpenChange={(o) => !o && setDialogKind(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LockKeyIcon size={20} weight="duotone" className="text-emerald-600" />
                            Gerar chave definitiva
                        </DialogTitle>
                        <DialogDescription className="space-y-2 pt-2">
                            <span className="block">
                                Vai congelar o sorteio atual de <strong>{categoryName}</strong> com{' '}
                                <strong>{athletes.length} atletas</strong>.
                            </span>
                            <span className="block text-rose-700 dark:text-rose-400 font-medium">
                                Depois desse passo a chave não pode mais ser regerada nem alterada.
                                Use só quando estiver pronto pra valer no dia do evento.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" pill onClick={() => setDialogKind(null)} disabled={busy}>
                            Cancelar
                        </Button>
                        <Button
                            pill
                            onClick={confirmDefinitiva}
                            disabled={busy}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {busy && <CircleNotchIcon size={14} weight="bold" className="animate-spin" />}
                            Confirmar e congelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogKind === 'reverter'} onOpenChange={(o) => !o && setDialogKind(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LockKeyOpenIcon size={20} weight="duotone" className="text-rose-600" />
                            Reverter chave definitiva
                        </DialogTitle>
                        <DialogDescription className="space-y-2 pt-2">
                            <span className="block">
                                Vai destravar a chave de <strong>{categoryName}</strong> e voltar pro modo de prévia ao vivo.
                            </span>
                            <span className="block text-rose-700 dark:text-rose-400 font-medium">
                                Atenção: a chave salva e qualquer vencedor já registrado serão apagados.
                                As inscrições dos atletas continuam intactas.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" pill onClick={() => setDialogKind(null)} disabled={busy}>
                            Cancelar
                        </Button>
                        <Button
                            pill
                            onClick={confirmReverter}
                            disabled={busy}
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                        >
                            {busy && <CircleNotchIcon size={14} weight="bold" className="animate-spin" />}
                            Apagar e reverter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogKind === 'erro'} onOpenChange={(o) => !o && setDialogKind(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                            <WarningCircleIcon size={20} weight="duotone" />
                            Não foi possível concluir
                        </DialogTitle>
                        <DialogDescription className="pt-2">{dialogMsg}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button pill onClick={() => setDialogKind(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RulesDialog open={dialogKind === 'regras'} onOpenChange={(o) => !o && setDialogKind(null)} />

            <SeparationGroupsDialog
                open={dialogKind === 'grupos'}
                onOpenChange={(o) => !o && setDialogKind(null)}
                athletes={athletes}
                grupos={grupos}
                readOnly={isDefinitiva}
                onCreate={handleCriarGrupo}
                onRemove={handleRemoverGrupo}
            />
        </div>
    );
}

function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <BookOpenIcon size={32} weight="duotone" className="text-primary" />
                        Como funciona o chaveamento
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-base">
                        Entenda o formato escolhido conforme o número de atletas, as regras de sorteio e como ler a chave.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Formatos por nº de atletas */}
                    <RuleSection
                        icon={<TreeStructureIcon size={24} weight="duotone" />}
                        title="Formato por número de atletas"
                        description="O sistema escolhe automaticamente o melhor formato para a categoria."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormatCard
                                badge="1"
                                title="W.O."
                                desc="Único atleta na categoria. É declarado campeão automaticamente."
                            />
                            <FormatCard
                                badge="2"
                                title="Final Direta"
                                desc="Os 2 atletas se enfrentam direto na final. Sem semifinais."
                            />
                            <FormatCard
                                badge="3"
                                title="Round-Robin"
                                desc="Todos contra todos. 3 lutas — A×B, B×C, A×C. Vencedor por número de vitórias."
                            />
                            <FormatCard
                                badge="4+"
                                title="Eliminatória Simples"
                                desc="Quem perde está fora. Chave montada com BYEs quando o nº de atletas não é potência de 2."
                            />
                        </div>
                    </RuleSection>

                    {/* Eliminatória */}
                    <RuleSection
                        icon={<SwordIcon size={24} weight="duotone" />}
                        title="Eliminatória — como a chave é montada"
                    >
                        <ul className="space-y-3 text-base text-muted-foreground leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    O tamanho da chave sobe para a próxima potência de 2 (4, 8, 16, 32...). Os slots
                                    extras viram <strong>BYEs</strong> — atletas com BYE avançam direto para a próxima rodada.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    A chave é dividida em <strong>Lado A</strong> (esquerda) e <strong>Lado B</strong> (direita).
                                    Os finalistas saem de cada metade e se encontram na <strong>Final</strong>.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    Os perdedores das semifinais disputam o <strong>3º lugar</strong> em uma luta dedicada.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    Rodadas: <strong>Final</strong> → <strong>Semifinal</strong> →{' '}
                                    <strong>1ª, 2ª, 3ª Rodada</strong> (de trás pra frente).
                                </span>
                            </li>
                        </ul>
                    </RuleSection>

                    {/* Sorteio e separação */}
                    <RuleSection
                        icon={<HandshakeIcon size={24} weight="duotone" />}
                        title="Sorteio e separação por equipe"
                    >
                        <ul className="space-y-3 text-base text-muted-foreground leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    O sorteio é <strong>aleatório com seed</strong> — mesmo seed = mesmo resultado.
                                    Use <strong>Novo sorteio</strong> para gerar uma nova distribuição.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    Atletas da <strong>mesma equipe</strong> são distribuídos em metades opostas da
                                    chave sempre que possível, evitando confronto direto cedo demais.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary font-bold shrink-0">•</span>
                                <span>
                                    Você pode criar <strong>grupos de separação manual</strong> (ex: irmãos, amigos)
                                    para forçar metades opostas, dentro do limite que a chave permite.
                                </span>
                            </li>
                        </ul>
                    </RuleSection>

                    {/* Como ler */}
                    <RuleSection
                        icon={<PaletteIcon size={24} weight="duotone" />}
                        title="Como ler o card de luta"
                    >
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4 text-base">
                            <LegendRow
                                marker={<span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-[10px]">LS</span>}
                                label="Avatar"
                                desc="Iniciais do atleta no círculo, pintado com a cor da equipe."
                            />
                            <LegendRow
                                marker={<span className="h-7 w-1.5 rounded-full bg-fuchsia-500" />}
                                label="Stripe lateral"
                                desc="Cor sólida única por equipe — mesma equipe sempre na mesma cor."
                            />
                            <LegendRow
                                marker={
                                    <span className="bg-foreground text-background text-[11px] font-black px-2 py-0.5 rounded-full">
                                        #1
                                    </span>
                                }
                                label="Número da luta"
                                desc="Sequencial em toda a chave (1ª Rodada → Semifinal → Final → 3º lugar)."
                            />
                            <LegendRow
                                marker={
                                    <span
                                        className="h-7 w-12 rounded-md flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground italic"
                                        style={{
                                            backgroundImage:
                                                'repeating-linear-gradient(45deg, transparent, transparent 4px, hsl(var(--muted) / 0.6) 4px, hsl(var(--muted) / 0.6) 5px)',
                                        }}
                                    >
                                        BYE
                                    </span>
                                }
                                label="Passe livre (BYE)"
                                desc="Slot vazio com hachura — o oponente avança automaticamente."
                            />
                            <LegendRow
                                marker={<TrophyIcon size={20} weight="duotone" className="text-yellow-500" />}
                                label="Vencedor"
                                desc="Card preenchido com cor primária + check no avatar. Clique no atleta para marcar como vencedor."
                            />
                        </div>
                    </RuleSection>

                    {/* Fluxo do organizador */}
                    <RuleSection
                        icon={<UsersThreeIcon size={24} weight="duotone" />}
                        title="Fluxo do organizador"
                    >
                        <ol className="space-y-3 text-base text-muted-foreground list-none leading-relaxed">
                            <FlowStep n={1} label="Prévia ao vivo">
                                A chave aparece automaticamente conforme atletas se inscrevem e pagam. Atualiza a cada 30s.
                            </FlowStep>
                            <FlowStep n={2} label="Refinar com Novo sorteio">
                                Quantas vezes quiser, até gostar da distribuição. Cada clique gera um novo seed.
                            </FlowStep>
                            <FlowStep n={3} label="Gerar chave definitiva">
                                Quando o evento for começar, congele a chave. Depois disso novas inscrições não entram mais nela.
                            </FlowStep>
                            <FlowStep n={4} label="Imprimir o PDF">
                                Use <strong>Baixar PDF</strong> dentro da chave para levar o documento impresso para o evento.
                            </FlowStep>
                            <FlowStep n={5} label="Reverter (se precisar)">
                                Cometeu erro ou novos atletas entraram? Você pode reverter e voltar para a prévia ao vivo.
                            </FlowStep>
                        </ol>
                    </RuleSection>
                </div>

                <DialogFooter className="pt-2">
                    <Button pill size="lg" onClick={() => onOpenChange(false)} className="font-semibold px-8">
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RuleSection({
    icon,
    title,
    description,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {icon}
                </div>
                <div className="pt-1">
                    <h3 className="font-bold text-foreground text-lg leading-tight">{title}</h3>
                    {description && (
                        <p className="text-base text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
            </div>
            <div className="pl-16">{children}</div>
        </section>
    );
}

function FormatCard({ badge, title, desc }: { badge: string; title: string; desc: string }) {
    return (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-base">
                {badge}
            </div>
            <div>
                <p className="font-bold text-foreground text-base">{title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

function LegendRow({ marker, label, desc }: { marker: React.ReactNode; label: string; desc: string }) {
    return (
        <div className="flex items-center gap-4">
            <div className="shrink-0 w-16 flex justify-center">{marker}</div>
            <div className="flex-1">
                <span className="font-bold text-foreground text-base">{label}</span>
                <span className="text-muted-foreground text-sm"> — {desc}</span>
            </div>
        </div>
    );
}

function FlowStep({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
    return (
        <li className="flex gap-4">
            <span className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-black">
                {n}
            </span>
            <div className="flex-1 pt-0.5">
                <span className="font-bold text-foreground">{label}</span>
                <span className="text-muted-foreground"> — {children}</span>
            </div>
        </li>
    );
}

function ShuffleLoader() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-24 rounded-2xl border border-border/30 bg-background min-h-[400px]">
            <div className="relative h-32 w-72 flex items-center justify-center">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="ge-shuffle-card">
                        <div className="ge-shuffle-card-inner">
                            <div className="ge-shuffle-card-bar" />
                            <div className="ge-shuffle-card-bar short" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="ge-shuffle-loader-text text-ui font-bold text-foreground">
                    Sorteando atletas...
                </span>
                <span className="text-panel-sm text-muted-foreground">
                    Embaralhando a chave
                </span>
            </div>
        </div>
    );
}

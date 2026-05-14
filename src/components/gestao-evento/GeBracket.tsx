'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Trophy, Crown, Check, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    type GenerateBracketResult,
    type GeneratedMatch,
    type AthleteInput,
    applyWinnerPropagation,
    getRoundLabel,
} from '@/lib/gestao-evento/bracket-generator';
import { teamColor, buildGroupColorMap, type GroupBadge } from '@/lib/gestao-evento/team-colors';

interface GeBracketProps {
    title: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    mode: 'previa' | 'oficial';
    onWinnerSelect?: (matches: GeneratedMatch[]) => void;
    separationGroups?: string[][];
}

const NODE_W = 220;
const NODE_H = 96;
const G0 = 32;
const COL_GAP = 120;

function getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MatchCard({
    match,
    onPick,
    side = 'A',
    disabled = false,
    matchNumber,
    groupColors,
}: {
    match: GeneratedMatch;
    onPick?: (winnerId: string) => void;
    side?: 'A' | 'B' | 'final';
    disabled?: boolean;
    matchNumber?: number;
    groupColors?: Map<string, GroupBadge>;
}) {
    const players = [
        { id: match.athlete_a_id, name: match.athlete_a_name, team: match.team_a },
        { id: match.athlete_b_id, name: match.athlete_b_name, team: match.team_b },
    ];

    const isReverse = side === 'B';

    return (
        <div className="absolute inset-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/30 transition-all hover:shadow-md hover:-translate-y-[1px] hover:border-primary/30 flex flex-col">
            {matchNumber !== undefined && (
                <div
                    className={cn(
                        'absolute z-20 bg-foreground text-background text-[12px] font-black px-2.5 py-1 rounded-full tracking-wider shadow-md',
                        isReverse ? 'top-1.5 left-1.5' : 'top-1.5 right-1.5',
                    )}
                >
                    #{matchNumber}
                </div>
            )}

            {players.map((p, i) => {
                const isWinner = match.winner_id === p.id && p.id !== null;
                const isEmpty = !p.id;
                const isBye = match.is_bye && !p.id;
                const tColor = p.id && p.team ? teamColor(p.team) : null;
                const groupColor = p.id ? groupColors?.get(p.id) ?? null : null;
                const isLeftStripe = !isReverse;
                const initials = p.name ? getInitials(p.name) : null;

                if (isBye) {
                    return (
                        <div
                            key={i}
                            className={cn(
                                'flex-1 px-3 flex items-center gap-2 text-muted-foreground/60 italic',
                                isReverse ? 'flex-row-reverse text-right' : 'text-left',
                            )}
                            style={{
                                backgroundImage:
                                    'repeating-linear-gradient(45deg, transparent, transparent 6px, hsl(var(--muted) / 0.6) 6px, hsl(var(--muted) / 0.6) 7px)',
                            }}
                        >
                            <FastForward className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Passe livre</span>
                        </div>
                    );
                }

                const canPick = !disabled && !!p.id;
                return (
                    <button
                        key={i}
                        onClick={() => canPick && onPick?.(p.id!)}
                        disabled={!canPick}
                        type="button"
                        aria-label={canPick && p.name ? `Marcar ${p.name} como vencedor` : undefined}
                        className={cn(
                            'relative flex-1 px-3 text-sm transition-all flex items-center gap-2 group',
                            isReverse ? 'flex-row-reverse text-right' : 'text-left',
                            isWinner
                                ? 'bg-primary text-primary-foreground ge-winner-flash'
                                : canPick
                                ? 'hover:bg-muted text-ui cursor-pointer'
                                : 'text-ui cursor-default',
                            isEmpty && 'opacity-40 italic',
                        )}
                    >
                        {tColor && (
                            <span
                                className={cn(
                                    'absolute top-0 bottom-0 w-[5px]',
                                    isLeftStripe ? 'left-0' : 'right-0',
                                    isWinner && 'bg-primary-foreground',
                                )}
                                style={!isWinner ? { background: tColor.solid } : undefined}
                                aria-hidden
                            />
                        )}

                        {/* Stripe de grupo de separação — lado OPOSTO ao da equipe (mais grossa) */}
                        {groupColor && !isWinner && (
                            <span
                                className={cn(
                                    'absolute top-0 bottom-0 w-[10px] ge-group-stripe',
                                    isLeftStripe ? 'right-0' : 'left-0',
                                )}
                                style={{ background: groupColor.color }}
                                aria-hidden
                                title={`Em grupo de separação ${groupColor.index}`}
                            />
                        )}

                        {/* Avatar com iniciais (cor da equipe) */}
                        {initials && (
                            <span
                                className={cn(
                                    'h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all',
                                    isReverse ? 'ml-1' : 'mr-1',
                                    isWinner
                                        ? 'border-primary-foreground bg-primary-foreground/20 text-primary-foreground'
                                        : 'border-white shadow-sm',
                                )}
                                style={
                                    !isWinner && tColor
                                        ? { background: tColor.solid, color: tColor.text }
                                        : undefined
                                }
                                aria-hidden
                            >
                                {isWinner ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : initials}
                            </span>
                        )}

                        <div className={cn('flex flex-col overflow-hidden flex-1 min-w-0', isReverse ? 'items-end' : 'items-start')}>
                            <span
                                className={cn(
                                    'truncate font-extrabold text-[13px] leading-tight w-full',
                                    isWinner ? 'text-primary-foreground' : 'text-foreground',
                                    isReverse ? 'text-right' : 'text-left',
                                )}
                            >
                                {p.name || 'Aguardando...'}
                            </span>
                            {p.name && (
                                <span
                                    className={cn(
                                        'truncate text-[10px] font-bold uppercase tracking-wider mt-0.5 max-w-full',
                                        isReverse ? 'text-right' : 'text-left',
                                    )}
                                    style={
                                        isWinner
                                            ? { color: 'hsl(var(--primary-foreground) / 0.85)' }
                                            : tColor
                                            ? { color: tColor.solid }
                                            : { color: 'hsl(var(--muted-foreground))' }
                                    }
                                >
                                    {p.team || 'Sem Equipe'}
                                </span>
                            )}
                        </div>
                        {isWinner && !isReverse && <ChevronRight className="h-4 w-4 shrink-0" />}
                        {isWinner && isReverse && <ChevronLeft className="h-4 w-4 shrink-0" />}
                    </button>
                );
            })}
        </div>
    );
}

function getSpacing(rIdx: number) {
    let mt = 0;
    let gap = G0;
    for (let i = 0; i < rIdx; i++) {
        mt = mt + (gap + NODE_H) / 2;
        gap = gap * 2 + NODE_H;
    }
    return { mt, gap };
}

function SingleElim({
    matches,
    totalRounds,
    onPick,
    disabled,
    groupColors,
}: {
    matches: GeneratedMatch[];
    totalRounds: number;
    onPick: (idx: number, winnerId: string) => void;
    disabled: boolean;
    groupColors?: Map<string, GroupBadge>;
}) {
    const rounds: GeneratedMatch[][] = [];
    for (let r = 1; r <= totalRounds; r++) {
        rounds.push(
            matches
                .filter((m) => m.round === r && m.position !== 99)
                .sort((a, b) => a.position - b.position)
        );
    }

    const finalRound = rounds[rounds.length - 1];
    const final = finalRound[0];
    const third = matches.find((m) => m.position === 99);

    function indexOf(round: number, position: number) {
        return matches.findIndex((m) => m.round === round && m.position === position);
    }

    const lastIdx = rounds.length - 1;

    const matchNumberMap = new Map<string, number>();
    let counter = 1;
    for (let r = 1; r <= totalRounds; r++) {
        const ms = matches
            .filter((m) => m.round === r && m.position !== 99)
            .sort((a, b) => a.position - b.position);
        for (const m of ms) {
            if (!m.is_bye) {
                matchNumberMap.set(`${m.round}-${m.position}`, counter++);
            }
        }
    }
    if (third) matchNumberMap.set(`${third.round}-99`, counter++);
    const numberOf = (m: GeneratedMatch) => matchNumberMap.get(`${m.round}-${m.position}`);

    return (
        <div className="inline-flex min-w-full justify-center pt-8 pb-16 px-8" style={{ gap: `${COL_GAP}px` }}>
            {/* Lado A */}
            {rounds.length > 1 && (
                <div className="flex flex-row" style={{ gap: `${COL_GAP}px` }}>
                    {rounds.slice(0, -1).map((round, rIdx) => {
                        const { mt, gap } = getSpacing(rIdx);
                        const half = Math.floor(round.length / 2);
                        const left = round.slice(0, half);
                        return (
                            <div key={`L-${rIdx}`} className="flex flex-col relative w-[220px]">
                                <div className="absolute -top-10 left-0 right-0 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground bg-muted/60 px-3 py-1 rounded-md border border-border/40">
                                        {getRoundLabel(rIdx + 1, totalRounds)}
                                    </span>
                                </div>
                                <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px`, gap: `${gap}px` }}>
                                    {left.map((m, mIdx) => {
                                        const verticalDist = (gap + NODE_H) / 2;
                                        const isTop = rIdx === lastIdx - 1 ? true : mIdx % 2 === 0;
                                        return (
                                            <div key={m.round + '-' + m.position + '-L'} className="relative w-[220px] h-[96px] z-10 shrink-0">
                                                <MatchCard
                                                    match={m}
                                                    side="A"
                                                    disabled={disabled}
                                                    matchNumber={numberOf(m)}
                                                    groupColors={groupColors}
                                                    onPick={(wid) => onPick(indexOf(m.round, m.position), wid)}
                                                />
                                                {rIdx < lastIdx && (
                                                    <svg
                                                        className="absolute left-[220px] top-[48px] overflow-visible pointer-events-none"
                                                        style={{ zIndex: -1 }}
                                                    >
                                                        <path
                                                            d={`M 0 0 C ${COL_GAP / 2} 0, ${COL_GAP / 2} ${
                                                                isTop ? verticalDist : -verticalDist
                                                            }, ${COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                            fill="none"
                                                            className="ge-connector-base"
                                                        />
                                                        <path
                                                            d={`M 0 0 C ${COL_GAP / 2} 0, ${COL_GAP / 2} ${
                                                                isTop ? verticalDist : -verticalDist
                                                            }, ${COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                            fill="none"
                                                            className="ge-connector-pulse"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Final + 3º */}
            {final && (
                <div className="flex flex-col relative w-[220px]">
                    <div className="absolute -top-10 left-0 right-0 text-center">
                        <span className="text-label font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm whitespace-nowrap">
                            Final
                        </span>
                    </div>
                    <div className="flex flex-col w-[220px]" style={{ marginTop: `${getSpacing(lastIdx).mt}px` }}>
                        <div className="relative w-[220px] h-[96px] z-10 shrink-0 ge-final-spotlight">
                            <MatchCard
                                match={final}
                                side="final"
                                disabled={disabled}
                                matchNumber={numberOf(final)}
                                groupColors={groupColors}
                                onPick={(wid) => onPick(indexOf(final.round, final.position), wid)}
                            />
                        </div>

                        {final.winner_id && (
                            <div className="mt-8 mx-auto flex flex-col items-center">
                                <div className="bg-yellow-500 text-yellow-950 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-yellow-500/20 mb-2 flex items-center gap-1">
                                    <Crown className="h-3 w-3" /> Campeão
                                </div>
                                <span className="font-bold text-lg text-foreground">
                                    {final.winner_id === final.athlete_a_id ? final.athlete_a_name : final.athlete_b_name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {final.winner_id === final.athlete_a_id ? final.team_a : final.team_b}
                                </span>
                            </div>
                        )}

                        {third && (
                            <div className="mt-12 relative w-[220px]">
                                <div className="absolute -top-7 left-0 right-0 text-center">
                                    <span className="text-label text-orange-700 bg-orange-500/10 px-4 py-1 rounded-full border border-orange-500/20 shadow-sm whitespace-nowrap">
                                        Disputa de 3º
                                    </span>
                                </div>
                                <div className="relative w-[220px] h-[96px] z-10 shrink-0">
                                    <MatchCard
                                        match={third}
                                        side="final"
                                        disabled={disabled}
                                        matchNumber={numberOf(third)}
                                        groupColors={groupColors}
                                        onPick={(wid) => onPick(indexOf(third.round, third.position), wid)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lado B */}
            {rounds.length > 1 && (
                <div className="flex flex-row" style={{ gap: `${COL_GAP}px` }}>
                    {[...rounds]
                        .slice(0, -1)
                        .map((r, i) => ({ r, originalIdx: i }))
                        .reverse()
                        .map(({ r: round, originalIdx: rIdx }) => {
                            const { mt, gap } = getSpacing(rIdx);
                            const half = Math.floor(round.length / 2);
                            const right = round.slice(half);
                            return (
                                <div key={`R-${rIdx}`} className="flex flex-col relative w-[220px]">
                                    <div className="absolute -top-10 left-0 right-0 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground bg-muted/60 px-3 py-1 rounded-md border border-border/40">
                                            {getRoundLabel(rIdx + 1, totalRounds)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px`, gap: `${gap}px` }}>
                                        {right.map((m, mIdx) => {
                                            const verticalDist = (gap + NODE_H) / 2;
                                            const isTop = rIdx === lastIdx - 1 ? true : mIdx % 2 === 0;
                                            return (
                                                <div key={m.round + '-' + m.position + '-R'} className="relative w-[220px] h-[96px] z-10 shrink-0">
                                                    <MatchCard
                                                        match={m}
                                                        side="B"
                                                        disabled={disabled}
                                                        matchNumber={numberOf(m)}
                                                        groupColors={groupColors}
                                                        onPick={(wid) => onPick(indexOf(m.round, m.position), wid)}
                                                    />
                                                    {rIdx < lastIdx && (
                                                        <svg
                                                            className="absolute left-0 top-[48px] overflow-visible pointer-events-none"
                                                            style={{ zIndex: -1 }}
                                                        >
                                                            <path
                                                                d={`M 0 0 C ${-COL_GAP / 2} 0, ${-COL_GAP / 2} ${
                                                                    isTop ? verticalDist : -verticalDist
                                                                }, ${-COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                                fill="none"
                                                                className="ge-connector-base"
                                                            />
                                                            <path
                                                                d={`M 0 0 C ${-COL_GAP / 2} 0, ${-COL_GAP / 2} ${
                                                                    isTop ? verticalDist : -verticalDist
                                                                }, ${-COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                                fill="none"
                                                                className="ge-connector-pulse"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}

function RoundRobin({
    matches,
    onPick,
    disabled,
    groupColors,
}: {
    matches: GeneratedMatch[];
    onPick: (idx: number, winnerId: string) => void;
    disabled: boolean;
    groupColors?: Map<string, GroupBadge>;
}) {
    return (
        <div className="flex flex-col items-center gap-6 py-8">
            <span className="text-label font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm">
                Todos contra Todos · 3 lutas
            </span>
            {matches.map((m, idx) => (
                <div key={`${m.round}-${m.position}`} className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Luta {m.position + 1}
                    </span>
                    <div className="relative w-[260px] h-[96px]">
                        <MatchCard match={m} disabled={disabled} matchNumber={idx + 1} groupColors={groupColors} onPick={(wid) => onPick(idx, wid)} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function FinalOnly({
    match,
    onPick,
    disabled,
    groupColors,
}: {
    match: GeneratedMatch;
    onPick: (idx: number, winnerId: string) => void;
    disabled: boolean;
    groupColors?: Map<string, GroupBadge>;
}) {
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <span className="text-label font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm">
                Final Direta · 2 atletas
            </span>
            <div className="relative w-[280px] h-[96px]">
                <MatchCard match={match} disabled={disabled} matchNumber={1} groupColors={groupColors} onPick={(wid) => onPick(0, wid)} />
            </div>
            {match.winner_id && (
                <div className="mt-4 flex flex-col items-center">
                    <div className="bg-yellow-500 text-yellow-950 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-yellow-500/20 mb-2 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Campeão
                    </div>
                    <span className="font-bold text-lg text-foreground">
                        {match.winner_id === match.athlete_a_id ? match.athlete_a_name : match.athlete_b_name}
                    </span>
                </div>
            )}
        </div>
    );
}

function WO({ athlete }: { athlete: AthleteInput | null }) {
    return (
        <div className="flex flex-col items-center gap-4 py-12">
            <Trophy className="h-16 w-16 text-yellow-500" />
            <span className="text-label font-bold text-amber-600 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm">
                Campeão por W.O.
            </span>
            {athlete ? (
                <>
                    <span className="font-bold text-2xl text-foreground">{athlete.name}</span>
                    <span className="text-sm text-muted-foreground">{athlete.team || 'Sem Equipe'}</span>
                </>
            ) : (
                <span className="text-muted-foreground italic">Sem atleta inscrito ainda</span>
            )}
        </div>
    );
}

export function GeBracket({
    title,
    result,
    athletes,
    mode,
    onWinnerSelect,
    separationGroups,
}: GeBracketProps) {
    const [matches, setMatches] = useState<GeneratedMatch[]>(result.matches);
    const groupColors = useMemo(
        () => buildGroupColorMap(separationGroups ?? []),
        [separationGroups],
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

    useEffect(() => {
        setMatches(result.matches);
    }, [result.matches, result.seed]);

    const disabledPick = !onWinnerSelect;

    const handlePick = (idx: number, winnerId: string) => {
        const updated = applyWinnerPropagation(matches, idx, winnerId, athletes);
        setMatches(updated);
        onWinnerSelect?.(updated);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setDragStart({ x: e.pageX - containerRef.current.offsetLeft, y: e.pageY - containerRef.current.offsetTop });
        setScrollStart({ left: containerRef.current.scrollLeft, top: containerRef.current.scrollTop });
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const y = e.pageY - containerRef.current.offsetTop;
        containerRef.current.scrollLeft = scrollStart.left - (x - dragStart.x) * 1.5;
        containerRef.current.scrollTop = scrollStart.top - (y - dragStart.y) * 1.5;
    };

    const woAthlete = result.format === 'wo' ? result.placed_order[0] || null : null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
                <span
                    className={cn(
                        'text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full',
                        mode === 'previa'
                            ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
                    )}
                >
                    {mode === 'previa' ? 'Prévia ao vivo' : 'Chave oficial'}
                </span>
                <p className="text-caption text-muted-foreground">
                    <span className="font-semibold text-foreground">{athletes.length}</span> atletas ·{' '}
                    {result.format === 'wo' && 'W.O.'}
                    {result.format === 'final_only' && 'Final direta'}
                    {result.format === 'round_robin' && 'Todos contra todos'}
                    {result.format === 'single_elimination' && `Eliminatória (${result.main_bracket_size} slots)`}
                </p>
            </div>

            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={cn(
                    'flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-background rounded-2xl border border-border/30 p-12 md:p-16 min-h-[400px]',
                    result.format === 'single_elimination' && 'cursor-grab active:cursor-grabbing',
                    isDragging && 'select-none'
                )}
            >
                <div className="bracket-canvas">
                    {result.format === 'wo' && <WO athlete={woAthlete} />}
                    {result.format === 'final_only' && (
                        <FinalOnly
                            match={matches[0]}
                            onPick={handlePick}
                            disabled={disabledPick}
                            groupColors={groupColors}
                        />
                    )}
                    {result.format === 'round_robin' && (
                        <RoundRobin
                            matches={matches}
                            onPick={handlePick}
                            disabled={disabledPick}
                            groupColors={groupColors}
                        />
                    )}
                    {result.format === 'single_elimination' && (
                        <SingleElim
                            matches={matches}
                            totalRounds={result.total_rounds}
                            onPick={handlePick}
                            disabled={disabledPick}
                            groupColors={groupColors}
                        />
                    )}
                </div>
            </div>

            <style jsx global>{`
                .ge-connector-base {
                    stroke: hsl(var(--primary) / 0.18);
                    stroke-width: 2px;
                    stroke-linecap: round;
                }
                .ge-connector-pulse {
                    stroke: hsl(var(--primary) / 0.85);
                    stroke-width: 2.5px;
                    stroke-linecap: round;
                    stroke-dasharray: 24 200;
                    filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.55));
                    animation: ge-flow 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
                }
                @keyframes ge-flow {
                    0% {
                        stroke-dashoffset: 224;
                        opacity: 0;
                    }
                    15% {
                        opacity: 1;
                    }
                    85% {
                        opacity: 1;
                    }
                    100% {
                        stroke-dashoffset: 0;
                        opacity: 0;
                    }
                }
                .ge-final-spotlight {
                    border-radius: 0.75rem;
                    transition: transform 200ms ease;
                }
                .ge-final-spotlight::before,
                .ge-final-spotlight::after {
                    content: '';
                    position: absolute;
                    inset: -3px;
                    border-radius: inherit;
                    pointer-events: none;
                    opacity: 0;
                }
                .ge-final-spotlight::before {
                    background: conic-gradient(
                        from 0deg,
                        transparent 0%,
                        hsl(45 95% 55% / 0.9) 25%,
                        hsl(35 95% 55% / 0.9) 50%,
                        transparent 75%,
                        transparent 100%
                    );
                    filter: blur(6px);
                    z-index: -1;
                }
                .ge-final-spotlight::after {
                    inset: -1px;
                    border: 2px solid hsl(45 95% 55%);
                    box-shadow: 0 0 18px 2px hsl(45 95% 55% / 0.6);
                }
                .ge-final-spotlight:active::before,
                .ge-final-spotlight:active::after,
                .ge-final-spotlight:focus-within::before,
                .ge-final-spotlight:focus-within::after {
                    animation: ge-final-burst 3s ease-out forwards;
                }
                .ge-final-spotlight:active,
                .ge-final-spotlight:focus-within {
                    animation: ge-final-pulse 3s ease-out forwards;
                }
                @keyframes ge-final-burst {
                    0% {
                        opacity: 0;
                        transform: rotate(0deg) scale(0.95);
                    }
                    20% {
                        opacity: 1;
                        transform: rotate(180deg) scale(1.05);
                    }
                    70% {
                        opacity: 1;
                        transform: rotate(540deg) scale(1.02);
                    }
                    100% {
                        opacity: 0;
                        transform: rotate(720deg) scale(1);
                    }
                }
                @keyframes ge-final-pulse {
                    0% {
                        transform: scale(1);
                    }
                    15% {
                        transform: scale(1.04);
                    }
                    30% {
                        transform: scale(1.01);
                    }
                    50% {
                        transform: scale(1.025);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                .ge-winner-flash {
                    animation: ge-winner-set 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: inset 0 0 0 1px hsl(var(--primary)),
                        0 0 12px -2px hsl(var(--primary) / 0.5);
                }
                @keyframes ge-winner-set {
                    0% {
                        transform: scale(0.96);
                        filter: brightness(1.5);
                    }
                    50% {
                        transform: scale(1.03);
                        filter: brightness(1.15);
                    }
                    100% {
                        transform: scale(1);
                        filter: brightness(1);
                    }
                }
                .ge-group-badge {
                    animation: ge-group-badge-pulse 1.8s ease-in-out infinite;
                }
                @keyframes ge-group-badge-pulse {
                    0%, 100% {
                        transform: scale(1);
                        filter: brightness(1);
                    }
                    50% {
                        transform: scale(1.08);
                        filter: brightness(1.15);
                    }
                }
            `}</style>
        </div>
    );
}

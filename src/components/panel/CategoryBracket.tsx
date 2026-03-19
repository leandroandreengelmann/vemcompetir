'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Download, Loader2, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { Athlete, Round, generateBracketLogic } from "@/lib/bracket-utils";

interface CategoryBracketProps {
    athletes: Athlete[];
    title: string;
}

export function CategoryBracket({ athletes, title }: CategoryBracketProps) {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Drag-to-Pan state
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

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
        const walkX = (x - dragStart.x) * 1.5;
        const walkY = (y - dragStart.y) * 1.5;
        containerRef.current.scrollLeft = scrollStart.left - walkX;
        containerRef.current.scrollTop = scrollStart.top - walkY;
    };

    // Layout constants
    const H = 96;
    const G0 = 32;
    const COL_GAP = 120;

    useEffect(() => {
        if (athletes.length >= 2) {
            generateBracket(athletes);
        }
    }, [athletes]);

    const generateBracket = (athleteList: Athlete[]) => {
        const newRounds = generateBracketLogic(athleteList);
        setRounds(newRounds);
    };

    const handleSelectWinner = (roundIdx: number, matchIdx: number, winnerName: string) => {
        if (roundIdx === rounds.length - 1) {
            const newRounds = [...rounds];
            newRounds[roundIdx].matches[matchIdx].winner = winnerName;
            setRounds(newRounds);
            return;
        }

        const newRounds = [...rounds];
        const currentMatch = newRounds[roundIdx].matches[matchIdx];
        currentMatch.winner = winnerName;

        const winnerTeam = winnerName === currentMatch.athleteA ? currentMatch.teamA : currentMatch.teamB;
        const nextRoundIdx = roundIdx + 1;
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const isB = matchIdx % 2 !== 0;

        if (isB) {
            newRounds[nextRoundIdx].matches[nextMatchIdx].athleteB = winnerName;
            newRounds[nextRoundIdx].matches[nextMatchIdx].teamB = winnerTeam;
        } else {
            newRounds[nextRoundIdx].matches[nextMatchIdx].athleteA = winnerName;
            newRounds[nextRoundIdx].matches[nextMatchIdx].teamA = winnerTeam;
        }

        setRounds(newRounds);
    };

    const getSpacing = (r: number) => {
        let mt = 0;
        let gap = G0;
        for (let i = 0; i < r; i++) {
            mt = mt + (gap + H) / 2;
            gap = gap * 2 + H;
        }
        return { mt, gap };
    };

    // PDF logic
    let globalMatchCounter = 1;
    const roundsWithLayout = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) => ({ ...m, globalId: globalMatchCounter++ })),
    }));

    const getOriginA = (rIdx: number, mIdx: number) => {
        if (rIdx === 0) return "Aguardando...";
        const source = roundsWithLayout[rIdx - 1]?.matches[mIdx * 2];
        return source ? `Venc. Luta ${source.globalId}` : "Aguardando...";
    };

    const getOriginB = (rIdx: number, mIdx: number) => {
        if (rIdx === 0) return "Aguardando...";
        const source = roundsWithLayout[rIdx - 1]?.matches[mIdx * 2 + 1];
        return source ? `Venc. Luta ${source.globalId}` : "Aguardando...";
    };

    const handleExportPDF = async () => {
        const wrapper = document.getElementById(`pdf-bracket-wrapper-${title.replace(/\s/g, '-')}`);
        const originalParent = wrapper?.parentElement;
        if (!wrapper) return;

        try {
            setIsExporting(true);
            if (originalParent) document.body.appendChild(wrapper);

            wrapper.classList.remove('fixed', 'top-[-9999px]', 'left-[-9999px]', 'opacity-0');
            wrapper.classList.add('absolute', 'top-0', 'left-0', 'z-[-50]', 'opacity-100');

            await new Promise(resolve => setTimeout(resolve, 300));

            const pageElements = Array.from(wrapper.querySelectorAll('.pdf-page')) as HTMLElement[];
            if (pageElements.length === 0) throw new Error("No PDF pages generated.");

            const pdf = new jsPDF({ orientation: 'l', unit: 'px', format: [1122, 794] });

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();
                const imgData = await toPng(pageElements[i], {
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                    skipFonts: true,
                    canvasWidth: 1122,
                    canvasHeight: 794,
                });
                pdf.addImage(imgData, 'PNG', 0, 0, 1122, 794);
            }

            wrapper.classList.remove('absolute', 'top-0', 'left-0', 'z-[-50]', 'opacity-100');
            wrapper.classList.add('fixed', 'top-[-9999px]', 'left-[-9999px]', 'opacity-0');
            if (originalParent) originalParent.appendChild(wrapper);

            pdf.save(`chave-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        } finally {
            setIsExporting(false);
        }
    };

    if (athletes.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border-2 border-dashed border-border/50 rounded-2xl">
                <Key className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-ui text-muted-foreground font-medium">Mínimo de 2 atletas pagos para gerar a chave.</p>
            </div>
        );
    }

    // PDF Pages Builder
    type PdfRoundFragment = { name: string; matches: any[] };
    const pdfPages: { rounds: PdfRoundFragment[] }[] = [];
    let currentPageRounds: PdfRoundFragment[] = [];
    let currentPageUnits = 0;
    const MAX_UNITS = 22;

    const enrichedRounds = roundsWithLayout.map((r, rIdx) => ({
        name: r.name,
        matches: r.matches.map((m, mIdx) => ({
            ...m,
            originAText: getOriginA(rIdx, mIdx),
            originBText: getOriginB(rIdx, mIdx),
        })),
    }));

    enrichedRounds.forEach((round, rIdx) => {
        const matchRows = Math.ceil(round.matches.length / 4);
        const roundUnits = 3 + (matchRows * 4);
        const isLastRound = rIdx === enrichedRounds.length - 1;
        const podiumUnits = isLastRound ? 8 : 0;

        if (roundUnits > MAX_UNITS) {
            if (currentPageRounds.length > 0) { pdfPages.push({ rounds: currentPageRounds }); currentPageRounds = []; currentPageUnits = 0; }
            const matchesPerPage = 20;
            const totalPagesForRound = Math.ceil(round.matches.length / matchesPerPage);
            for (let p = 0; p < totalPagesForRound; p++) {
                const chunk = round.matches.slice(p * matchesPerPage, (p + 1) * matchesPerPage);
                pdfPages.push({ rounds: [{ name: `${round.name} (Pág. ${p + 1}/${totalPagesForRound})`, matches: chunk }] });
            }
        } else {
            if ((currentPageUnits + roundUnits + podiumUnits) > MAX_UNITS && currentPageRounds.length > 0) {
                pdfPages.push({ rounds: currentPageRounds });
                currentPageRounds = [];
                currentPageUnits = 0;
            }
            currentPageRounds.push({ name: round.name, matches: round.matches });
            currentPageUnits += roundUnits;
        }
    });
    if (currentPageRounds.length > 0) pdfPages.push({ rounds: currentPageRounds });

    const wrapperId = `pdf-bracket-wrapper-${title.replace(/\s/g, '-')}`;

    return (
        <div className="flex flex-col gap-4">
            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-caption text-muted-foreground">
                    <span className="font-semibold text-foreground">{athletes.length}</span> atletas confirmados • Simulação interativa
                </p>
                <Button
                    variant="default"
                    pill
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-2 h-9 px-4"
                >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isExporting ? "Gerando..." : "Baixar PDF"}
                </Button>
            </div>

            {/* Interactive Bracket */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={cn(
                    "flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-background rounded-2xl border border-border/30 p-12 md:p-24 min-h-[400px] cursor-grab active:cursor-grabbing",
                    isDragging && "select-none"
                )}
            >
                <div className="inline-flex min-w-full justify-center pt-8 pb-16 px-8" style={{ gap: `${COL_GAP}px` }}>

                    {/* Lado Esquerdo (Lado A) */}
                    {rounds.length > 1 && (
                        <div className="flex flex-row" style={{ gap: `${COL_GAP}px` }}>
                            {rounds.slice(0, -1).map((round, rIdx) => {
                                const { mt, gap } = getSpacing(rIdx);
                                const leftMatches = round.matches.slice(0, Math.floor(round.matches.length / 2));

                                return (
                                    <div key={`L-${rIdx}`} className="flex flex-col relative w-[220px]">
                                        <div className="absolute -top-10 left-0 right-0 text-center">
                                            <span className="text-label text-muted-foreground/60 bg-muted px-4 py-1.5 rounded-full border border-border/10 shadow-sm">
                                                {round.name} (Lado A)
                                            </span>
                                        </div>
                                        <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px`, gap: `${gap}px` }}>
                                            {leftMatches.map((match, mIdx) => {
                                                const isTop = mIdx % 2 === 0;
                                                // Last Lado A round connects 1→1 to Final: horizontal line (offset=0)
                                                const verticalDist = rIdx === rounds.length - 2 ? 0 : (gap + H) / 2;
                                                return (
                                                    <div key={match.id + '-left'} className="relative w-[220px] h-[96px] z-10 shrink-0">
                                                        <div className="absolute inset-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/30 transform transition-all hover:shadow-md hover:border-primary/20 flex flex-col">
                                                            {[
                                                                { ath: match.athleteA, team: match.teamA },
                                                                { ath: match.athleteB, team: match.teamB }
                                                            ].map((p, i) => {
                                                                const isWinner = match.winner === p.ath && match.winner !== null;
                                                                const isEmpty = !p.ath;
                                                                const isBye = p.ath === "BYE";

                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => !isBye && !isEmpty && handleSelectWinner(rIdx, mIdx, p.ath!)}
                                                                        className={cn(
                                                                            "flex-1 text-left px-4 text-sm transition-all flex items-center justify-between group cursor-pointer",
                                                                            isWinner ? "bg-primary text-primary-foreground" : "hover:bg-muted text-ui",
                                                                            isEmpty && "opacity-30 italic cursor-default",
                                                                            isBye && "text-muted-foreground/30 cursor-default"
                                                                        )}
                                                                        disabled={isEmpty || isBye}
                                                                    >
                                                                        <div className="flex flex-col overflow-hidden pr-2">
                                                                            <span className={cn("truncate font-bold text-[13px]", isWinner ? "text-primary-foreground" : "text-foreground")}>
                                                                                {p.ath || "Aguardando..."}
                                                                            </span>
                                                                            {p.ath && !isBye && (
                                                                                <span className={cn("text-xs truncate mt-0.5", isWinner ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                                                    {p.team || "Sem Equipe"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {isWinner ? (
                                                                            <ChevronRight className="h-4 w-4 shrink-0 animate-bounce-x" />
                                                                        ) : (
                                                                            !isEmpty && !isBye && (
                                                                                <div className="opacity-0 group-hover:opacity-100 p-1 rounded-full transition-opacity shrink-0">
                                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                        {rIdx < rounds.length - 1 && (
                                                            <svg className="absolute left-[220px] top-[48px] overflow-visible pointer-events-none" style={{ zIndex: -1 }}>
                                                                <path
                                                                    d={`M 0 0 L ${COL_GAP / 2} 0 L ${COL_GAP / 2} ${isTop ? verticalDist : -verticalDist} L ${COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                                    fill="none"
                                                                    className="animated-connector"
                                                                />
                                                            </svg>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Centro (Final) */}
                    {(() => {
                        if (rounds.length === 0) return null;
                        const rIdx = rounds.length - 1;
                        const round = rounds[rIdx];
                        const { mt } = getSpacing(rIdx);
                        const match = round.matches[0];
                        return (
                            <div className="flex flex-col relative w-[220px]">
                                <div className="absolute -top-10 left-0 right-0 text-center">
                                    <span className="text-label font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm whitespace-nowrap">
                                        {round.name}
                                    </span>
                                </div>
                                <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px` }}>
                                    <div className="relative w-[220px] h-[96px] z-10 shrink-0">
                                        <div className="absolute inset-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/30 transform transition-all hover:shadow-md hover:border-primary/20 flex flex-col">
                                            {[
                                                { ath: match.athleteA, team: match.teamA },
                                                { ath: match.athleteB, team: match.teamB }
                                            ].map((p, i) => {
                                                const isWinner = match.winner === p.ath && match.winner !== null;
                                                const isEmpty = !p.ath;
                                                const isBye = p.ath === "BYE";
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => !isBye && !isEmpty && handleSelectWinner(rIdx, 0, p.ath!)}
                                                        className={cn(
                                                            "flex-1 text-left px-4 text-sm transition-all flex items-center justify-between group cursor-pointer",
                                                            isWinner ? "bg-primary text-primary-foreground" : "hover:bg-muted text-ui",
                                                            isEmpty && "opacity-30 italic cursor-default",
                                                            isBye && "text-muted-foreground/30 cursor-default"
                                                        )}
                                                        disabled={isEmpty || isBye}
                                                    >
                                                        <div className="flex flex-col overflow-hidden pr-2">
                                                            <span className={cn("truncate font-bold text-[13px]", isWinner ? "text-primary-foreground" : "text-foreground")}>
                                                                {p.ath || "Aguardando..."}
                                                            </span>
                                                            {p.ath && !isBye && (
                                                                <span className={cn("text-xs truncate mt-0.5", isWinner ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                                    {p.team || "Sem Equipe"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {match.winner && (
                                        <div className="mt-8 mx-auto flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                            <div className="bg-yellow-500 text-yellow-950 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-yellow-500/20 mb-2">
                                                Campeão
                                            </div>
                                            <span className="font-bold text-lg text-foreground">{match.winner}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {match.winner === match.athleteA ? match.teamA : match.teamB}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                    {/* Lado Direito (Lado B) inverte o render */}
                    {rounds.length > 1 && (
                        <div className="flex flex-row" style={{ gap: `${COL_GAP}px` }}>
                            {[...rounds].slice(0, -1).map((r, i) => ({ r, originalIdx: i })).reverse().map(({ r: round, originalIdx: rIdx }) => {
                                const { mt, gap } = getSpacing(rIdx);
                                const rightMatches = round.matches.slice(Math.floor(round.matches.length / 2));
                                const halfLen = Math.floor(round.matches.length / 2);

                                return (
                                    <div key={`R-${rIdx}`} className="flex flex-col relative w-[220px]">
                                        <div className="absolute -top-10 left-0 right-0 text-center">
                                            <span className="text-label text-muted-foreground/60 bg-muted px-4 py-1.5 rounded-full border border-border/10 shadow-sm">
                                                {round.name} (Lado B)
                                            </span>
                                        </div>
                                        <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px`, gap: `${gap}px` }}>
                                            {rightMatches.map((match, mIdx) => {
                                                const globalIdx = halfLen + mIdx;
                                                // isTop is relative to position within rightMatches, not globalIdx
                                                const isTop = mIdx % 2 === 0;
                                                // Last Lado B round connects 1→1 to Final: horizontal line (offset=0)
                                                const verticalDist = rIdx === rounds.length - 2 ? 0 : (gap + H) / 2;

                                                return (
                                                    <div key={match.id + '-right'} className="relative w-[220px] h-[96px] z-10 shrink-0">
                                                        <div className="absolute inset-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/30 transform transition-all hover:shadow-md hover:border-primary/20 flex flex-col">
                                                            {[
                                                                { ath: match.athleteA, team: match.teamA },
                                                                { ath: match.athleteB, team: match.teamB }
                                                            ].map((p, i) => {
                                                                const isWinner = match.winner === p.ath && match.winner !== null;
                                                                const isEmpty = !p.ath;
                                                                const isBye = p.ath === "BYE";

                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => !isBye && !isEmpty && handleSelectWinner(rIdx, globalIdx, p.ath!)}
                                                                        className={cn(
                                                                            "flex-1 px-4 text-sm transition-all flex items-center group cursor-pointer flex-row-reverse text-right",
                                                                            isWinner ? "bg-primary text-primary-foreground" : "hover:bg-muted text-ui",
                                                                            isEmpty && "opacity-30 italic cursor-default",
                                                                            isBye && "text-muted-foreground/30 cursor-default"
                                                                        )}
                                                                        disabled={isEmpty || isBye}
                                                                    >
                                                                        <div className="flex flex-col overflow-hidden pl-2">
                                                                            <span className={cn("truncate font-bold text-[13px]", isWinner ? "text-primary-foreground" : "text-foreground")}>
                                                                                {p.ath || "Aguardando..."}
                                                                            </span>
                                                                            {p.ath && !isBye && (
                                                                                <span className={cn("text-xs truncate mt-0.5", isWinner ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                                                    {p.team || "Sem Equipe"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {isWinner ? (
                                                                            <ChevronLeft className="h-4 w-4 shrink-0 animate-bounce-x-reverse" />
                                                                        ) : (
                                                                            !isEmpty && !isBye && (
                                                                                <div className="opacity-0 group-hover:opacity-100 p-1 rounded-full transition-opacity shrink-0">
                                                                                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                        {rIdx < rounds.length - 1 && (
                                                            <svg className="absolute left-0 top-[48px] overflow-visible pointer-events-none" style={{ zIndex: -1 }}>
                                                                <path
                                                                    d={`M 0 0 L ${-COL_GAP / 2} 0 L ${-COL_GAP / 2} ${isTop ? verticalDist : -verticalDist} L ${-COL_GAP} ${isTop ? verticalDist : -verticalDist}`}
                                                                    fill="none"
                                                                    className="animated-connector"
                                                                />
                                                            </svg>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                </div>
            </div>

            {/* Phantom DOM for PDF */}
            <div id={wrapperId} className="fixed top-[-9999px] left-[-9999px] flex flex-col opacity-0 pointer-events-none">
                {pdfPages.map((page, pIdx) => (
                    <div
                        key={`pdf-page-${pIdx}`}
                        className="pdf-page relative flex flex-col overflow-hidden shrink-0"
                        style={{ width: 1122, height: 794, backgroundColor: '#ffffff', fontFamily: 'system-ui, sans-serif' }}
                    >
                        {/* ── Brand header ── */}
                        <div style={{ backgroundColor: '#1A2235', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 40px', flexShrink: 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo-white.png" alt="Competir" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>
                                    {title}
                                </p>
                                <p style={{ color: '#94A3B8', fontSize: 10, margin: '2px 0 0', fontWeight: 500 }}>
                                    {athletes.length} Atletas · Eliminatória Simples · Pág. {pIdx + 1}/{pdfPages.length}
                                </p>
                            </div>
                        </div>
                        {/* Gold accent line */}
                        <div style={{ height: 3, backgroundColor: '#D4A017', flexShrink: 0 }} />

                        {/* ── Content ── */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 40px 12px', gap: 16, overflow: 'hidden' }}>
                            {page.rounds.map((rConfig, rIdx) => (
                                <div key={`pdf-r-${pIdx}-${rIdx}`} style={{ width: '100%' }}>
                                    {/* Round title with gold underline */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <h3 style={{ fontSize: 11, fontWeight: 800, color: '#1A2235', textTransform: 'uppercase', letterSpacing: 2, margin: 0, whiteSpace: 'nowrap' }}>
                                            {rConfig.name}
                                        </h3>
                                        <div style={{ flex: 1, height: 1.5, backgroundColor: '#D4A017' }} />
                                    </div>

                                    {/* Match cards grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 16px' }}>
                                        {rConfig.matches.map((match: any) => (
                                            <div key={match.globalId} style={{ position: 'relative', height: 96, backgroundColor: '#ffffff', border: '1.5px solid #E4E7EC', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px 6px' }}>
                                                {/* LUTA badge */}
                                                <div style={{ position: 'absolute', top: -9, left: 8, backgroundColor: '#1A2235', color: '#ffffff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
                                                    LUTA {match.globalId}
                                                </div>

                                                {/* Athlete A */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderBottom: '1px solid #E4E7EC', paddingBottom: 4 }}>
                                                    {match.athleteA === 'BYE' ? (
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>BYE</span>
                                                    ) : match.athleteA ? (
                                                        <>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F1623', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.athleteA}</span>
                                                            {match.teamA && <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamA}</span>}
                                                        </>
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>{match.originAText}</span>
                                                    )}
                                                </div>

                                                {/* Athlete B */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
                                                    {match.athleteB === 'BYE' ? (
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>BYE</span>
                                                    ) : match.athleteB ? (
                                                        <>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F1623', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.athleteB}</span>
                                                            {match.teamB && <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamB}</span>}
                                                        </>
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>{match.originBText}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* ── Podium (last page only) ── */}
                            {pIdx === pdfPages.length - 1 && (
                                <div style={{ marginTop: 'auto', borderTop: '1.5px solid #E4E7EC', paddingTop: 14 }}>
                                    <h3 style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#1A2235', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px' }}>
                                        Pódio Oficial
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                                        {[
                                            { label: '1º LUGAR — CAMPEÃO', bg: '#D4A017', text: '#ffffff' },
                                            { label: '2º LUGAR — VICE',    bg: '#8E9BAE', text: '#ffffff' },
                                            { label: '3º LUGAR',           bg: '#A0673A', text: '#ffffff' },
                                        ].map((pos, i) => (
                                            <div key={i} style={{ position: 'relative', width: 240, height: 72, backgroundColor: '#ffffff', border: '1.5px solid #E4E7EC', borderRadius: 6, padding: '22px 12px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', backgroundColor: pos.bg, color: pos.text, fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
                                                    {pos.label}
                                                </div>
                                                <div style={{ borderBottom: '1px solid #E4E7EC', height: 22, display: 'flex', alignItems: 'flex-end', paddingBottom: 3, marginBottom: 6 }}>
                                                    <span style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>Nome:</span>
                                                </div>
                                                <div style={{ borderBottom: '1px solid #E4E7EC', height: 22, display: 'flex', alignItems: 'flex-end', paddingBottom: 3 }}>
                                                    <span style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>Equipe:</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div style={{ borderTop: '1px solid #E4E7EC', padding: '7px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 9, color: '#9CA3AF' }}><strong style={{ color: '#4B5563' }}>COMPETIR</strong> · Plataforma Oficial de Gestão</span>
                            <span style={{ fontSize: 9, color: '#9CA3AF' }}>Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes bounce-x-reverse {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-3px); }
                }
                .animate-bounce-x-reverse { animation: bounce-x-reverse 1s infinite; }
                @keyframes bounce-x {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(3px); }
                }
                .animate-bounce-x { animation: bounce-x 1s infinite; }
                .animated-connector {
                    stroke: hsl(var(--primary) / 0.3);
                    stroke-width: 2px;
                    stroke-dasharray: 6 6;
                    animation: marching-ants 1s linear infinite;
                }
                @keyframes marching-ants {
                    to { stroke-dashoffset: -12; }
                }
            `}</style>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Download, Loader2, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { Athlete, Match, Round, generateBracketLogic } from "@/lib/bracket-utils";

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
                        const { mt, gap } = getSpacing(rIdx);
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
            <div id={wrapperId} className="fixed top-[-9999px] left-[-9999px] flex flex-col opacity-0 pointer-events-none bg-gray-50">
                {pdfPages.map((page, pIdx) => (
                    <div key={`pdf-page-${pIdx}`} className="pdf-page bg-white relative flex flex-col p-12 overflow-hidden shrink-0" style={{ width: 1122, height: 794 }}>
                        <div className="flex flex-col items-center justify-center mb-8 w-full text-center shrink-0">
                            <h2 className="text-4xl font-black tracking-widest text-[#111827] uppercase leading-tight whitespace-nowrap">{title}</h2>
                            <p className="text-lg text-gray-500 mt-2 font-medium tracking-wide whitespace-nowrap">
                                Chave Única • Eliminatória Simples • {athletes.length} Atletas
                            </p>
                        </div>
                        <div className="flex-1 content-start mt-2 flex flex-col gap-6 w-full">
                            {page.rounds.map((rConfig, rIdx) => (
                                <div key={`pdf-r-${pIdx}-${rIdx}`} className="w-full">
                                    <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-5 border-b border-gray-200 pb-2">{rConfig.name}</h3>
                                    <div className="grid grid-cols-4 gap-x-6 gap-y-8 w-full">
                                        {rConfig.matches.map((match: any) => (
                                            <div key={match.globalId} className="relative h-[90px] w-full shrink-0 flex flex-col justify-between py-1 bg-white rounded-lg border border-gray-300 shadow-sm px-3">
                                                <div className="absolute -top-3 -left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                                    {`LUTA ${match.globalId}`}
                                                </div>
                                                <div className="h-10 flex flex-col justify-end border-b border-gray-300 pb-1">
                                                    {match.athleteA === "BYE" ? (
                                                        <span className="text-[14px] font-bold text-gray-400 uppercase">BYE</span>
                                                    ) : match.athleteA ? (
                                                        <div className="flex flex-col leading-tight pr-4">
                                                            <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteA}</span>
                                                            {match.teamA && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamA}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-gray-400 italic">{match.originAText}</span>
                                                    )}
                                                </div>
                                                <div className="h-10 flex flex-col justify-end pb-1">
                                                    {match.athleteB === "BYE" ? (
                                                        <span className="text-[14px] font-bold text-gray-400 uppercase">BYE</span>
                                                    ) : match.athleteB ? (
                                                        <div className="flex flex-col leading-tight pr-4">
                                                            <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteB}</span>
                                                            {match.teamB && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamB}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-gray-400 italic">{match.originBText}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {pIdx === pdfPages.length - 1 && (
                                <div className="mt-6 w-full border-t-2 border-dashed border-gray-300 pt-6 mt-auto shrink-0">
                                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-6 text-center">Pódio Oficial</h3>
                                    <div className="flex flex-row justify-center gap-6 w-full mt-2 pb-4">
                                        {[
                                            { label: "1º LUGAR (CAMPEÃO)", color: "bg-yellow-500" },
                                            { label: "2º LUGAR (VICE)", color: "bg-gray-400" },
                                            { label: "3º LUGAR", color: "bg-[#cd7f32]" },
                                        ].map((pos, idx) => (
                                            <div key={idx} className="relative w-[240px] flex flex-col justify-end pt-6 pb-2 bg-white rounded-lg border border-gray-300 shadow-sm px-4 h-[75px]">
                                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-0.5 rounded shadow-sm whitespace-nowrap ${pos.color}`}>
                                                    {pos.label}
                                                </div>
                                                <div className="border-b border-gray-300 h-6 w-full flex items-end pb-1 mb-2">
                                                    <span className="text-[10px] text-gray-400 italic">Nome:</span>
                                                </div>
                                                <div className="border-b border-gray-300 h-6 w-full flex items-end pb-1">
                                                    <span className="text-[10px] text-gray-400 italic">Equipe:</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-auto w-full text-gray-400 text-xs border-t border-gray-100 pt-4 shrink-0 flex justify-between px-4">
                            <span><strong>Competir</strong> • Plataforma Oficial de Gestão</span>
                            <span>Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
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

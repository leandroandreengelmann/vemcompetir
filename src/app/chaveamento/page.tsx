'use client';

import { useState, useEffect, useRef } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, ChevronRight, ChevronLeft, Info, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { Round, generateBracketLogic } from "@/lib/bracket-utils";

export default function ChaveamentoPage() {
    const [count, setCount] = useState<number>(10);
    const [mainTeamCount, setMainTeamCount] = useState<number>(0);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [isGenerated, setIsGenerated] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Estado para "Drag-to-Pan" (Arrastar a tela com o mouse)
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
        const walkX = (x - dragStart.x) * 1.5; // Velocidade do arrasto horizontal
        const walkY = (y - dragStart.y) * 1.5; // Velocidade do arrasto vertical
        containerRef.current.scrollLeft = scrollStart.left - walkX;
        containerRef.current.scrollTop = scrollStart.top - walkY;
    };

    // Auto-clamp mainTeamCount when count shrinks
    useEffect(() => {
        if (mainTeamCount > count) setMainTeamCount(count);
    }, [count]);

    // Persistência local básica
    useEffect(() => {
        const saved = localStorage.getItem("bracket_simulation");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRounds(parsed.rounds);
                setCount(parsed.count || 10);
                if (parsed.mainTeamCount !== undefined) setMainTeamCount(parsed.mainTeamCount);
                setIsGenerated(true);
            } catch (e) {
                console.error("Failed to parse saved bracket", e);
            }
        }
    }, []);

    useEffect(() => {
        if (isGenerated && rounds.length > 0) {
            localStorage.setItem("bracket_simulation", JSON.stringify({ rounds, count, mainTeamCount }));
        }
    }, [rounds, count, mainTeamCount, isGenerated]);

    const generateBracket = () => {
        if (count < 2) return;

        const athletesData = [];
        const mainCount = Math.min(mainTeamCount, count); // prevent going over total

        for (let i = 0; i < mainCount; i++) {
            athletesData.push({
                name: `Atleta ${i + 1}`,
                team: "Equipe Principal",
            });
        }

        const fakeAcademies = [
            "Gracie Barra", "CheckMat", "Alliance", "Nova União",
            "GFTeam", "Atos Jiu-Jitsu", "Cicero Costha", "Ribeiro Jiu-Jitsu", "Carlson Gracie"
        ];

        for (let i = mainCount; i < count; i++) {
            athletesData.push({
                name: `Atleta ${i + 1}`,
                team: fakeAcademies[(i - mainCount) % fakeAcademies.length]
            });
        }

        const newRounds = generateBracketLogic(athletesData);
        setRounds(newRounds);
        setIsGenerated(true);
    };

    const handleSelectWinner = (roundIdx: number, matchIdx: number, winnerName: string) => {
        if (roundIdx === rounds.length - 1) {
            // Final
            const newRounds = [...rounds];
            newRounds[roundIdx].matches[matchIdx].winner = winnerName;
            setRounds(newRounds);
            return;
        }

        const newRounds = [...rounds];
        const currentMatch = newRounds[roundIdx].matches[matchIdx];

        currentMatch.winner = winnerName;

        // Determinar o time do vencedor
        const winnerTeam = winnerName === currentMatch.athleteA ? currentMatch.teamA : currentMatch.teamB;

        // Propagar para o próximo round
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

    const reset = () => {
        setIsGenerated(false);
        setRounds([]);
        localStorage.removeItem("bracket_simulation");
    };

    const handleExportPDF = async () => {
        const wrapper = document.getElementById('pdf-exclusive-wrapper');
        const originalParent = wrapper?.parentElement;

        if (!wrapper) return;

        try {
            setIsExporting(true);

            // Trazendo o DOM fantasma momentaneamente para ser fotografado corretamente
            if (originalParent) {
                document.body.appendChild(wrapper);
            }

            wrapper.classList.remove('fixed', 'top-[-9999px]', 'left-[-9999px]', 'opacity-0');
            wrapper.classList.add('absolute', 'top-0', 'left-0', 'z-[-50]', 'opacity-100');

            // Garantir que a renderização do SVG e fontes esteja completa
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capturar as páginas geradas
            const pageElements = Array.from(wrapper.querySelectorAll('.pdf-page')) as HTMLElement[];
            if (pageElements.length === 0) throw new Error("No PDF pages generated.");

            // Criar PDF base em Paisagem A4 (1122 x 794)
            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'px',
                format: [1122, 794]
            });

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();

                const pageEl = pageElements[i];

                // Forçar dimensões reais do A4 em Paisagem no html-to-image
                const imgData = await toPng(pageEl, {
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                    skipFonts: true,
                    canvasWidth: 1122,
                    canvasHeight: 794,
                });

                pdf.addImage(imgData, 'PNG', 0, 0, 1122, 794);
            }

            // Retornar o DOM fantasma ao seu estado original invisível imediatamente
            wrapper.classList.remove('absolute', 'top-0', 'left-0', 'z-[-50]', 'opacity-100');
            wrapper.classList.add('fixed', 'top-[-9999px]', 'left-[-9999px]', 'opacity-0');
            if (originalParent) {
                originalParent.appendChild(wrapper);
            }

            pdf.save(`chaveamento-${count}-atletas.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Não foi possível gerar o PDF. Consulte o console.");
        } finally {
            setIsExporting(false);
        }
    };
    // Constantes matemáticas para layout perfeito do chaveamento
    const H = 96; // Altura fixa de cada card da luta em px
    const G0 = 32; // Espaçamento vertical inicial entre cards no Round 1 em px
    const COL_GAP = 120; // Espaçamento horizontal entre colunas (rounds) em px

    const getSpacing = (r: number) => {
        let mt = 0;
        let gap = G0;
        for (let i = 0; i < r; i++) {
            mt = mt + (gap + H) / 2;
            gap = gap * 2 + H;
        }
        return { mt, gap };
    };


    // --- LÓGICA DE DADOS EXCLUSIVA DO PDF (PAGINAÇÃO E IDS GLOBAIS INTELLIGENTES) ---
    const MATCHES_PER_PAGE = 20; // 4 colunas x 5 linhas = 20 lutas confortáveis por folha A4 em paisagem
    let globalMatchCounter = 1;
    const roundsWithLayout = rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) => ({ ...m, globalId: globalMatchCounter++ }))
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



    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header do Simulador */}
                <div className="bg-muted/30 border-b border-border/50 pt-[calc(var(--header-height,90px)+1rem)] pb-6 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center md:text-left">
                            <h1 className="text-h1 uppercase tracking-tighter flex items-center gap-2 justify-center md:justify-start">
                                Simulador de Chaveamento
                            </h1>
                            <p className="text-ui text-muted-foreground font-medium">
                                Simulação de Eliminatória Simples (Single Elimination) • <span className="font-bold text-foreground">BYE</span> = Advanço Direto
                            </p>
                        </div>

                        {!isGenerated ? (
                            (() => {
                                const pct = count > 0 ? Math.round((mainTeamCount / count) * 100) : 0;
                                const barColor = pct <= 50 ? "bg-emerald-500" : pct <= 75 ? "bg-amber-500" : "bg-red-500";
                                const statusLabel = pct === 0
                                    ? "Sem proteção de equipe"
                                    : pct <= 50
                                        ? `Cruzamento mais cedo na semi-final (${pct}%)`
                                        : pct <= 75
                                            ? `Cruzamentos nas quartas-de-final (${pct}%)`
                                            : `Equipe dominante — cruzamentos no Round 1 (${pct}%)`;
                                const statusColor = pct === 0
                                    ? "text-muted-foreground"
                                    : pct <= 50
                                        ? "text-emerald-600 dark:text-emerald-500"
                                        : pct <= 75
                                            ? "text-amber-600 dark:text-amber-500"
                                            : "text-red-600 dark:text-red-500";

                                return (
                                    <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        {/* Controls row */}
                                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-background p-2 rounded-2xl md:rounded-full border border-border shadow-sm">
                                            {/* Total */}
                                            <div className="flex items-center gap-2 px-3 py-1.5 md:py-0">
                                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap w-28 md:w-auto">Total de atletas</span>
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <button
                                                        onClick={() => setCount(c => Math.max(2, c - 1))}
                                                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-bold"
                                                    >−</button>
                                                    <span className="w-10 text-center font-black text-foreground text-base tabular-nums">{count}</span>
                                                    <button
                                                        onClick={() => setCount(c => Math.min(256, c + 1))}
                                                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-bold"
                                                    >+</button>
                                                </div>
                                            </div>

                                            <div className="hidden md:block w-px h-6 bg-border/60" />

                                            {/* Mesma Equipe */}
                                            <div className="flex items-center gap-2 px-3 py-1.5 md:py-0">
                                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap w-28 md:w-auto">Mesma equipe</span>
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <button
                                                        onClick={() => setMainTeamCount(c => Math.max(0, c - 1))}
                                                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-bold"
                                                    >−</button>
                                                    <span className={cn("w-10 text-center font-black text-base tabular-nums", pct > 75 ? "text-red-600" : pct > 50 ? "text-amber-600" : "text-foreground")}>{mainTeamCount}</span>
                                                    <button
                                                        onClick={() => setMainTeamCount(c => Math.min(count, c + 1))}
                                                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-bold"
                                                    >+</button>
                                                </div>
                                            </div>

                                            <Button onClick={generateBracket} pill className="h-10 px-6 font-bold shadow-lg shadow-primary/20 w-full md:w-auto rounded-full md:ml-1">
                                                Gerar
                                            </Button>
                                        </div>

                                        {/* Proportion bar */}
                                        {mainTeamCount > 0 && (
                                            <div className="px-1 flex flex-col gap-1.5">
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-300", barColor)}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                                <p className={cn("text-xs font-medium flex items-center gap-1 transition-colors", statusColor)}>
                                                    <Info className="h-3 w-3 shrink-0" />
                                                    {statusLabel}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="default"
                                    pill
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-2"
                                >
                                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    {isExporting ? "Gerando..." : "Baixar PDF"}
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" pill className="font-bold flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Explicação
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Como funciona o Chaveamento?</DialogTitle>
                                            <DialogDescription>
                                                Entenda as regras da simulação de Eliminatória Simples.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4 text-sm text-muted-foreground">
                                            <div>
                                                <h4 className="font-bold text-foreground mb-1">O que é a Eliminatória Simples?</h4>
                                                <p>É um formato onde o competidor que perde a luta é imediatamente eliminado da competição. Quem vence todas as lutas é declarado o campeão.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground mb-1">O que é BYE?</h4>
                                                <p>Quando o número de atletas não é uma potência exata de 2 (como 2, 4, 8, 16...), o sistema gera posições vazias (chamadas de BYE) no primeiro round para balancear o chaveamento. O atleta que é pareado contra um BYE avança direto para a próxima rodada sem lutar.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground mb-1">Como avançar um atleta?</h4>
                                                <p>Nesta simulação, basta passar o mouse (ou focar) no card da luta e clicar na setinha ao lado direito do nome do vencedor que você deseja avançar para a próxima fase.</p>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="outline" pill onClick={reset} className="font-bold border-red-500/20 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Resetar Simulação
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Área do Bracket Visível */}
                <div
                    id="bracket-container"
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={cn(
                        "flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] p-12 md:p-24 bg-background cursor-grab active:cursor-grabbing",
                        isDragging && "select-none"
                    )}
                >
                    {isGenerated && (
                        <div className="inline-flex min-w-full justify-center pt-16 pb-24 px-8" style={{ gap: `${COL_GAP}px` }}>

                            {/* Lado Esquerdo (Lado A) */}
                            {rounds.length > 1 && (
                                <div className="flex flex-row" style={{ gap: `${COL_GAP}px` }}>
                                    {rounds.slice(0, -1).map((round, rIdx) => {
                                        const { mt, gap } = getSpacing(rIdx);
                                        const leftMatches = round.matches.slice(0, Math.floor(round.matches.length / 2));

                                        return (
                                            <div key={`L-${rIdx}`} className="flex flex-col relative w-[220px]">
                                                <div className="absolute -top-12 left-0 right-0 text-center">
                                                    <span className="text-label text-muted-foreground/60 bg-muted px-4 py-1.5 rounded-full border border-border/10 shadow-sm">
                                                        {round.name} (Lado A)
                                                    </span>
                                                </div>
                                                <div className="flex flex-col w-[220px]" style={{ marginTop: `${mt}px`, gap: `${gap}px` }}>
                                                    {leftMatches.map((match, mIdx) => {
                                                        const isTop = mIdx % 2 === 0;
                                                        // Last Lado A round connects 1→1 to Final: horizontal line (offset=0)
                                                        // Inner rounds connect 2→1 pairs: standard vertical offset
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
                                const match = round.matches[0];
                                // For rounds.length === 1 (2 athletes, direct Final), center at top
                                const prevRoundIdx = rIdx - 1;
                                const hasPrev = prevRoundIdx >= 0;
                                const { mt: prevMt, gap: prevGap } = hasPrev ? getSpacing(prevRoundIdx) : { mt: 0, gap: G0 };
                                const prevMatchCount = hasPrev ? Math.floor(rounds[prevRoundIdx].matches.length / 2) : 0;
                                const totalHeightA = prevMatchCount > 0
                                    ? prevMatchCount * H + (prevMatchCount - 1) * prevGap
                                    : H;
                                const finalMt = hasPrev && prevMatchCount > 0
                                    ? prevMt + totalHeightA / 2 - H / 2
                                    : 0;
                                return (
                                    <div className="flex flex-col relative w-[220px]">
                                        <div className="absolute -top-12 left-0 right-0 text-center">
                                            <span className="text-label font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-6 py-1.5 rounded-full border border-amber-500/20 shadow-sm whitespace-nowrap">
                                                {round.name}
                                            </span>
                                        </div>
                                        <div className="flex flex-col w-[220px]" style={{ marginTop: `${finalMt}px` }}>
                                            <div className="relative w-[220px] h-[96px] z-10 shrink-0">
                                                <div className="absolute inset-0 bg-card rounded-xl border-2 border-amber-500/40 shadow-lg shadow-amber-500/10 overflow-hidden divide-y divide-border/30 transform transition-all hover:shadow-md hover:border-amber-500/60 flex flex-col">
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
                                                    <div className="bg-yellow-500 text-yellow-950 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-yellow-500/20 mb-2 flex items-center gap-1">
                                                        <Trophy className="h-3 w-3" /> Campeão
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
                                                <div className="absolute -top-12 left-0 right-0 text-center">
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
                                                        // Inner rounds connect 2→1 pairs: standard vertical offset
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
                    )}
                </div>

                {/* DOM Fantasma para Impressão PDF Alta Fidelidade (Fora da tela, mas renderizado) */}
                {isGenerated && (
                    <div id="pdf-exclusive-wrapper" className="fixed top-[-9999px] left-[-9999px] flex flex-col opacity-0 pointer-events-none bg-gray-50">
                        {(() => {
                            // --- PDF Builder Inteligente ---
                            type PdfRoundFragment = { name: string; matches: any[] };
                            const pages: { rounds: PdfRoundFragment[] }[] = [];
                            let currentPageRounds: PdfRoundFragment[] = [];
                            let currentPageUnits = 0;
                            const MAX_UNITS = 22; // Capacidade flexível da página. Titulo=3, Fileira=4

                            // Pre-calcular textos de origem antes de destrinchar o array original
                            const enrichedRounds = roundsWithLayout.map((r, rIdx) => ({
                                name: r.name,
                                matches: r.matches.map((m, mIdx) => ({
                                    ...m,
                                    originAText: getOriginA(rIdx, mIdx),
                                    originBText: getOriginB(rIdx, mIdx)
                                }))
                            }));

                            enrichedRounds.forEach((round, rIdx) => {
                                const matchRows = Math.ceil(round.matches.length / 4);
                                const roundUnits = 3 + (matchRows * 4); // 3 (título) + 4 por linha de 4 lutas
                                const isLastRound = rIdx === enrichedRounds.length - 1;
                                const podiumUnits = isLastRound ? 8 : 0; // Reserva 8 unidades pro Pódio se for o último round

                                if (roundUnits > MAX_UNITS) {
                                    // Se já tem algo na página atual, fecha ela e vai pra uma nova
                                    if (currentPageRounds.length > 0) {
                                        pages.push({ rounds: currentPageRounds });
                                        currentPageRounds = [];
                                        currentPageUnits = 0;
                                    }

                                    // Para rounds gigantes (ex: 32 lutas), dividimos em páginas exclusivas formatadas
                                    const matchesPerPage = 20;
                                    const totalPagesForRound = Math.ceil(round.matches.length / matchesPerPage);

                                    for (let p = 0; p < totalPagesForRound; p++) {
                                        const chunk = round.matches.slice(p * matchesPerPage, (p + 1) * matchesPerPage);
                                        pages.push({
                                            rounds: [{
                                                name: `${round.name} (Pág. ${p + 1}/${totalPagesForRound})`,
                                                matches: chunk
                                            }]
                                        });
                                    }
                                } else {
                                    // Round cabe inteiro numa página, mas cabe junto com o que já tem na atual?
                                    if ((currentPageUnits + roundUnits + podiumUnits) > MAX_UNITS && currentPageRounds.length > 0) {
                                        pages.push({ rounds: currentPageRounds });
                                        currentPageRounds = [];
                                        currentPageUnits = 0;
                                    }

                                    currentPageRounds.push({ name: round.name, matches: round.matches });
                                    currentPageUnits += roundUnits;
                                }
                            });

                            if (currentPageRounds.length > 0) {
                                pages.push({ rounds: currentPageRounds });
                            }

                            return pages.map((page, pIdx) => (
                                <div key={`pdf-page-${pIdx}`} className="pdf-page bg-white relative flex flex-col p-12 overflow-hidden shrink-0" style={{ width: 1122, height: 794 }}>

                                    {/* Cabeçalho do Campeonato (Único por Folha A4) */}
                                    <div className="flex flex-col items-center justify-center mb-8 w-full text-center shrink-0">
                                        <h2 className="text-4xl font-black tracking-widest text-[#111827] uppercase leading-tight whitespace-nowrap">Campeonato Oficial</h2>
                                        <p className="text-lg text-gray-500 mt-2 font-medium tracking-wide whitespace-nowrap">Chave Única • Eliminatória Simples • {count} Atletas</p>
                                    </div>

                                    {/* Lista de Fases Agrupadas */}
                                    <div className="flex-1 content-start mt-2 flex flex-col gap-6 w-full">
                                        {page.rounds.map((rConfig, rIdx) => (
                                            <div key={`pdf-r-${pIdx}-${rIdx}`} className="w-full">
                                                <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-5 border-b border-gray-200 pb-2">
                                                    {rConfig.name}
                                                </h3>
                                                <div className="grid grid-cols-4 gap-x-6 gap-y-8 w-full">
                                                    {rConfig.matches.map((match) => (
                                                        <div key={match.globalId} className="relative h-[90px] w-full shrink-0 flex flex-col justify-between py-1 bg-white rounded-lg border border-gray-300 shadow-sm px-3">

                                                            {/* MARCADOR LUTA X */}
                                                            <div className="absolute -top-3 -left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                                                {`LUTA ${match.globalId}`}
                                                            </div>

                                                            {/* Atleta A */}
                                                            <div className="h-10 flex flex-col justify-end border-b border-gray-300 pb-1 relative">
                                                                {match.athleteA === "BYE" ? (
                                                                    <span className="text-[14px] font-bold text-gray-400 uppercase w-full">BYE</span>
                                                                ) : match.athleteA ? (
                                                                    <div className="flex flex-col leading-tight pr-4">
                                                                        <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteA}</span>
                                                                        {match.teamA && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamA}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium text-gray-400 italic">
                                                                        {match.originAText}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Atleta B */}
                                                            <div className="h-10 flex flex-col justify-end pb-1 relative">
                                                                {match.athleteB === "BYE" ? (
                                                                    <span className="text-[14px] font-bold text-gray-400 uppercase w-full">BYE</span>
                                                                ) : match.athleteB ? (
                                                                    <div className="flex flex-col leading-tight pr-4">
                                                                        <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteB}</span>
                                                                        {match.teamB && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamB}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium text-gray-400 italic">
                                                                        {match.originBText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Pódio na última página */}
                                        {pIdx === pages.length - 1 && (
                                            <div className="mt-6 w-full border-t-2 border-dashed border-gray-300 pt-6 mt-auto shrink-0">
                                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-6 text-center">
                                                    Pódio Oficial
                                                </h3>
                                                <div className="flex flex-row justify-center gap-6 w-full mt-2 pb-4">
                                                    {[
                                                        { label: "1º LUGAR (CAMPEÃO)", color: "bg-yellow-500" },
                                                        { label: "2º LUGAR (VICE)", color: "bg-gray-400" },
                                                        { label: "3º LUGAR", color: "bg-[#cd7f32]" }
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

                                    {/* Rodapé da Página */}
                                    <div className="mt-auto w-full text-gray-400 text-xs border-t border-gray-100 pt-4 shrink-0 flex justify-between px-4">
                                        <span><strong>Competir</strong> • Plataforma Oficial de Gestão</span>
                                        <span>Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

            </main>

            <PublicFooter />

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
                .animate-bounce-x {
                    animation: bounce-x 1s infinite;
                }
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

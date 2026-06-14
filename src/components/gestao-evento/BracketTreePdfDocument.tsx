import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Svg,
    Path,
    Circle,
    Line,
    Image,
} from '@react-pdf/renderer';
import type {
    AthleteInput,
    GenerateBracketResult,
    GeneratedMatch,
} from '@/lib/gestao-evento/bracket-generator';
import { formatDateTime } from '@/lib/gestao-evento/bracket-pdf-shared';
import { parseCategoria } from '@/lib/gestao-evento/parse-categoria';

// ─────────────────────────────────────────────────────────────────
// PDF "Chave (árvore)" — A4 PAISAGEM, estilo de chave de campeonato.
//
// Bracket espelhado convergindo ao centro. Cada atleta tem um NÚMERO
// (círculo) e o nome+academia impressos só na 1ª rodada. Nas fases
// seguintes a mesa escreve apenas o NÚMERO de quem passou dentro do
// círculo vazio. Centro: pódio 1º/2º/3º (um 3º só — sem disputa de 3º,
// o 3º é o semifinalista que perdeu para o campeão) + a final "X".
// ─────────────────────────────────────────────────────────────────

const PAGE_W = 842;
const PAGE_H = 595;
const PAD = 20;
const HEADER_H = 48;
const FOOTER_H = 14;

const CANVAS_W = PAGE_W - PAD * 2;
const CANVAS_H = PAGE_H - PAD * 2 - HEADER_H - FOOTER_H;

const INK = '#1f2937';
const LINE = '#64748b';
const FAINT = '#9ca3af';

type Tier = {
    D: number; // diâmetro do círculo
    numSz: number;
    nameSz: number;
    teamSz: number;
    NW: number; // largura da área de nome (1ª rodada)
    COL: number; // passo entre colunas de círculos
};

function sizeTier(size: number): Tier {
    if (size <= 8) return { D: 26, numSz: 11, nameSz: 9.5, teamSz: 7.5, NW: 175, COL: 56 };
    if (size <= 16) return { D: 22, numSz: 10, nameSz: 9, teamSz: 7, NW: 158, COL: 48 };
    if (size <= 32) return { D: 16, numSz: 8, nameSz: 7.5, teamSz: 6, NW: 126, COL: 36 };
    return { D: 12, numSz: 6.5, nameSz: 6.2, teamSz: 5, NW: 98, COL: 28 };
}

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        paddingTop: PAD,
        paddingBottom: PAD,
        paddingHorizontal: PAD,
        color: INK,
        backgroundColor: '#ffffff',
    },
    header: {
        height: HEADER_H,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1.5,
        borderBottomColor: INK,
        paddingBottom: 6,
    },
    headerSide: { flexDirection: 'column', maxWidth: 160 },
    pesoLabel: { fontSize: 8, color: '#475569' },
    pesoValue: { fontSize: 11, fontWeight: 700 },
    pesoRange: { fontSize: 9, fontWeight: 700, color: '#0f172a' },
    titleWrap: { flex: 1, alignItems: 'center' },
    superTitle: { fontSize: 7, letterSpacing: 2, color: '#64748b', textTransform: 'uppercase' },
    title: { fontSize: 12.5, fontWeight: 700, textAlign: 'center' },
    logo: { width: 92, height: 24, objectFit: 'contain' },
    canvas: { position: 'relative', width: CANVAS_W, height: CANVAS_H, marginTop: 4 },
    numCircleText: { fontWeight: 700, textAlign: 'center', color: INK },
    nameWrap: { position: 'absolute' },
    name: { fontWeight: 700, color: INK },
    team: { color: '#6b7280' },
    byeNum: { position: 'absolute', textAlign: 'center', color: FAINT, fontWeight: 700 },
    podiumLabel: { position: 'absolute', fontWeight: 700, color: INK },
    xMark: { position: 'absolute', fontWeight: 700, color: INK, textAlign: 'center' },
    thirdNote: { position: 'absolute', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' },
    finalLabel: { position: 'absolute', textAlign: 'center', fontWeight: 700, color: INK, letterSpacing: 2, textTransform: 'uppercase' },
    footer: {
        position: 'absolute',
        bottom: 6,
        left: PAD,
        right: PAD,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7.5,
        color: '#9ca3af',
    },
});

function initialsName(name: string | null): string {
    return name ?? '';
}

// Caminho "cotovelo": liga dois filhos (mesma x) a um pai (x do pai, y médio).
function elbow(childX: number, y1: number, y2: number, parentX: number): string[] {
    const xmid = (childX + parentX) / 2;
    const py = (y1 + y2) / 2;
    return [
        `M ${childX} ${y1} L ${xmid} ${y1} L ${xmid} ${y2} L ${childX} ${y2}`,
        `M ${xmid} ${py} L ${parentX} ${py}`,
    ];
}

type SidePieces = {
    paths: string[];
    circles: { cx: number; cy: number; bye: number | null }[];
    numbers: { cx: number; cy: number; n: number }[];
    names: { x: number; y: number; side: 'L' | 'R'; name: string; team: string | null }[];
};

function TreePage({
    title,
    peso,
    pesoRange,
    result,
    generatedAt,
    athleteCount,
}: {
    title: string;
    peso: string | null;
    pesoRange: string | null;
    result: GenerateBracketResult;
    generatedAt: Date;
    athleteCount: number;
}) {
    const S = result.main_bracket_size;
    const R = result.total_rounds;
    const tier = sizeTier(S);
    const { D, NW, COL } = tier;

    const rounds: GeneratedMatch[][] = [];
    for (let r = 1; r <= R; r++) {
        rounds.push(result.matches.filter((m) => m.round === r && m.position !== 99).sort((a, b) => a.position - b.position));
    }

    // Centros verticais por rodada (iguais nos dois lados — só o x espelha).
    const rowH = CANVAS_H / (S / 2);
    const centers: number[][] = [];
    const c1: number[] = [];
    for (let i = 0; i < S / 4; i++) c1.push((2 * i + 1) * rowH);
    centers.push(c1);
    for (let r = 2; r <= R - 1; r++) {
        const prev = centers[r - 2];
        const cur: number[] = [];
        for (let j = 0; j < prev.length / 2; j++) cur.push((prev[2 * j] + prev[2 * j + 1]) / 2);
        centers.push(cur);
    }

    const circleX = (r: number) => NW + COL * (r - 0.5); // x do círculo da rodada r (lado esquerdo)
    const leftBlockRight = circleX(R - 1) + D / 2;
    const centerX = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const numX = D / 2 + 2;
    const nameX0 = D + 6;

    const mx = (x: number, side: 'L' | 'R') => (side === 'L' ? x : CANVAS_W - x);

    // Numeração: 1ª rodada, lado esquerdo (cima→baixo) depois direito.
    const r1 = rounds[0];
    const half = Math.floor(r1.length / 2);
    const leftR1 = r1.slice(0, half);
    const rightR1 = r1.slice(half);
    const numMap = new Map<string, number>(); // `${side}:${matchIdx}:${slot}` -> num
    let counter = 1;
    const assign = (side: 'L' | 'R', list: GeneratedMatch[]) => {
        list.forEach((m, idx) => {
            if (m.athlete_a_id) numMap.set(`${side}:${idx}:a`, counter++);
            if (m.athlete_b_id) numMap.set(`${side}:${idx}:b`, counter++);
        });
    };
    assign('L', leftR1);
    assign('R', rightR1);

    function buildSide(side: 'L' | 'R', r1Matches: GeneratedMatch[]): SidePieces {
        const paths: string[] = [];
        const circles: SidePieces['circles'] = [];
        const numbers: SidePieces['numbers'] = [];
        const names: SidePieces['names'] = [];
        const nameEndX = mx(NW, side);

        // Round 1
        r1Matches.forEach((m, i) => {
            const ya = (2 * i + 0.5) * rowH;
            const yb = (2 * i + 1.5) * rowH;
            const mc = (2 * i + 1) * rowH;
            const c1x = mx(circleX(1), side);

            const aNum = numMap.get(`${side}:${i}:a`) ?? null;
            const bNum = numMap.get(`${side}:${i}:b`) ?? null;

            if (m.athlete_a_id) {
                numbers.push({ cx: mx(numX, side), cy: ya, n: aNum! });
                names.push({ x: side === 'L' ? nameX0 : CANVAS_W - NW, y: ya, side, name: initialsName(m.athlete_a_name), team: m.team_a });
            }
            if (m.athlete_b_id) {
                numbers.push({ cx: mx(numX, side), cy: yb, n: bNum! });
                names.push({ x: side === 'L' ? nameX0 : CANVAS_W - NW, y: yb, side, name: initialsName(m.athlete_b_name), team: m.team_b });
            }

            if (m.is_bye) {
                const yP = m.athlete_a_id ? ya : yb;
                const byeNum = m.athlete_a_id ? aNum : bNum;
                paths.push(`M ${nameEndX} ${yP} L ${mx((NW + circleX(1)) / 2, side)} ${yP} L ${mx((NW + circleX(1)) / 2, side)} ${mc} L ${c1x} ${mc}`);
                circles.push({ cx: c1x, cy: mc, bye: byeNum });
            } else {
                if (m.athlete_a_id) paths.push(`M ${nameEndX} ${ya} L ${mx((NW + circleX(1)) / 2, side)} ${ya}`);
                if (m.athlete_b_id) paths.push(`M ${nameEndX} ${yb} L ${mx((NW + circleX(1)) / 2, side)} ${yb}`);
                paths.push(`M ${mx((NW + circleX(1)) / 2, side)} ${ya} L ${mx((NW + circleX(1)) / 2, side)} ${yb}`);
                paths.push(`M ${mx((NW + circleX(1)) / 2, side)} ${mc} L ${c1x} ${mc}`);
                circles.push({ cx: c1x, cy: mc, bye: null });
            }
        });

        // Rounds 2..R-1
        for (let r = 2; r <= R - 1; r++) {
            const cur = centers[r - 1];
            const prev = centers[r - 2];
            const cx = mx(circleX(r), side);
            const childX = mx(circleX(r - 1), side);
            cur.forEach((yc, j) => {
                elbow(childX, prev[2 * j], prev[2 * j + 1], cx).forEach((p) => paths.push(p));
                circles.push({ cx, cy: yc, bye: null });
            });
        }

        // Semifinal → centro
        const semiX = mx(circleX(R - 1), side);
        paths.push(`M ${semiX} ${cy} L ${side === 'L' ? centerX - 16 : centerX + 16} ${cy}`);

        return { paths, circles, numbers, names };
    }

    const left = buildSide('L', leftR1);
    const right = buildSide('R', rightR1);
    const all: SidePieces = {
        paths: [...left.paths, ...right.paths],
        circles: [...left.circles, ...right.circles],
        numbers: [...left.numbers, ...right.numbers],
        names: [...left.names, ...right.names],
    };

    const teamCount = (() => {
        const s = new Set<string>();
        result.placed_order.forEach((a) => s.add(a.team?.trim() ? a.team.trim() : 'Sem Equipe'));
        return s.size;
    })();
    const realFights = result.matches.filter((m) => !m.is_bye && m.position !== 99).length;

    // Pódio (centro, acima do X)
    const podiumW = Math.min(CANVAS_W - 2 * leftBlockRight - 24, 190);
    const podiumX = centerX - podiumW / 2;
    const podiumRows = [
        { label: '1º', y: cy - 152 },
        { label: '2º', y: cy - 126 },
        { label: '3º', y: cy - 100 },
    ];

    return (
        <Page size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
                <View style={styles.headerSide}>
                    {peso || pesoRange ? (
                        <>
                            <Text style={styles.pesoLabel}>Peso</Text>
                            {peso ? <Text style={styles.pesoValue}>{peso}</Text> : null}
                            {pesoRange ? <Text style={styles.pesoRange}>{pesoRange}</Text> : null}
                        </>
                    ) : null}
                </View>
                <View style={styles.titleWrap}>
                    <Text style={styles.superTitle}>Chaveamento</Text>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={[styles.pesoLabel, { marginTop: 1 }]}>
                        {athleteCount} atletas · {teamCount} equipes · {realFights} lutas
                    </Text>
                </View>
                <Image src="/logo.png" style={styles.logo} />
            </View>

            <View style={styles.canvas}>
                <Svg width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                    {all.paths.map((d, i) => (
                        <Path key={`p${i}`} d={d} stroke={LINE} strokeWidth={1} fill="none" />
                    ))}
                    {/* círculos vencedores (vazios) */}
                    {all.circles.map((c, i) => (
                        <Circle key={`c${i}`} cx={c.cx} cy={c.cy} r={D / 2} stroke={INK} strokeWidth={1.2} fill="#ffffff" />
                    ))}
                    {/* círculos de número (1ª rodada) */}
                    {all.numbers.map((n, i) => (
                        <Circle key={`n${i}`} cx={n.cx} cy={n.cy} r={D / 2} stroke={INK} strokeWidth={1} fill="#ffffff" />
                    ))}
                    {/* linhas do pódio */}
                    {podiumRows.map((p, i) => (
                        <Line key={`pl${i}`} x1={podiumX + 20} y1={p.y + 6} x2={podiumX + podiumW} y2={p.y + 6} stroke={INK} strokeWidth={1} />
                    ))}
                </Svg>

                {/* números dentro dos círculos da 1ª rodada */}
                {all.numbers.map((n, i) => (
                    <View key={`nt${i}`} style={{ position: 'absolute', left: n.cx - D / 2, top: n.cy - D / 2, width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[styles.numCircleText, { fontSize: tier.numSz }]}>{n.n}</Text>
                    </View>
                ))}

                {/* número pré-impresso (passe livre) dentro do círculo vencedor */}
                {all.circles.filter((c) => c.bye != null).map((c, i) => (
                    <View key={`bt${i}`} style={{ position: 'absolute', left: c.cx - D / 2, top: c.cy - D / 2, width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[styles.byeNum, { position: 'relative', fontSize: tier.numSz }]}>{c.bye}</Text>
                    </View>
                ))}

                {/* nomes + academia (1ª rodada) */}
                {all.names.map((nm, i) => (
                    <View
                        key={`nm${i}`}
                        style={{ position: 'absolute', left: nm.x, top: nm.y - (tier.nameSz + tier.teamSz + 3), width: NW - nameX0, alignItems: nm.side === 'L' ? 'flex-start' : 'flex-end' }}
                    >
                        <Text style={[styles.name, { fontSize: tier.nameSz, textAlign: nm.side === 'L' ? 'left' : 'right' }]}>{nm.name}</Text>
                        {nm.team ? <Text style={[styles.team, { fontSize: tier.teamSz, textAlign: nm.side === 'L' ? 'left' : 'right' }]}>{nm.team}</Text> : null}
                    </View>
                ))}

                {/* pódio: rótulos */}
                {podiumRows.map((p, i) => (
                    <Text key={`pr${i}`} style={[styles.podiumLabel, { left: podiumX, top: p.y, fontSize: tier.nameSz + 1 }]}>{p.label}</Text>
                ))}

                {/* Rótulo + X da final */}
                <Text style={[styles.finalLabel, { left: centerX - 60, top: cy - 52, width: 120, fontSize: tier.nameSz + 1 }]}>FINAL</Text>
                <Text style={[styles.xMark, { left: centerX - 12, top: cy - 11, width: 24, fontSize: 18 }]}>X</Text>

                {/* Critério do 3º lugar (sem disputa de 3º) */}
                <Text
                    style={[
                        styles.thirdNote,
                        { left: centerX - (podiumW + 90) / 2, top: cy + 52, width: podiumW + 90, fontSize: tier.nameSz + 2 },
                    ]}
                >
                    3º lugar: o semifinalista que perder para o campeão
                </Text>
            </View>

            <View style={styles.footer} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
        </Page>
    );
}

function WoPage({ title, woName, woTeam, generatedAt }: { title: string; woName: string | null; woTeam: string | null; generatedAt: Date }) {
    return (
        <Page size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
                <View style={styles.headerSide} />
                <View style={styles.titleWrap}>
                    <Text style={styles.superTitle}>Chaveamento</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>
                <Image src="/logo.png" style={styles.logo} />
            </View>
            <View style={{ marginTop: 50, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    W.O. — Campeão automático
                </Text>
                <Text style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{woName || '—'}</Text>
                {woTeam ? <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{woTeam}</Text> : null}
            </View>
            <View style={styles.footer} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
        </Page>
    );
}

// Final direta (2 atletas) e todos-contra-todos (3): layout simples numerado.
function SimplePage({
    title,
    peso,
    pesoRange,
    result,
    generatedAt,
}: {
    title: string;
    peso: string | null;
    pesoRange: string | null;
    result: GenerateBracketResult;
    generatedAt: Date;
}) {
    const atletas = result.placed_order;
    const numOf = new Map<string, number>();
    atletas.forEach((a, i) => numOf.set(a.id, i + 1));
    const matches = result.matches.filter((m) => !m.is_bye);

    return (
        <Page size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
                <View style={styles.headerSide}>
                    {peso || pesoRange ? (
                        <>
                            <Text style={styles.pesoLabel}>Peso</Text>
                            {peso ? <Text style={styles.pesoValue}>{peso}</Text> : null}
                            {pesoRange ? <Text style={styles.pesoRange}>{pesoRange}</Text> : null}
                        </>
                    ) : null}
                </View>
                <View style={styles.titleWrap}>
                    <Text style={styles.superTitle}>Chaveamento</Text>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={[styles.pesoLabel, { marginTop: 1 }]}>
                        {result.format === 'round_robin' ? 'Todos contra todos' : 'Final direta'}
                    </Text>
                </View>
                <Image src="/logo.png" style={styles.logo} />
            </View>

            <View style={{ marginTop: 18, alignItems: 'center', gap: 10 }}>
                {/* legenda numerada */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                    {atletas.map((a, i) => (
                        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 9, fontWeight: 700 }}>{i + 1}</Text>
                            </View>
                            <View style={{ flexDirection: 'column' }}>
                                <Text style={{ fontSize: 9, fontWeight: 700 }}>{a.name}</Text>
                                {result.format === 'final_only' && a.team ? (
                                    <Text style={[styles.team, { fontSize: 7.5 }]}>{a.team}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>
                {matches.map((m, idx) => (
                    <View key={`${m.round}-${m.position}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 9, color: '#6b7280' }}>Luta {idx + 1}</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 700 }}>{m.athlete_a_id ? numOf.get(m.athlete_a_id) : ''}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: 700 }}>X</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 700 }}>{m.athlete_b_id ? numOf.get(m.athlete_b_id) : ''}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.footer} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
        </Page>
    );
}

type Props = {
    eventTitle: string;
    categoryName: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    separationGroups?: string[][];
    pesoRangeLabel?: string | null;
    generatedAt?: Date;
};

// Extrai a classe de peso do título da categoria, se houver.
function extractPeso(categoryName: string): string | null {
    const peso = parseCategoria(categoryName).peso?.trim();
    return peso ? peso : null;
}

export function BracketTreePdfDocument({ categoryName, result, athletes, pesoRangeLabel = null, generatedAt = new Date() }: Props) {
    const isWO = result.format === 'wo';
    const woName = isWO && athletes[0] ? athletes[0].name : null;
    const woTeam = isWO && athletes[0]?.team?.trim() ? athletes[0].team.trim() : null;
    const peso = extractPeso(categoryName);

    return (
        <Document>
            {isWO ? (
                <WoPage title={categoryName} woName={woName} woTeam={woTeam} generatedAt={generatedAt} />
            ) : result.format === 'single_elimination' ? (
                <TreePage
                    title={categoryName}
                    peso={peso}
                    pesoRange={pesoRangeLabel}
                    result={result}
                    generatedAt={generatedAt}
                    athleteCount={athletes.length}
                />
            ) : (
                <SimplePage title={categoryName} peso={peso} pesoRange={pesoRangeLabel} result={result} generatedAt={generatedAt} />
            )}
        </Document>
    );
}

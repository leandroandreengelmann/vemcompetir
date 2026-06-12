import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Svg,
    Path,
    Image,
} from '@react-pdf/renderer';
import type {
    AthleteInput,
    GenerateBracketResult,
} from '@/lib/gestao-evento/bracket-generator';
import { teamColor } from '@/lib/gestao-evento/team-colors';
import {
    formatDateTime,
    bracketColumnLabel,
    buildFightOrder,
    type FightRow,
} from '@/lib/gestao-evento/bracket-pdf-shared';

// ─────────────────────────────────────────────────────────────────
// PDF "Chave (árvore)" — A4 RETRATO, para preencher à mão.
//
// Árvore esquerda → direita. 1ª rodada com nomes impressos; passe
// livre vai direto para a 2ª rodada. As rodadas seguintes saem em
// branco com bastante espaço para escrever "Atleta" e "Academia" à
// caneta. Colunas de escrita são mais largas. Sem disputa de 3º: o
// 3º é o semifinalista que perder para o campeão.
// ─────────────────────────────────────────────────────────────────

// A4 retrato em pontos
const PAGE_W = 595;
const PAGE_H = 842;
const PAD = 22;
const HEADER_H = 40;
const COLHEAD_H = 16;
const FOOTER_H = 16;

const CANVAS_W = PAGE_W - PAD * 2;
const CANVAS_H = PAGE_H - PAD * 2 - HEADER_H - COLHEAD_H - FOOTER_H;

const HDR = 11; // faixa do número da luta (LT-X / FINAL)
const V_GAP = 8;
const WRITE_BOX_MAX = 138; // altura máx. das caixas em branco (espaço de caneta)
const NAME_BOX_MAX = 86; // altura máx. das caixas com nome impresso

type Tier = {
    nameSz: number;
    teamSz: number;
    refSz: number;
    labelSz: number;
    stripeW: number;
};

function sizeTier(size: number): Tier {
    if (size <= 8) return { nameSz: 9.5, teamSz: 7.5, refSz: 7, labelSz: 7, stripeW: 5 };
    if (size <= 16) return { nameSz: 9, teamSz: 7, refSz: 6.8, labelSz: 6.8, stripeW: 4.5 };
    if (size <= 32) return { nameSz: 8, teamSz: 6.2, refSz: 6.2, labelSz: 6.2, stripeW: 4 };
    if (size <= 64) return { nameSz: 6.6, teamSz: 5.4, refSz: 5.2, labelSz: 5.2, stripeW: 3 };
    return { nameSz: 5.6, teamSz: 4.8, refSz: 4.6, labelSz: 4.6, stripeW: 2.4 };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Peso de largura por rodada. Mantemos colunas uniformes para os nomes
 * impressos (oitavas) caberem em 2 linhas sem sobrepor a equipe; o espaço
 * extra de escrita à caneta vem da ALTURA das caixas em branco (vertical,
 * onde sobra espaço), não da largura.
 */
function colWeight(_round: number, _totalRounds: number): number {
    void _round;
    void _totalRounds;
    return 1;
}

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        paddingTop: PAD,
        paddingBottom: PAD,
        paddingHorizontal: PAD,
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    headerRow: {
        height: HEADER_H,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        borderBottomWidth: 1.5,
        borderBottomColor: '#0f172a',
        paddingBottom: 4,
    },
    superTitle: {
        fontSize: 7,
        letterSpacing: 1.5,
        color: '#64748b',
        textTransform: 'uppercase',
    },
    title: { fontSize: 12, fontWeight: 700, maxWidth: 380 },
    metaCol: { alignItems: 'flex-end' },
    headerMeta: { fontSize: 7.5, color: '#475569', textAlign: 'right', marginBottom: 2 },
    headerLogo: { width: 86, height: 20, objectFit: 'contain' },
    colHeadRow: { position: 'relative', height: COLHEAD_H, marginTop: 4 },
    colHead: {
        position: 'absolute',
        top: 2,
        textAlign: 'center',
        fontSize: 7,
        fontWeight: 700,
        color: '#0f172a',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    colHeadRule: {
        position: 'absolute',
        top: COLHEAD_H - 2,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    canvas: { position: 'relative', width: CANVAS_W, height: CANVAS_H },
    box: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderRadius: 3,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
    },
    boxFinal: { borderWidth: 1.6, borderColor: '#b45309', backgroundColor: '#fffdf7' },
    ltHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        height: HDR,
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 0.6,
        borderBottomColor: '#e2e8f0',
        paddingHorizontal: 4,
    },
    ltHeaderText: { fontSize: 6.5, fontWeight: 700, color: '#475569', letterSpacing: 0.5 },
    finalHeader: {
        height: HDR + 1,
        textAlign: 'center',
        backgroundColor: '#b45309',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 8,
        letterSpacing: 1.5,
        paddingTop: 2,
    },
    slot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 5, gap: 5 },
    slotDivider: { height: 1, backgroundColor: '#e2e8f0' },
    stripe: { alignSelf: 'stretch' },
    textCol: { flex: 1, justifyContent: 'center' },
    textColWrite: { flex: 1, justifyContent: 'center', paddingVertical: 3 },
    name: { fontWeight: 700 },
    team: { color: '#64748b', marginTop: 1 },
    ref: { color: '#b45309', fontStyle: 'italic', marginBottom: 2 },
    writeLabel: { color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    writeLine: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
    thirdNote: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
        borderRadius: 4,
        padding: 7,
    },
    thirdNoteTitle: {
        fontSize: 8.5,
        fontWeight: 700,
        color: '#92400e',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    thirdNoteText: { fontSize: 7.5, color: '#92400e', lineHeight: 1.3 },
    footer: {
        position: 'absolute',
        bottom: 8,
        left: PAD,
        right: PAD,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7.5,
        color: '#94a3b8',
    },
});

type BoxLayout = {
    round: number;
    position: number;
    x: number;
    y: number;
    w: number;
    h: number;
    isFinal: boolean;
    displayNum: number | null;
    aName: string | null;
    aTeam: string | null;
    aFromMatch: number | null;
    bName: string | null;
    bTeam: string | null;
    bFromMatch: number | null;
};

/** Conteúdo de um lado (slot) da caixa. */
function Slot({
    name,
    team,
    fromMatch,
    slotH,
    tier,
}: {
    name: string | null;
    team: string | null;
    fromMatch: number | null;
    slotH: number;
    tier: Tier;
}) {
    // Atleta conhecido → imprime nome + equipe
    if (name) {
        const tc = teamColor(team);
        return (
            <View style={styles.slot}>
                <View style={[styles.stripe, { backgroundColor: tc.solid, width: tier.stripeW }]} />
                <View style={styles.textCol}>
                    <Text style={[styles.name, { fontSize: tier.nameSz }]}>{name}</Text>
                    {slotH >= 22 && team ? (
                        <Text style={[styles.team, { fontSize: tier.teamSz }]}>{team}</Text>
                    ) : null}
                </View>
            </View>
        );
    }

    // Slot em branco → linhas para escrever à mão (Atleta + Academia).
    // Distribui o espaço vertical entre as duas linhas, garantindo que o
    // conteúdo caiba na altura do slot (sem sobrepor o "vence LT-X").
    const refH = fromMatch ? tier.refSz + 4 : 0;
    const fixed = refH + tier.labelSz * 2 + 4 /* margem do 2º rótulo */ + 4 /* respiro */;
    const gap = clamp((slotH - fixed) / 2, 7, 22);
    return (
        <View style={styles.slot}>
            <View style={[styles.stripe, { backgroundColor: '#e2e8f0', width: tier.stripeW }]} />
            <View style={styles.textColWrite}>
                {fromMatch ? (
                    <Text style={[styles.ref, { fontSize: tier.refSz }]}>vence LT-{fromMatch}</Text>
                ) : null}
                <Text style={[styles.writeLabel, { fontSize: tier.labelSz }]}>Atleta</Text>
                <View style={[styles.writeLine, { marginTop: gap }]} />
                <Text style={[styles.writeLabel, { fontSize: tier.labelSz, marginTop: 4 }]}>Academia</Text>
                <View style={[styles.writeLine, { marginTop: gap }]} />
            </View>
        </View>
    );
}

function MatchBox({ b, tier }: { b: BoxLayout; tier: Tier }) {
    const headerH = b.isFinal || b.displayNum != null ? HDR : 0;
    const slotH = (b.h - headerH) / 2;
    return (
        <View
            style={[
                styles.box,
                ...(b.isFinal ? [styles.boxFinal] : []),
                { left: b.x, top: b.y, width: b.w, height: b.h },
            ]}
        >
            {b.isFinal ? (
                <Text style={styles.finalHeader}>FINAL</Text>
            ) : b.displayNum != null ? (
                <View style={styles.ltHeader}>
                    <Text style={styles.ltHeaderText}>LT-{b.displayNum}</Text>
                </View>
            ) : null}
            <Slot name={b.aName} team={b.aTeam} fromMatch={b.aFromMatch} slotH={slotH} tier={tier} />
            <View style={styles.slotDivider} />
            <Slot name={b.bName} team={b.bTeam} fromMatch={b.bFromMatch} slotH={slotH} tier={tier} />
        </View>
    );
}

function TreePage({
    categoryName,
    result,
    rows,
    generatedAt,
    athleteCount,
}: {
    categoryName: string;
    result: GenerateBracketResult;
    rows: FightRow[];
    generatedAt: Date;
    athleteCount: number;
}) {
    const { total_rounds, main_bracket_size } = result;
    const numCols = Math.max(total_rounds, 1);
    const tier = sizeTier(main_bracket_size);

    // Larguras de coluna variáveis (mais largas perto da final).
    const weights = Array.from({ length: numCols }, (_, i) => colWeight(i + 1, total_rounds));
    const sumW = weights.reduce((a, w) => a + w, 0) || 1;
    const colWArr = weights.map((w) => (w / sumW) * CANVAS_W);
    const colXArr: number[] = [];
    let acc = 0;
    for (let i = 0; i < numCols; i++) {
        colXArr.push(acc);
        acc += colWArr[i];
    }
    const colW = (round: number) => colWArr[round - 1] ?? CANVAS_W;
    const colX = (round: number) => colXArr[round - 1] ?? 0;
    const boxWOf = (round: number) => Math.max(colW(round) - 12, 64);

    const rowMap = new Map<string, FightRow>();
    rows.forEach((r) => rowMap.set(`${r.round}:${r.position}`, r));

    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
    const boxes: BoxLayout[] = [];

    // Round 1
    const r1Count = main_bracket_size / 2;
    const r1Step = r1Count > 0 ? CANVAS_H / r1Count : CANVAS_H;
    const r1GridH = clamp(r1Step - V_GAP, 24, NAME_BOX_MAX);
    const boxW1 = boxWOf(1);
    const isFinalR1 = total_rounds === 1;
    const r1Center = (p: number) => p * r1Step + r1Step / 2;

    // 1) Geometria: centro de cada slot da 1ª rodada (inclui passe livre),
    //    usado para centrar a 2ª rodada.
    for (let p = 0; p < r1Count; p++) {
        const m = result.matches.find((mm) => mm.round === 1 && mm.position === p);
        if (!m) continue;
        const c = r1Center(p);
        positions.set(`1:${p}`, { x: colX(1), y: c - r1GridH / 2, w: boxW1, h: r1GridH });
    }

    // 2) Render: só as lutas REAIS (passe livre vai direto p/ 2ª rodada). Cada
    //    caixa cresce até o espaço livre vizinho, para nunca cortar nome/equipe.
    type R1Item = { p: number; c: number; m: (typeof result.matches)[number]; r: FightRow | null };
    const realR1: R1Item[] = [];
    for (let p = 0; p < r1Count; p++) {
        const m = result.matches.find((mm) => mm.round === 1 && mm.position === p);
        if (!m) continue;
        if (m.is_bye && !isFinalR1) continue;
        realR1.push({ p, c: r1Center(p), m, r: rowMap.get(`1:${p}`) ?? null });
    }
    realR1.sort((a, b) => a.c - b.c);
    let prevBottom = 0;
    realR1.forEach((it, i) => {
        const nextBound = i < realR1.length - 1 ? realR1[i + 1].c : CANVAS_H;
        const band = nextBound - prevBottom;
        const maxH = isFinalR1 ? WRITE_BOX_MAX : NAME_BOX_MAX;
        const h = clamp(band - V_GAP, r1GridH, maxH);
        let y = clamp(it.c - h / 2, prevBottom, nextBound - h);
        y = clamp(y, 0, CANVAS_H - h);
        prevBottom = y + h + V_GAP;
        // Atualiza a posição com o centro REAL renderizado (o conector segue isso).
        positions.set(`1:${it.p}`, { x: colX(1), y, w: boxW1, h });
        boxes.push({
            round: 1,
            position: it.p,
            x: colX(1),
            y,
            w: boxW1,
            h,
            isFinal: isFinalR1,
            displayNum: it.r ? it.r.displayNum : null,
            aName: it.m.athlete_a_name,
            aTeam: it.m.team_a,
            aFromMatch: null,
            bName: it.m.athlete_b_name,
            bTeam: it.m.team_b,
            bFromMatch: null,
        });
    });

    // Rounds 2..N
    for (let round = 2; round <= total_rounds; round++) {
        const cnt = main_bracket_size / Math.pow(2, round);
        const isFinalRound = round === total_rounds;
        const stepR = cnt > 0 ? CANVAS_H / cnt : CANVAS_H;
        const avail = stepR - V_GAP;
        const boxW = boxWOf(round);
        for (let p = 0; p < cnt; p++) {
            const par1 = positions.get(`${round - 1}:${p * 2}`);
            const par2 = positions.get(`${round - 1}:${p * 2 + 1}`);
            if (!par1 || !par2) continue;
            const cy = (par1.y + par1.h / 2 + par2.y + par2.h / 2) / 2;
            const x = colX(round);
            const m = result.matches.find((mm) => mm.round === round && mm.position === p);
            const r = rowMap.get(`${round}:${p}`);
            const hasWrite =
                isFinalRound || !!(r && (r.aFromMatch != null || r.bFromMatch != null));
            const cap = hasWrite ? WRITE_BOX_MAX : NAME_BOX_MAX;
            const h = clamp(avail, 40, cap);
            const y = clamp(cy - h / 2, 0, CANVAS_H - h);
            boxes.push({
                round,
                position: p,
                x,
                y,
                w: boxW,
                h,
                isFinal: isFinalRound,
                displayNum: r ? r.displayNum : null,
                aName: m?.athlete_a_name ?? null,
                aTeam: m?.team_a ?? null,
                aFromMatch: r?.aFromMatch ?? null,
                bName: m?.athlete_b_name ?? null,
                bTeam: m?.team_b ?? null,
                bFromMatch: r?.bFromMatch ?? null,
            });
            positions.set(`${round}:${p}`, { x, y, w: boxW, h });
        }
    }

    // Conectores (pai → filho). Pula BYE (atleta já aparece no filho).
    const byeKeys = new Set<string>();
    result.matches.forEach((m) => {
        if (m.is_bye) byeKeys.add(`${m.round}:${m.position}`);
    });
    const connectors: string[] = [];
    for (const b of boxes) {
        if (b.round === 1) continue;
        const childX = b.x;
        const childY = b.y + b.h / 2;
        for (const pk of [`${b.round - 1}:${b.position * 2}`, `${b.round - 1}:${b.position * 2 + 1}`]) {
            if (byeKeys.has(pk)) continue;
            const par = positions.get(pk);
            if (!par) continue;
            const px = par.x + par.w;
            const py = par.y + par.h / 2;
            const midX = (px + childX) / 2;
            connectors.push(`M ${px} ${py} L ${midX} ${py} L ${midX} ${childY} L ${childX} ${childY}`);
        }
    }

    const teamCount = (() => {
        const s = new Set<string>();
        result.placed_order.forEach((a) => s.add(a.team?.trim() ? a.team.trim() : 'Sem Equipe'));
        return s.size;
    })();

    const realFights = result.matches.filter((m) => !m.is_bye && m.position !== 99).length;

    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.superTitle}>Chave para preencher</Text>
                    <Text style={styles.title}>{categoryName}</Text>
                </View>
                <View style={styles.metaCol}>
                    <Text style={styles.headerMeta}>
                        {athleteCount} atletas · {teamCount} equipes · {realFights} lutas
                    </Text>
                    <Image src="/logo.png" style={styles.headerLogo} />
                </View>
            </View>

            <View style={styles.colHeadRow}>
                {Array.from({ length: numCols }, (_, i) => {
                    const round = i + 1;
                    return (
                        <Text
                            key={i}
                            style={[styles.colHead, { left: colX(round), width: colW(round), fontSize: numCols >= 6 ? 6 : 7 }]}
                        >
                            {bracketColumnLabel(round, total_rounds)}
                        </Text>
                    );
                })}
                <View style={styles.colHeadRule} />
            </View>

            <View style={styles.canvas}>
                <Svg
                    width={CANVAS_W}
                    height={CANVAS_H}
                    viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    {connectors.map((d, i) => (
                        <Path key={i} d={d} stroke="#94a3b8" strokeWidth={0.8} fill="none" />
                    ))}
                </Svg>

                {boxes.map((b) => (
                    <MatchBox key={`${b.round}-${b.position}`} b={b} tier={tier} />
                ))}

                {/* Nota do 3º lugar (sem disputa) — canto inferior direito */}
                {total_rounds >= 2 && (
                    <View
                        style={[
                            styles.thirdNote,
                            { left: colX(numCols), top: CANVAS_H - 54, width: Math.max(colW(numCols) - 4, 120) },
                        ]}
                    >
                        <Text style={styles.thirdNoteTitle}>3º LUGAR</Text>
                        <Text style={styles.thirdNoteText}>
                            O semifinalista que perder para o campeão fica com o 3º lugar. Não há disputa de 3º.
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footer} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
        </Page>
    );
}

// ─────────────────────────────────────────────────────────────────
// W.O. (sem chave) — uma página simples
// ─────────────────────────────────────────────────────────────────

function WoPage({
    categoryName,
    woName,
    generatedAt,
}: {
    categoryName: string;
    woName: string | null;
    generatedAt: Date;
}) {
    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.superTitle}>Chave para preencher</Text>
                    <Text style={styles.title}>{categoryName}</Text>
                </View>
                <Image src="/logo.png" style={styles.headerLogo} />
            </View>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    W.O. — Campeão automático
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{woName || '—'}</Text>
            </View>
            <View style={styles.footer} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
        </Page>
    );
}

// ─────────────────────────────────────────────────────────────────
// Documento
// ─────────────────────────────────────────────────────────────────

type Props = {
    eventTitle: string;
    categoryName: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    separationGroups?: string[][];
    generatedAt?: Date;
};

export function BracketTreePdfDocument({
    categoryName,
    result,
    athletes,
    generatedAt = new Date(),
}: Props) {
    const isWO = result.format === 'wo';
    const woName = isWO && athletes[0] ? athletes[0].name : null;
    const rows = isWO ? [] : buildFightOrder(result);

    return (
        <Document>
            {isWO ? (
                <WoPage categoryName={categoryName} woName={woName} generatedAt={generatedAt} />
            ) : (
                <TreePage
                    categoryName={categoryName}
                    result={result}
                    rows={rows}
                    generatedAt={generatedAt}
                    athleteCount={athletes.length}
                />
            )}
        </Document>
    );
}

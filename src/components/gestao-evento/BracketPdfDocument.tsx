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
    GeneratedMatch,
} from '@/lib/gestao-evento/bracket-generator';
import { teamColor } from '@/lib/gestao-evento/team-colors';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function formatDateTime(d: Date): string {
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function roundLabel(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'FINAL';
    if (round === totalRounds - 1) return 'SEMIFINAL';
    return `${round}ª RODADA`;
}

type FightRow = {
    displayNum: number;
    round: number;
    position: number;
    sectionLabel: string;
    aName: string | null;
    aTeam: string | null;
    aFromMatch: number | null; // displayNum of parent (if name unknown)
    aFromKind: 'venc' | 'perd' | null;
    aAdvancedByBye: boolean;
    bName: string | null;
    bTeam: string | null;
    bFromMatch: number | null;
    bFromKind: 'venc' | 'perd' | null;
    bAdvancedByBye: boolean;
};

function buildFightOrder(result: GenerateBracketResult): FightRow[] {
    const realMatches = result.matches.filter((m) => !m.is_bye);
    const main = realMatches.filter((m) => m.position !== 99);
    const third = realMatches.find((m) => m.position === 99) ?? null;
    const isRoundRobin = result.format === 'round_robin';

    // Order: round 1 → round 2 → ... → semifinal → 3º lugar → final
    main.sort((a, b) => {
        if (a.round !== b.round) {
            // final (totalRounds) goes last — but only when there ARE multiple rounds (not round-robin)
            const aw = !isRoundRobin && a.round === result.total_rounds ? 1 : 0;
            const bw = !isRoundRobin && b.round === result.total_rounds ? 1 : 0;
            if (aw !== bw) return aw - bw;
            return a.round - b.round;
        }
        return a.position - b.position;
    });

    const ordered: GeneratedMatch[] = [];
    for (const m of main) {
        if (!isRoundRobin && m.round === result.total_rounds) continue; // final saved for last
        ordered.push(m);
    }
    if (third) ordered.push(third);
    if (!isRoundRobin) {
        const finalMatch = main.find((m) => m.round === result.total_rounds);
        if (finalMatch) ordered.push(finalMatch);
    }

    // Map (round,position) -> displayNum for "Venc. #X" lookups
    const numMap = new Map<string, number>();
    let seq = 0;
    const rows: FightRow[] = ordered.map((m) => {
        seq += 1;
        numMap.set(`${m.round}:${m.position}`, seq);
        return {
            displayNum: seq,
            round: m.round,
            position: m.position,
            sectionLabel: '',
            aName: m.athlete_a_name,
            aTeam: m.team_a,
            aFromMatch: null,
            aFromKind: null,
            aAdvancedByBye: false,
            bName: m.athlete_b_name,
            bTeam: m.team_b,
            bFromMatch: null,
            bFromKind: null,
            bAdvancedByBye: false,
        };
    });

    // Resolve "Venc. #X" / "Perd. #X"
    for (const row of rows) {
        if (row.position === 99) {
            // 3º lugar: perdedores das semifinais (round = totalRounds-1, posições 0 e 1)
            const sf1 = numMap.get(`${result.total_rounds - 1}:0`);
            const sf2 = numMap.get(`${result.total_rounds - 1}:1`);
            if (!row.aName && sf1) {
                row.aFromMatch = sf1;
                row.aFromKind = 'perd';
            }
            if (!row.bName && sf2) {
                row.bFromMatch = sf2;
                row.bFromKind = 'perd';
            }
            row.sectionLabel = 'DISPUTA DE 3º LUGAR';
            continue;
        }
        if (isRoundRobin) {
            row.sectionLabel = 'TODOS CONTRA TODOS';
        } else if (row.round === result.total_rounds) {
            row.sectionLabel = 'FINAL';
        } else {
            row.sectionLabel = roundLabel(row.round, result.total_rounds);
        }
        if (row.round > 1) {
            const parentA = numMap.get(`${row.round - 1}:${row.position * 2}`);
            const parentB = numMap.get(`${row.round - 1}:${row.position * 2 + 1}`);
            const parentAMatch = result.matches.find(
                (m) => m.round === row.round - 1 && m.position === row.position * 2,
            );
            const parentBMatch = result.matches.find(
                (m) => m.round === row.round - 1 && m.position === row.position * 2 + 1,
            );
            if (!row.aName && parentA) {
                row.aFromMatch = parentA;
                row.aFromKind = 'venc';
            } else if (row.aName && parentAMatch?.is_bye) {
                row.aAdvancedByBye = true;
            }
            if (!row.bName && parentB) {
                row.bFromMatch = parentB;
                row.bFromKind = 'venc';
            } else if (row.bName && parentBMatch?.is_bye) {
                row.bAdvancedByBye = true;
            }
        }
    }
    return rows;
}

// ─────────────────────────────────────────────────────────────────
// Página 1 — Ordem de lutas (portrait)
// ─────────────────────────────────────────────────────────────────

const page1 = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 40,
        fontSize: 10,
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 6,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#0f172a',
    },
    titleCol: {
        flex: 1,
    },
    titleLogo: {
        width: 110,
        height: 26,
        objectFit: 'contain',
    },
    superTitle: {
        fontSize: 8,
        letterSpacing: 2,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    title: {
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1.3,
    },
    subtitle: {
        fontSize: 9.5,
        color: '#475569',
        marginTop: 4,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginTop: 18,
        marginBottom: 6,
    },
    matchRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 5,
        minHeight: 110,
    },
    numCell: {
        width: 78,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 700,
        textAlign: 'center',
        paddingVertical: 46,
        letterSpacing: 0.5,
    },
    playersCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    playerSide: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 10,
    },
    playerStripe: {
        width: 6,
        alignSelf: 'stretch',
        borderRadius: 2,
    },
    playerNameCol: {
        flex: 1,
    },
    playerName: {
        fontSize: 14,
        fontWeight: 600,
    },
    playerTeam: {
        fontSize: 11,
        color: '#475569',
        marginTop: 3,
    },
    playerPlaceholder: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#94a3b8',
    },
    byeBadge: {
        marginTop: 3,
        alignSelf: 'flex-start',
        fontSize: 8.5,
        fontWeight: 700,
        color: '#92400e',
        backgroundColor: '#fef3c7',
        borderWidth: 0.6,
        borderColor: '#f59e0b',
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        letterSpacing: 0.4,
    },
    vsBadge: {
        alignSelf: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: '#94a3b8',
        paddingHorizontal: 6,
    },
    pageFooter: {
        position: 'absolute',
        bottom: 24,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#94a3b8',
    },
    woHero: {
        marginTop: 24,
        padding: 18,
        borderWidth: 2,
        borderColor: '#f59e0b',
        borderRadius: 6,
        alignItems: 'center',
        backgroundColor: '#fef3c7',
    },
    woLabel: {
        fontSize: 10,
        color: '#92400e',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: 700,
    },
    woName: {
        fontSize: 18,
        fontWeight: 700,
        marginTop: 6,
    },
    bracketOmitted: {
        marginTop: 10,
        marginBottom: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#64748b',
        backgroundColor: '#f1f5f9',
        fontSize: 9,
        color: '#475569',
    },
    placeholderRef: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#94a3b8',
        marginBottom: 8,
    },
    writeLineWrap: {
        marginTop: 2,
    },
    writeLineLabel: {
        fontSize: 9,
        color: '#94a3b8',
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    writeLine: {
        height: 1,
        backgroundColor: '#94a3b8',
        marginBottom: 12,
    },
});

function PlayerSlot({
    name,
    team,
    fromMatch,
    fromKind,
    advancedByBye,
}: {
    name: string | null;
    team: string | null;
    fromMatch: number | null;
    fromKind: 'venc' | 'perd' | null;
    advancedByBye?: boolean;
}) {
    if (name) {
        const tc = teamColor(team);
        return (
            <View style={page1.playerSide}>
                <View style={[page1.playerStripe, { backgroundColor: tc.solid }]} />
                <View style={page1.playerNameCol}>
                    <Text style={page1.playerName}>{name}</Text>
                    {team ? <Text style={page1.playerTeam}>{team}</Text> : null}
                    {advancedByBye ? (
                        <Text style={page1.byeBadge}>AVANÇOU POR BYE</Text>
                    ) : null}
                </View>
            </View>
        );
    }
    if (fromMatch) {
        return (
            <View style={page1.playerSide}>
                <View style={[page1.playerStripe, { backgroundColor: '#e2e8f0' }]} />
                <View style={page1.playerNameCol}>
                    <Text style={page1.placeholderRef}>
                        ({fromKind === 'perd' ? 'Perdedor' : 'Vencedor'} da LT-{fromMatch})
                    </Text>
                    <Text style={page1.writeLineLabel}>Atleta</Text>
                    <View style={page1.writeLine} />
                    <Text style={page1.writeLineLabel}>Academia</Text>
                    <View style={page1.writeLine} />
                </View>
            </View>
        );
    }
    return (
        <View style={page1.playerSide}>
            <View style={[page1.playerStripe, { backgroundColor: '#e2e8f0' }]} />
            <View style={page1.playerNameCol}>
                <Text style={page1.playerPlaceholder}>—</Text>
            </View>
        </View>
    );
}

function FightListPage({
    categoryName,
    athleteCount,
    rows,
    generatedAt,
    isWO,
    woName,
    bracketOmittedReason,
}: {
    categoryName: string;
    athleteCount: number;
    rows: FightRow[];
    generatedAt: Date;
    isWO: boolean;
    woName: string | null;
    bracketOmittedReason: string | null;
}) {
    // Group rows by sectionLabel (preserving order)
    const sections: { label: string; items: FightRow[] }[] = [];
    for (const r of rows) {
        const last = sections[sections.length - 1];
        if (last && last.label === r.sectionLabel) last.items.push(r);
        else sections.push({ label: r.sectionLabel, items: [r] });
    }

    return (
        <Page size="A4" style={page1.page}>
            <View style={page1.titleRow}>
                <View style={page1.titleCol}>
                    <Text style={page1.superTitle}>Ordem de lutas</Text>
                    <Text style={page1.title}>{categoryName}</Text>
                    <Text style={page1.subtitle}>
                        {athleteCount} {athleteCount === 1 ? 'atleta' : 'atletas'}
                        {' · '}
                        {rows.length} {rows.length === 1 ? 'luta' : 'lutas'} no total
                    </Text>
                </View>
                <Image src="/logo.png" style={page1.titleLogo} />
            </View>

            {isWO && woName && (
                <View style={page1.woHero}>
                    <Text style={page1.woLabel}>W.O. — Campeão automático</Text>
                    <Text style={page1.woName}>{woName}</Text>
                </View>
            )}

            {bracketOmittedReason && (
                <Text style={page1.bracketOmitted}>{bracketOmittedReason}</Text>
            )}

            {sections.map((sec, si) => {
                const [first, ...rest] = sec.items;
                return (
                    <View key={`${sec.label}-${si}`}>
                        {/* Header + first row stay glued, so a section never starts orphaned at page bottom */}
                        <View wrap={false}>
                            <Text style={page1.sectionLabel}>{sec.label}</Text>
                            {first && (
                                <View style={page1.matchRow}>
                                    <Text style={page1.numCell}>LT-{first.displayNum}</Text>
                                    <View style={page1.playersCell}>
                                        <PlayerSlot
                                            name={first.aName}
                                            team={first.aTeam}
                                            fromMatch={first.aFromMatch}
                                            fromKind={first.aFromKind}
                                            advancedByBye={first.aAdvancedByBye}
                                        />
                                        <Text style={page1.vsBadge}>VS</Text>
                                        <PlayerSlot
                                            name={first.bName}
                                            team={first.bTeam}
                                            fromMatch={first.bFromMatch}
                                            fromKind={first.bFromKind}
                                            advancedByBye={first.bAdvancedByBye}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                        {rest.map((r) => (
                            <View
                                key={`${r.round}-${r.position}`}
                                style={page1.matchRow}
                                wrap={false}
                            >
                                <Text style={page1.numCell}>LT-{r.displayNum}</Text>
                                <View style={page1.playersCell}>
                                    <PlayerSlot
                                        name={r.aName}
                                        team={r.aTeam}
                                        fromMatch={r.aFromMatch}
                                        fromKind={r.aFromKind}
                                        advancedByBye={r.aAdvancedByBye}
                                    />
                                    <Text style={page1.vsBadge}>VS</Text>
                                    <PlayerSlot
                                        name={r.bName}
                                        team={r.bTeam}
                                        fromMatch={r.bFromMatch}
                                        fromKind={r.bFromKind}
                                        advancedByBye={r.bAdvancedByBye}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                );
            })}

            <View style={page1.pageFooter} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                />
            </View>
        </Page>
    );
}

// ─────────────────────────────────────────────────────────────────
// Página 2 — Visão da chave (landscape, árvore)
// ─────────────────────────────────────────────────────────────────

const page2 = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 24,
        fontSize: 9,
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingBottom: 6,
        borderBottomWidth: 1.5,
        borderBottomColor: '#0f172a',
    },
    title: {
        fontSize: 14,
        fontWeight: 700,
    },
    subtitle: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2,
    },
    headerMeta: {
        fontSize: 8,
        color: '#475569',
        textAlign: 'right',
    },
    canvas: {
        position: 'relative',
        flex: 1,
    },
    columnHeadersRow: {
        position: 'relative',
        height: 18,
        marginBottom: 4,
    },
    columnHeader: {
        position: 'absolute',
        top: 2,
        textAlign: 'center',
        fontSize: 8,
        fontWeight: 700,
        color: '#0f172a',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    columnHeaderRule: {
        position: 'absolute',
        top: 14,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    matchBox: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderRadius: 3,
        backgroundColor: '#ffffff',
    },
    matchBoxFinal: {
        borderWidth: 2,
        borderColor: '#0f172a',
        backgroundColor: '#ffffff',
    },
    matchBoxThird: {
        borderWidth: 1.6,
        borderColor: '#b45309',
        backgroundColor: '#fffdf7',
    },
    slot: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 4,
        gap: 4,
    },
    slotDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    slotDividerFinal: {
        height: 1,
        backgroundColor: '#0f172a',
    },
    slotStripe: {
        alignSelf: 'stretch',
    },
    slotTextCol: {
        flex: 1,
    },
    slotName: {
        fontWeight: 600,
    },
    slotTeam: {
        color: '#64748b',
        marginTop: 0.5,
    },
    slotPlaceholder: {
        fontStyle: 'italic',
        color: '#94a3b8',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: 1,
        paddingVertical: 2,
    },
    headerBarThird: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#b45309',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: 1,
        paddingVertical: 2,
    },
    slotPrefix: {
        fontWeight: 700,
        color: '#0f172a',
        marginRight: 4,
    },
    slotPrefixBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontWeight: 700,
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 2,
        marginRight: 4,
    },
    pageFooter: {
        position: 'absolute',
        bottom: 12,
        left: 24,
        right: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7.5,
        color: '#94a3b8',
    },
});

type LayoutMatch = {
    round: number;
    position: number;
    x: number;
    y: number;
    w: number;
    h: number;
    aName: string | null;
    aTeam: string | null;
    aFromMatch: number | null;
    aFromKind: 'venc' | 'perd' | null;
    bName: string | null;
    bTeam: string | null;
    bFromMatch: number | null;
    bFromKind: 'venc' | 'perd' | null;
    displayNum: number | null;
    isFinal: boolean;
    isBye: boolean;
};

type Tier = {
    boxH: number;
    nameSz: number;
    teamSz: number;
    showTeam: boolean;
    stripeW: number;
    numTagSz: number;
    numTagPadX: number;
    numTagPadY: number;
};

function sizeTier(mainSize: number): Tier {
    if (mainSize <= 8)
        return { boxH: 56, nameSz: 9.5, teamSz: 8.5, showTeam: true, stripeW: 4.5, numTagSz: 7.5, numTagPadX: 4, numTagPadY: 1.5 };
    if (mainSize <= 16)
        return { boxH: 42, nameSz: 8.5, teamSz: 7.5, showTeam: true, stripeW: 4, numTagSz: 7, numTagPadX: 3.5, numTagPadY: 1.2 };
    if (mainSize <= 32)
        return { boxH: 28, nameSz: 7.5, teamSz: 6.5, showTeam: true, stripeW: 3, numTagSz: 6, numTagPadX: 3, numTagPadY: 1 };
    if (mainSize <= 64)
        return { boxH: 18, nameSz: 7, teamSz: 6, showTeam: true, stripeW: 2.5, numTagSz: 5.5, numTagPadX: 2.5, numTagPadY: 0.8 };
    if (mainSize <= 128)
        return { boxH: 11, nameSz: 5.5, teamSz: 4.8, showTeam: false, stripeW: 2, numTagSz: 4.8, numTagPadX: 2, numTagPadY: 0.5 };
    return { boxH: 8, nameSz: 4.8, teamSz: 4.2, showTeam: false, stripeW: 1.6, numTagSz: 4.2, numTagPadX: 1.6, numTagPadY: 0.4 };
}

const FINAL_BOX_H = 80;
const FINAL_NAME_SZ = 11;
const FINAL_TEAM_SZ = 9.5;
const FINAL_STRIPE_W = 5;

function bracketColumnLabel(round: number, totalRounds: number): string {
    const rev = totalRounds - round;
    if (rev === 0) return 'FINAL';
    if (rev === 1) return 'SEMIFINAL';
    if (rev === 2) return 'QUARTAS';
    if (rev === 3) return 'OITAVAS';
    if (rev === 4) return '16-AVOS';
    if (rev === 5) return '32-AVOS';
    if (rev === 6) return '64-AVOS';
    return `${round}ª RODADA`;
}

function BracketPage({
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
    const numCols = total_rounds;
    const PAGE_W = 842 - 48;
    const PAGE_H_TOTAL = 595 - 48 - 30 - 28 - 22; // padding + header + footer + col-headers
    const colW = numCols > 0 ? PAGE_W / numCols : PAGE_W;

    const tier = sizeTier(main_bracket_size);
    const thirdRow = rows.find((r) => r.position === 99);

    // Reserve space at bottom for the 3rd-place box (always in last column).
    const reserveBottom = thirdRow ? FINAL_BOX_H + 14 : 0;
    const usableH = PAGE_H_TOTAL - reserveBottom;

    const boxW = Math.max(colW - 12, 60);

    const rowMap = new Map<string, FightRow>();
    rows.forEach((r) => rowMap.set(`${r.round}:${r.position}`, r));

    const layoutMatches: LayoutMatch[] = [];
    const matchPositions = new Map<string, { x: number; y: number; w: number; h: number }>();

    // Round 1
    const round1Count = main_bracket_size / 2;
    const r1Step = round1Count > 0 ? usableH / round1Count : usableH;
    // Cap round-1 box height by available step so adjacent boxes never overlap visually
    const r1BoxH = Math.min(tier.boxH, Math.max(r1Step - 2, 8));
    for (let p = 0; p < round1Count; p++) {
        const m = result.matches.find((mm) => mm.round === 1 && mm.position === p);
        if (!m) continue;
        const x = 0;
        const y = p * r1Step + (r1Step - r1BoxH) / 2;
        const r = rowMap.get(`1:${p}`);
        const isFinal = total_rounds === 1;
        const h = isFinal ? FINAL_BOX_H : r1BoxH;
        const w = isFinal ? Math.max(colW - 12, 110) : boxW;
        layoutMatches.push({
            round: 1,
            position: p,
            x,
            y: isFinal ? y + (r1BoxH - h) / 2 : y,
            w,
            h,
            aName: m.athlete_a_name,
            aTeam: m.team_a,
            aFromMatch: null,
            aFromKind: null,
            bName: m.athlete_b_name,
            bTeam: m.team_b,
            bFromMatch: null,
            bFromKind: null,
            displayNum: r ? r.displayNum : null,
            isFinal,
            isBye: m.is_bye,
        });
        matchPositions.set(`1:${p}`, { x, y, w: boxW, h: r1BoxH });
    }

    // Round 2..N
    for (let round = 2; round <= total_rounds; round++) {
        const cnt = main_bracket_size / Math.pow(2, round);
        const isFinalRound = round === total_rounds;
        for (let p = 0; p < cnt; p++) {
            const parent1 = matchPositions.get(`${round - 1}:${p * 2}`);
            const parent2 = matchPositions.get(`${round - 1}:${p * 2 + 1}`);
            if (!parent1 || !parent2) continue;
            const x = (round - 1) * colW;
            const cy = (parent1.y + parent1.h / 2 + parent2.y + parent2.h / 2) / 2;
            const baseH = isFinalRound ? FINAL_BOX_H : tier.boxH;
            const baseW = isFinalRound ? Math.max(colW - 12, 110) : boxW;
            const y = cy - baseH / 2;
            const m = result.matches.find((mm) => mm.round === round && mm.position === p);
            const r = rowMap.get(`${round}:${p}`);
            layoutMatches.push({
                round,
                position: p,
                x,
                y,
                w: baseW,
                h: baseH,
                aName: m?.athlete_a_name ?? null,
                aTeam: m?.team_a ?? null,
                aFromMatch: r?.aFromMatch ?? null,
                aFromKind: r?.aFromKind ?? null,
                bName: m?.athlete_b_name ?? null,
                bTeam: m?.team_b ?? null,
                bFromMatch: r?.bFromMatch ?? null,
                bFromKind: r?.bFromKind ?? null,
                displayNum: r ? r.displayNum : null,
                isFinal: isFinalRound,
                isBye: m?.is_bye ?? false,
            });
            matchPositions.set(`${round}:${p}`, { x, y, w: baseW, h: baseH });
        }
    }

    // Track BYE matches so we don't render them or draw connectors from them
    const byeKeys = new Set<string>();
    result.matches.forEach((m) => {
        if (m.is_bye) byeKeys.add(`${m.round}:${m.position}`);
    });

    // Solid connector paths: parent → child (skip BYE parents — those athletes appear directly in the child)
    const connectorsSolid: string[] = [];
    for (const lm of layoutMatches) {
        if (lm.round === 1 || lm.isBye) continue;
        const p1Key = `${lm.round - 1}:${lm.position * 2}`;
        const p2Key = `${lm.round - 1}:${lm.position * 2 + 1}`;
        const p1 = matchPositions.get(p1Key);
        const p2 = matchPositions.get(p2Key);
        if (!p1 || !p2) continue;
        const childX = lm.x;
        const childY = lm.y + lm.h / 2;
        const midX = (p1.x + p1.w + childX) / 2;
        const visibleParents = [
            byeKeys.has(p1Key) ? null : p1,
            byeKeys.has(p2Key) ? null : p2,
        ].filter((par): par is { x: number; y: number; w: number; h: number } => !!par);
        for (const par of visibleParents) {
            const px = par.x + par.w;
            const py = par.y + par.h / 2;
            connectorsSolid.push(
                `M ${px} ${py} L ${midX} ${py} L ${midX} ${childY} L ${childX} ${childY}`,
            );
        }
    }

    // 3rd place: place at right column, below the canvas usable area, with dashed connectors from semis (round = totalRounds-1)
    const thirdBox = thirdRow
        ? {
              x: (numCols - 1) * colW,
              y: usableH + 14,
              w: Math.max(colW - 12, 110),
              h: FINAL_BOX_H,
          }
        : null;
    const connectorsDashed: string[] = [];
    if (thirdBox && total_rounds >= 2) {
        const semiR = total_rounds - 1;
        for (let p = 0; p <= 1; p++) {
            const sm = matchPositions.get(`${semiR}:${p}`);
            if (!sm) continue;
            const px = sm.x + sm.w;
            const py = sm.y + sm.h / 2;
            const tx = thirdBox.x;
            const ty = thirdBox.y + thirdBox.h / 2;
            const midX = (px + tx) / 2;
            connectorsDashed.push(
                `M ${px} ${py} L ${midX} ${py} L ${midX} ${ty} L ${tx} ${ty}`,
            );
        }
    }

    const teamCount = (() => {
        const s = new Set<string>();
        result.placed_order.forEach((a) => {
            const k = a.team?.trim() ? a.team.trim() : 'Sem Equipe';
            s.add(k);
        });
        return s.size;
    })();

    return (
        <Page size="A4" orientation="landscape" style={page2.page}>
            <View style={page2.headerRow}>
                <View>
                    <Text style={page2.title}>{categoryName}</Text>
                    <Text style={page2.subtitle}>Visão da chave · sorteio congelado</Text>
                </View>
                <Text style={page2.headerMeta}>
                    {athleteCount} atletas · {teamCount} equipes ·{' '}
                    {result.matches.filter((m) => !m.is_bye).length} lutas
                </Text>
            </View>

            {/* Cabeçalho de colunas */}
            <View style={page2.columnHeadersRow}>
                {Array.from({ length: numCols }, (_, i) => {
                    const round = i + 1;
                    const realCnt = result.matches.filter(
                        (m) => m.round === round && !m.is_bye && m.position !== 99,
                    ).length;
                    return (
                        <Text
                            key={i}
                            style={[
                                page2.columnHeader,
                                {
                                    left: i * colW,
                                    width: colW,
                                    fontSize: numCols >= 6 ? 7 : 8,
                                },
                            ]}
                        >
                            {bracketColumnLabel(round, total_rounds)}
                            {realCnt > 1 ? ` · ${realCnt} lutas` : ''}
                        </Text>
                    );
                })}
                <View
                    style={[
                        page2.columnHeaderRule,
                        { left: 0, right: 0 },
                    ]}
                />
            </View>

            <View style={page2.canvas}>
                <Svg
                    width={PAGE_W}
                    height={PAGE_H_TOTAL}
                    viewBox={`0 0 ${PAGE_W} ${PAGE_H_TOTAL}`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    {connectorsSolid.map((d, i) => (
                        <Path
                            key={`s-${i}`}
                            d={d}
                            stroke="#475569"
                            strokeWidth={1.2}
                            fill="none"
                        />
                    ))}
                    {connectorsDashed.map((d, i) => (
                        <Path
                            key={`d-${i}`}
                            d={d}
                            stroke="#b45309"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            fill="none"
                        />
                    ))}
                </Svg>

                {layoutMatches.filter((lm) => !lm.isBye).map((lm) => (
                    <MatchBox
                        key={`${lm.round}-${lm.position}`}
                        lm={lm}
                        tier={tier}
                    />
                ))}

                {thirdBox && thirdRow && (
                    <View
                        style={[
                            page2.matchBox,
                            page2.matchBoxThird,
                            {
                                left: thirdBox.x,
                                top: thirdBox.y,
                                width: thirdBox.w,
                                height: thirdBox.h,
                            },
                        ]}
                    >
                        <Text style={page2.headerBarThird}>
                            3º LUGAR · #{thirdRow.displayNum}
                        </Text>
                        <BracketSlot
                            name={thirdRow.aName}
                            team={thirdRow.aTeam}
                            fromMatch={thirdRow.aFromMatch}
                            fromKind={thirdRow.aFromKind}
                            nameSz={FINAL_NAME_SZ}
                            teamSz={FINAL_TEAM_SZ}
                            showTeam
                            stripeW={FINAL_STRIPE_W}
                        />
                        <View style={page2.slotDivider} />
                        <BracketSlot
                            name={thirdRow.bName}
                            team={thirdRow.bTeam}
                            fromMatch={thirdRow.bFromMatch}
                            fromKind={thirdRow.bFromKind}
                            nameSz={FINAL_NAME_SZ}
                            teamSz={FINAL_TEAM_SZ}
                            showTeam
                            stripeW={FINAL_STRIPE_W}
                        />
                    </View>
                )}
            </View>

            <View style={page2.pageFooter} fixed>
                <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                <Text
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                />
            </View>
        </Page>
    );
}

function MatchBox({ lm, tier }: { lm: LayoutMatch; tier: Tier }) {
    const nameSz = lm.isFinal ? FINAL_NAME_SZ : tier.nameSz;
    const teamSz = lm.isFinal ? FINAL_TEAM_SZ : tier.teamSz;
    const showTeam = lm.isFinal ? true : tier.showTeam;
    const stripeW = lm.isFinal ? FINAL_STRIPE_W : tier.stripeW;
    const prefix = lm.displayNum != null ? `#${lm.displayNum}` : null;
    return (
        <View
            style={[
                page2.matchBox,
                ...(lm.isFinal ? [page2.matchBoxFinal] : []),
                { left: lm.x, top: lm.y, width: lm.w, height: lm.h },
            ]}
        >
            {lm.isFinal && lm.displayNum != null && (
                <Text style={page2.headerBar}>FINAL · #{lm.displayNum}</Text>
            )}
            <BracketSlot
                name={lm.aName}
                team={lm.aTeam}
                fromMatch={lm.aFromMatch}
                fromKind={lm.aFromKind}
                nameSz={nameSz}
                teamSz={teamSz}
                showTeam={showTeam}
                stripeW={stripeW}
                prefix={lm.isFinal ? null : prefix}
                prefixSz={tier.numTagSz}
            />
            <View style={lm.isFinal ? page2.slotDividerFinal : page2.slotDivider} />
            <BracketSlot
                name={lm.bName}
                team={lm.bTeam}
                fromMatch={lm.bFromMatch}
                fromKind={lm.bFromKind}
                nameSz={nameSz}
                teamSz={teamSz}
                showTeam={showTeam}
                stripeW={stripeW}
            />
        </View>
    );
}

function BracketSlot({
    name,
    team,
    fromMatch,
    fromKind,
    nameSz,
    teamSz,
    showTeam,
    stripeW,
    prefix,
    prefixSz,
}: {
    name: string | null;
    team: string | null;
    fromMatch: number | null;
    fromKind: 'venc' | 'perd' | null;
    nameSz: number;
    teamSz: number;
    showTeam: boolean;
    stripeW: number;
    prefix?: string | null;
    prefixSz?: number;
}) {
    const PrefixTag = prefix ? (
        <Text
            style={[
                page2.slotPrefixBox,
                { fontSize: prefixSz ?? nameSz - 1 },
            ]}
        >
            {prefix}
        </Text>
    ) : null;
    if (name) {
        const tc = teamColor(team);
        return (
            <View style={page2.slot}>
                <View
                    style={[
                        page2.slotStripe,
                        { backgroundColor: tc.solid, width: stripeW },
                    ]}
                />
                {PrefixTag}
                <View style={page2.slotTextCol}>
                    <Text style={[page2.slotName, { fontSize: nameSz }]}>{name}</Text>
                    {showTeam && team ? (
                        <Text style={[page2.slotTeam, { fontSize: teamSz }]}>{team}</Text>
                    ) : null}
                </View>
            </View>
        );
    }
    return (
        <View style={page2.slot}>
            <View
                style={[
                    page2.slotStripe,
                    { backgroundColor: '#e2e8f0', width: stripeW },
                ]}
            />
            {PrefixTag}
            <View style={page2.slotTextCol}>
                <Text style={[page2.slotPlaceholder, { fontSize: nameSz }]}>
                    {fromMatch
                        ? `${fromKind === 'perd' ? 'Perd.' : 'Venc.'} #${fromMatch}`
                        : '—'}
                </Text>
            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────
// Documento principal
// ─────────────────────────────────────────────────────────────────

type Props = {
    eventTitle: string;
    categoryName: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    separationGroups?: string[][];
    generatedAt?: Date;
};

export function BracketPdfDocument({
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
            <FightListPage
                categoryName={categoryName}
                athleteCount={athletes.length}
                rows={rows}
                generatedAt={generatedAt}
                isWO={isWO}
                woName={woName}
                bracketOmittedReason={null}
            />
        </Document>
    );
}

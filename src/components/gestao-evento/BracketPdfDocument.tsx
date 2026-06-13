import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from '@react-pdf/renderer';
import type {
    AthleteInput,
    GenerateBracketResult,
} from '@/lib/gestao-evento/bracket-generator';
import { teamColor } from '@/lib/gestao-evento/team-colors';
import {
    formatDateTime,
    buildFightOrder,
    type FightRow,
} from '@/lib/gestao-evento/bracket-pdf-shared';
import { parseCategoria } from '@/lib/gestao-evento/parse-categoria';

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
    pesoBadge: {
        alignSelf: 'flex-start',
        marginTop: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#0f172a',
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        letterSpacing: 0.3,
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
    thirdNote: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#b45309',
        backgroundColor: '#fffbeb',
        fontSize: 9,
        color: '#92400e',
        fontWeight: 700,
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
    pesoRangeLabel,
    bracketOmittedReason,
    showThirdNote,
}: {
    categoryName: string;
    athleteCount: number;
    rows: FightRow[];
    generatedAt: Date;
    isWO: boolean;
    woName: string | null;
    pesoRangeLabel: string | null;
    bracketOmittedReason: string | null;
    showThirdNote: boolean;
}) {
    const pesoClasse = parseCategoria(categoryName).peso?.trim() || null;
    const peso = [pesoClasse, pesoRangeLabel].filter(Boolean).join(' · ') || null;

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
                    {peso ? <Text style={page1.pesoBadge}>Peso: {peso}</Text> : null}
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

            {showThirdNote && (
                <Text style={page1.thirdNote}>
                    3º lugar: o semifinalista que perder para o campeão fica com o 3º lugar (não há disputa de 3º).
                </Text>
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
// Documento principal
// ─────────────────────────────────────────────────────────────────

type Props = {
    eventTitle: string;
    categoryName: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    separationGroups?: string[][];
    pesoRangeLabel?: string | null;
    generatedAt?: Date;
};

export function BracketPdfDocument({
    categoryName,
    result,
    athletes,
    pesoRangeLabel = null,
    generatedAt = new Date(),
}: Props) {
    const isWO = result.format === 'wo';
    const woName = isWO && athletes[0] ? athletes[0].name : null;
    const rows = isWO ? [] : buildFightOrder(result);
    const showThirdNote =
        !isWO && result.format === 'single_elimination' && result.total_rounds >= 2;

    return (
        <Document>
            <FightListPage
                categoryName={categoryName}
                athleteCount={athletes.length}
                rows={rows}
                generatedAt={generatedAt}
                isWO={isWO}
                woName={woName}
                pesoRangeLabel={pesoRangeLabel}
                bracketOmittedReason={null}
                showThirdNote={showThirdNote}
            />
        </Document>
    );
}

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from '@react-pdf/renderer';
import { TeamSummary, ScoringConfig } from '../../../equipes-actions';

// ── Constants ──────────────────────────────────────────────────────────────
const COLUMNS = 2; // Number of columns per medal type

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 28,
        fontSize: 9,
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
    },
    // ── Document header (first page only) ──
    docHeader: {
        marginBottom: 16,
        borderBottom: '2 solid #1a1a1a',
        paddingBottom: 8,
    },
    docTitle: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
    },
    docLegend: {
        fontSize: 8,
        color: '#555',
    },
    // ── Team header ──
    teamHeader: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderRadius: 3,
    },
    teamHeaderOrganizer: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderRadius: 3,
    },
    teamName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
    },
    organizerTag: {
        fontSize: 9,
        color: '#1d4ed8',
        marginLeft: 6,
    },
    teamMeta: {
        fontSize: 9,
        color: '#555',
    },
    // ── Fixed page banner ──
    fixedBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 5,
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    fixedBannerText: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
    },
    fixedBannerSub: {
        fontSize: 7,
        color: '#ccc',
    },
    // ── Medal section ──
    medalSection: {
        marginBottom: 14,
    },
    medalTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 6,
    },
    columnsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    column: {
        flex: 1,
    },
    // ── Each athlete name row ──
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    lineNumber: {
        width: 16,
        fontSize: 7,
        color: '#aaa',
    },
    nameLine: {
        flex: 1,
        borderBottom: '0.5 solid #999',
        height: 13,
    },
    ptsLabel: {
        width: 28,
        fontSize: 7,
        textAlign: 'right',
        color: '#555',
        marginLeft: 3,
    },
    // ── Subtotal ──
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    subtotalLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#444',
    },
    subtotalBox: {
        width: 70,
        borderBottom: '1 solid #555',
        height: 12,
    },
    // ── Total row ──
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTop: '2 solid #1a1a1a',
        gap: 6,
    },
    totalLabel: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    totalBox: {
        width: 90,
        borderBottom: '2 solid #1a1a1a',
        height: 14,
    },
    footer: {
        marginTop: 16,
        fontSize: 7,
        color: '#bbb',
        textAlign: 'center',
    },
});

interface TeamScoringPDFProps {
    eventTitle: string;
    teams: TeamSummary[];
    config: ScoringConfig;
}

interface Medal {
    label: string;
    pts: number;
}

// Renders a single academy's scoring sheet (may span multiple pages)
function TeamSheet({ team, idx, medals, isFirst, eventTitle, legendText, linesPerColumn }: {
    team: TeamSummary;
    idx: number;
    medals: Medal[];
    isFirst: boolean;
    eventTitle: string;
    legendText: string;
    linesPerColumn: number;
}) {
    return (
        <Page size="A4" style={[styles.page, { paddingTop: 46 }]} break>
            {/* Fixed team banner — repeats on every page for this academy */}
            <View style={styles.fixedBanner} fixed>
                <Text style={styles.fixedBannerText}>
                    {idx + 1}. {team.team_name.toUpperCase()}
                    {team.is_organizer ? '  (Organizadora)' : ''}
                </Text>
                <Text style={styles.fixedBannerSub}>{eventTitle}</Text>
            </View>

            {/* Show doc header only on the first page */}
            {isFirst && (
                <View style={styles.docHeader} fixed={false}>
                    <Text style={styles.docTitle}>{eventTitle} — Pontuacao por Equipe</Text>
                    <Text style={styles.docLegend}>{legendText}</Text>
                </View>
            )}

            {/* Team name header — also repeated on every page */}
            <View style={team.is_organizer ? styles.teamHeaderOrganizer : styles.teamHeader} fixed>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.teamName}>
                        {idx + 1}. {team.team_name.toUpperCase()}
                    </Text>
                    {team.is_organizer && (
                        <Text style={styles.organizerTag}>(Organizadora)</Text>
                    )}
                </View>
                <Text style={styles.teamMeta}>
                    {team.total_athletes} atleta{team.total_athletes !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Medal sections */}
            {medals.map(medal => (
                <View key={medal.label} style={styles.medalSection} wrap={false}>
                    <Text style={styles.medalTitle}>
                        {medal.label}  ({medal.pts} pts cada)
                    </Text>

                    {/* Two columns */}
                    <View style={styles.columnsRow}>
                        {Array.from({ length: COLUMNS }).map((_, colIdx) => (
                            <View key={colIdx} style={styles.column}>
                                {Array.from({ length: linesPerColumn }).map((_, lineIdx) => {
                                    const globalNum = colIdx * linesPerColumn + lineIdx + 1;
                                    return (
                                        <View key={lineIdx} style={styles.nameRow}>
                                            <Text style={styles.lineNumber}>{globalNum}.</Text>
                                            <View style={styles.nameLine} />
                                            <Text style={styles.ptsLabel}>={medal.pts}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Subtotal {medal.label}:</Text>
                        <View style={styles.subtotalBox} />
                    </View>
                </View>
            ))}

            {/* Total */}
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL GERAL:</Text>
                <View style={styles.totalBox} />
            </View>

            <Text style={styles.footer}>
                Gerado por Competir · {new Date().toLocaleDateString('pt-BR')}
            </Text>
        </Page>
    );
}

export function TeamScoringPDF({ eventTitle, teams, config }: TeamScoringPDFProps) {
    const linesPerColumn = config.lines_per_column || 10;

    const medals: Medal[] = [
        { label: 'OURO', pts: config.gold },
        { label: 'PRATA', pts: config.silver },
        { label: 'BRONZE', pts: config.bronze },
        ...(config.fourth > 0 ? [{ label: '4 LUGAR', pts: config.fourth }] : []),
    ];

    const legendText = medals.map(m => `${m.label} = ${m.pts} pts`).join('   |   ');

    return (
        <Document>
            {teams.map((team, i) => (
                <TeamSheet
                    key={team.team_slug}
                    team={team}
                    idx={i}
                    medals={medals}
                    isFirst={i === 0}
                    eventTitle={eventTitle}
                    legendText={legendText}
                    linesPerColumn={linesPerColumn}
                />
            ))}
        </Document>
    );
}

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from '@react-pdf/renderer';
import { TeamSummary, ScoringConfig } from '../../../equipes-actions';
import { PDF_COLORS, MEDAL_STYLES, MedalKey } from '@/lib/pdf-design-tokens';

// ── Constants ──────────────────────────────────────────────────────────────
const COLUMNS = 2;
const C = PDF_COLORS;

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        paddingTop: 52,
        paddingHorizontal: 28,
        paddingBottom: 28,
        fontSize: 9,
        backgroundColor: C.bgWhite,
        color: C.textDark,
    },
    // ── Fixed brand header (repeats every page) ──
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: C.brand,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingTop: 9,
        paddingBottom: 9,
    },
    logo: {
        width: 88,
        height: 22,
        objectFit: 'contain',
    },
    logoFallback: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    headerEventTitle: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerTeamLabel: {
        fontSize: 7,
        color: '#94A3B8',
        marginTop: 2,
    },
    // ── Gold accent line below header ──
    goldLine: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: C.gold,
    },
    // ── Team section header ──
    teamHeader: {
        backgroundColor: C.bgAlt,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderLeft: `3 solid ${C.brand}`,
    },
    teamHeaderOrganizer: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderLeft: `3 solid ${C.gold}`,
    },
    teamName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: C.textDark,
    },
    organizerTag: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: C.gold,
        marginLeft: 6,
    },
    teamMeta: {
        fontSize: 8,
        color: C.textMid,
    },
    // ── Medal section ──
    medalSection: {
        marginBottom: 14,
    },
    medalHeader: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    medalHeaderTitle: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
    },
    medalHeaderPts: {
        fontSize: 8,
    },
    // ── Name rows ──
    columnsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    column: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    lineNumber: {
        width: 16,
        fontSize: 7,
        color: C.textFaint,
    },
    nameLine: {
        flex: 1,
        borderBottom: `0.5 solid ${C.border}`,
        height: 13,
    },
    ptsLabel: {
        width: 36,
        fontSize: 7,
        textAlign: 'right',
        color: C.textMid,
        marginLeft: 3,
    },
    // ── Legend bar ──
    legendRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: C.bgAlt,
        borderRadius: 2,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 7,
        color: C.textMid,
    },
    legendBold: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: C.textDark,
    },
    // ── Subtotal ──
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    subtotalLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: C.textMid,
    },
    subtotalBox: {
        width: 70,
        borderBottom: `1 solid ${C.textMid}`,
        height: 12,
    },
    // ── Total ──
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTop: `2 solid ${C.brand}`,
        gap: 8,
    },
    totalLabel: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: C.brand,
    },
    totalBox: {
        width: 90,
        borderBottom: `2 solid ${C.brand}`,
        height: 14,
    },
    // ── Footer ──
    footer: {
        marginTop: 10,
        paddingTop: 6,
        borderTop: `0.5 solid ${C.border}`,
        fontSize: 7,
        color: C.textFaint,
        textAlign: 'center',
    },
});

// ── Types ───────────────────────────────────────────────────────────────────
interface Medal {
    label: string;
    pts: number;
}

export interface TeamScoringPDFProps {
    eventTitle: string;
    teams: TeamSummary[];
    config: ScoringConfig;
    logoUrl?: string;
}

// ── TeamSheet ───────────────────────────────────────────────────────────────
function TeamSheet({ team, idx, medals, eventTitle, linesPerColumn, logoUrl }: {
    team: TeamSummary;
    idx: number;
    medals: Medal[];
    eventTitle: string;
    linesPerColumn: number;
    logoUrl?: string;
}) {
    return (
        <Page size="A4" style={styles.page} break>

            {/* ── Fixed brand header ── */}
            <View style={styles.fixedHeader} fixed>
                {logoUrl ? (
                    <Image src={logoUrl} style={styles.logo} />
                ) : (
                    <Text style={styles.logoFallback}>COMPETIR</Text>
                )}
                <View style={styles.headerRight}>
                    <Text style={styles.headerEventTitle}>{eventTitle.toUpperCase()}</Text>
                    <Text style={styles.headerTeamLabel}>
                        {idx + 1}. {team.team_name.toUpperCase()}
                        {team.is_organizer ? ' · ORGANIZADORA' : ''}
                    </Text>
                </View>
            </View>

            {/* ── Gold accent line ── */}
            <View style={styles.goldLine} fixed />

            {/* ── Team section header ── */}
            <View style={team.is_organizer ? styles.teamHeaderOrganizer : styles.teamHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.teamName}>
                        {idx + 1}. {team.team_name.toUpperCase()}
                    </Text>
                    {team.is_organizer && (
                        <Text style={styles.organizerTag}>· ORGANIZADORA</Text>
                    )}
                </View>
                <Text style={styles.teamMeta}>
                    {team.total_athletes} atleta{team.total_athletes !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* ── Legend summary bar ── */}
            <View style={styles.legendRow}>
                {medals.map(medal => {
                    const mc = MEDAL_STYLES[medal.label as MedalKey] ?? {
                        bg: C.medal4thBg, border: C.medal4thBorder, text: C.medal4thText, label: medal.label,
                    };
                    return (
                        <View key={medal.label} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: mc.border }]} />
                            <Text style={styles.legendBold}>{mc.label}</Text>
                            <Text style={styles.legendText}>= {medal.pts} pt</Text>
                        </View>
                    );
                })}
            </View>

            {/* ── Medal sections ── */}
            {medals.map(medal => {
                const mc = MEDAL_STYLES[medal.label as MedalKey] ?? {
                    bg: C.medal4thBg, border: C.medal4thBorder, text: C.medal4thText, label: medal.label,
                };
                return (
                    <View key={medal.label} style={styles.medalSection} wrap={false}>
                        {/* Color-coded header */}
                        <View style={[styles.medalHeader, {
                            backgroundColor: mc.bg,
                            borderLeft: `3 solid ${mc.border}`,
                        }]}>
                            <Text style={[styles.medalHeaderTitle, { color: mc.text }]}>
                                {mc.label}
                            </Text>
                            <Text style={[styles.medalHeaderPts, { color: mc.text }]}>
                                {medal.pts} pts cada
                            </Text>
                        </View>

                        {/* Two columns of name lines */}
                        <View style={styles.columnsRow}>
                            {Array.from({ length: COLUMNS }).map((_, colIdx) => (
                                <View key={colIdx} style={styles.column}>
                                    {Array.from({ length: linesPerColumn }).map((_, lineIdx) => {
                                        const globalNum = colIdx * linesPerColumn + lineIdx + 1;
                                        return (
                                            <View key={lineIdx} style={styles.nameRow}>
                                                <Text style={styles.lineNumber}>{globalNum}.</Text>
                                                <View style={styles.nameLine} />
                                                <Text style={styles.ptsLabel}>={medal.pts} pt</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>

                        <View style={styles.subtotalRow}>
                            <Text style={styles.subtotalLabel}>Subtotal {mc.label}:</Text>
                            <View style={styles.subtotalBox} />
                        </View>
                    </View>
                );
            })}

            {/* ── Grand total ── */}
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL GERAL:</Text>
                <View style={styles.totalBox} />
            </View>

            {/* ── Footer ── */}
            <Text style={styles.footer} fixed>
                Competir · Pontuação por Equipe · Gerado em {new Date().toLocaleDateString('pt-BR')}
            </Text>
        </Page>
    );
}

// ── Document root ────────────────────────────────────────────────────────────
export function TeamScoringPDF({ eventTitle, teams, config, logoUrl }: TeamScoringPDFProps) {
    const linesPerColumn = config.lines_per_column || 10;

    const medals: Medal[] = [
        { label: 'OURO',    pts: config.gold },
        { label: 'PRATA',   pts: config.silver },
        { label: 'BRONZE',  pts: config.bronze },
        ...(config.fourth > 0 ? [{ label: '4 LUGAR', pts: config.fourth }] : []),
    ];

    return (
        <Document>
            {teams.map((team, i) => (
                <TeamSheet
                    key={team.team_slug}
                    team={team}
                    idx={i}
                    medals={medals}
                    eventTitle={eventTitle}
                    linesPerColumn={linesPerColumn}
                    logoUrl={logoUrl}
                />
            ))}
        </Document>
    );
}

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from '@react-pdf/renderer';
import { TeamAthlete } from '../../../equipes-actions';
import { PDF_COLORS } from '@/lib/pdf-design-tokens';

const C = PDF_COLORS;

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 36,
        fontSize: 10,
        backgroundColor: C.bgWhite,
        color: C.textDark,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: C.brand,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 10,
    },
    logo: { width: 96, height: 24, objectFit: 'contain' },
    logoFallback: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    headerRight: { alignItems: 'flex-end' },
    headerEventTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerTeamLabel: { fontSize: 8, color: '#94A3B8', marginTop: 2 },
    goldLine: {
        position: 'absolute',
        top: 44,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: C.gold,
    },
    teamHeader: {
        backgroundColor: C.bgAlt,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        borderLeft: `3 solid ${C.brand}`,
    },
    teamName: {
        fontSize: 15,
        fontFamily: 'Helvetica-Bold',
        color: C.textDark,
    },
    teamMetaRow: {
        flexDirection: 'row',
        gap: 14,
        marginTop: 4,
    },
    teamMeta: { fontSize: 9, color: C.textMid },
    teamMetaBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.textDark },
    // Table
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: C.brand,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    th: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottom: `0.5 solid ${C.border}`,
    },
    tableRowAlt: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottom: `0.5 solid ${C.border}`,
        backgroundColor: C.bgAlt,
    },
    td: { fontSize: 9.5, color: C.textDark },
    tdMuted: { fontSize: 9.5, color: C.textMid },
    cellNum: { width: 24 },
    cellName: { flex: 1, paddingRight: 4 },
    cellSex: { width: 28, textAlign: 'center' },
    cellAge: { width: 30, textAlign: 'center' },
    cellBirth: { width: 72, textAlign: 'center' },
    cellWeight: { width: 48, textAlign: 'right' },
    cellBelt: { width: 60, paddingLeft: 4 },
    cellCat: { width: 170, paddingLeft: 4 },
    catLine: { fontSize: 9, color: C.textDark, marginBottom: 1.5 },
    catModBadge: {
        fontFamily: 'Helvetica-Bold',
        color: C.brand,
    },
    catModBadgeNoGi: {
        fontFamily: 'Helvetica-Bold',
        color: '#7C2D12',
    },
    footer: {
        position: 'absolute',
        bottom: 14,
        left: 24,
        right: 24,
        paddingTop: 6,
        borderTop: `0.5 solid ${C.border}`,
        fontSize: 8,
        color: C.textFaint,
        textAlign: 'center',
    },
    pageNumber: {
        position: 'absolute',
        bottom: 14,
        right: 24,
        fontSize: 8,
        color: C.textFaint,
    },
});

export interface TeamAthletesPDFProps {
    eventTitle: string;
    teamName: string;
    masterName: string | null;
    athletes: TeamAthlete[];
    logoUrl?: string;
}

function calculateAge(birthDate: string | null): string {
    if (!birthDate) return '-';
    const bd = new Date(birthDate);
    if (isNaN(bd.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age >= 0 ? String(age) : '-';
}

function formatBirthDate(d: string | null): string {
    if (!d) return '-';
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '-';
    return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatSexo(s: string | null): string {
    if (!s) return '-';
    const lower = s.toLowerCase();
    if (lower.startsWith('m')) return 'M';
    if (lower.startsWith('f')) return 'F';
    return s.charAt(0).toUpperCase();
}

function formatPeso(w: number | null): string {
    if (w == null) return '-';
    return Number.isInteger(w) ? `${w}kg` : `${w.toString().replace('.', ',')}kg`;
}

function detectModalidade(catName: string): 'Kimono' | 'No-Gi' | null {
    const lower = catName.toLowerCase();
    if (/(no[\s-]?gi|sem\s+kimono)/.test(lower)) return 'No-Gi';
    if (/\bkimono\b/.test(lower)) return 'Kimono';
    return null;
}

function cleanCategoryDisplay(catName: string): { core: string; modalidade: 'Kimono' | 'No-Gi' | null } {
    const modalidade = detectModalidade(catName);
    const core = catName
        .replace(/\s*•\s*no[\s-]?gi\s*\(sem\s+kimono\)/gi, '')
        .replace(/\s*•\s*sem\s+kimono/gi, '')
        .replace(/\s*•\s*no[\s-]?gi/gi, '')
        .replace(/\s*•\s*kimono\b/gi, '')
        .trim();
    return { core, modalidade };
}

export function TeamAthletesPDF({
    eventTitle,
    teamName,
    masterName,
    athletes,
    logoUrl,
}: TeamAthletesPDFProps) {
    const totalRegs = athletes.reduce((sum, a) => sum + a.registrations.length, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.fixedHeader} fixed>
                    {logoUrl ? (
                        <Image src={logoUrl} style={styles.logo} />
                    ) : (
                        <Text style={styles.logoFallback}>COMPETIR</Text>
                    )}
                    <View style={styles.headerRight}>
                        <Text style={styles.headerEventTitle}>{eventTitle.toUpperCase()}</Text>
                        <Text style={styles.headerTeamLabel}>{teamName.toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.goldLine} fixed />

                <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{teamName.toUpperCase()}</Text>
                    <View style={styles.teamMetaRow}>
                        {masterName && (
                            <Text style={styles.teamMeta}>
                                Mestre: <Text style={styles.teamMetaBold}>{masterName}</Text>
                            </Text>
                        )}
                        <Text style={styles.teamMeta}>
                            Atletas: <Text style={styles.teamMetaBold}>{athletes.length}</Text>
                        </Text>
                        <Text style={styles.teamMeta}>
                            Inscrições: <Text style={styles.teamMetaBold}>{totalRegs}</Text>
                        </Text>
                    </View>
                </View>

                <View style={styles.tableHeaderRow} fixed>
                    <Text style={[styles.th, styles.cellNum]}>#</Text>
                    <Text style={[styles.th, styles.cellName]}>Atleta</Text>
                    <Text style={[styles.th, styles.cellSex]}>Sexo</Text>
                    <Text style={[styles.th, styles.cellAge]}>Idade</Text>
                    <Text style={[styles.th, styles.cellBirth]}>Nasc.</Text>
                    <Text style={[styles.th, styles.cellWeight]}>Peso</Text>
                    <Text style={[styles.th, styles.cellBelt]}>Faixa</Text>
                    <Text style={[styles.th, styles.cellCat]}>Categorias</Text>
                </View>

                {athletes.map((a, idx) => (
                    <View key={a.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
                        <Text style={[styles.tdMuted, styles.cellNum]}>{idx + 1}</Text>
                        <Text style={[styles.td, styles.cellName, { fontFamily: 'Helvetica-Bold' }]}>
                            {a.full_name}
                        </Text>
                        <Text style={[styles.td, styles.cellSex]}>{formatSexo(a.sexo)}</Text>
                        <Text style={[styles.td, styles.cellAge]}>{calculateAge(a.birth_date)}</Text>
                        <Text style={[styles.td, styles.cellBirth]}>{formatBirthDate(a.birth_date)}</Text>
                        <Text style={[styles.td, styles.cellWeight]}>{formatPeso(a.weight)}</Text>
                        <Text style={[styles.td, styles.cellBelt, { textTransform: 'capitalize' }]}>
                            {a.belt_color || '-'}
                        </Text>
                        <View style={styles.cellCat}>
                            {a.registrations.length === 0 && (
                                <Text style={styles.tdMuted}>—</Text>
                            )}
                            {a.registrations.map((reg) => {
                                const catName = reg.category?.categoria_completa || 'Sem categoria';
                                const { core, modalidade } = cleanCategoryDisplay(catName);
                                return (
                                    <Text key={reg.id} style={styles.catLine}>
                                        {core}
                                        {modalidade && (
                                            <>
                                                {' · '}
                                                <Text
                                                    style={
                                                        modalidade === 'No-Gi'
                                                            ? styles.catModBadgeNoGi
                                                            : styles.catModBadge
                                                    }
                                                >
                                                    {modalidade.toUpperCase()}
                                                </Text>
                                            </>
                                        )}
                                    </Text>
                                );
                            })}
                        </View>
                    </View>
                ))}

                {athletes.length === 0 && (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: C.textMid }}>
                            Nenhum atleta inscrito nesta equipe.
                        </Text>
                    </View>
                )}

                <Text
                    style={styles.footer}
                    fixed
                    render={({ pageNumber, totalPages }) =>
                        `Competir · Detalhamento de Atletas · ${teamName} · Gerado em ${new Date().toLocaleDateString('pt-BR')} · Página ${pageNumber}/${totalPages}`
                    }
                />
            </Page>
        </Document>
    );
}

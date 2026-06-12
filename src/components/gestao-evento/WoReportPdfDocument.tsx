import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatDateTime } from '@/lib/gestao-evento/bracket-pdf-shared';
import {
    parseCategoria,
    getSuperDivisao,
    SUPER_DIVISAO_LABELS,
    SUPER_DIVISAO_ORDER,
    type SuperDivisao,
} from '@/lib/gestao-evento/parse-categoria';
import type { WoReportItem } from '@/app/(panel)/academia-equipe/dashboard/actions/gestao-evento';

function calcAge(birth: string | null): number | null {
    if (!birth) return null;
    const d = new Date(birth);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 && age < 120 ? age : null;
}

function formatPeso(w: number | null): string {
    if (w == null) return '—';
    const n = Math.abs(Number(w));
    return Number.isInteger(n) ? `${n} kg` : `${n.toFixed(1).replace('.', ',')} kg`;
}

const s = StyleSheet.create({
    page: { fontFamily: 'Helvetica', paddingTop: 36, paddingBottom: 36, paddingHorizontal: 36, fontSize: 9, color: '#0f172a' },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#0f172a',
    },
    superTitle: { fontSize: 8, letterSpacing: 2, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
    title: { fontSize: 15, fontWeight: 700 },
    subtitle: { fontSize: 9.5, color: '#475569', marginTop: 4 },
    logo: { width: 110, height: 26, objectFit: 'contain' },

    groupHeader: {
        marginTop: 14,
        marginBottom: 4,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
    },
    headRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 3, marginBottom: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 0.6, borderBottomColor: '#e2e8f0' },
    colNum: { width: 20, fontSize: 8.5, color: '#94a3b8' },
    colCat: { flex: 1.5, paddingRight: 6 },
    colAtleta: { flex: 1.4, paddingRight: 6 },
    colAcad: { flex: 1.1 },
    th: { fontSize: 7.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
    cat: { fontSize: 8.5, color: '#0f172a' },
    atletaNome: { fontSize: 9.5, fontWeight: 700 },
    atletaMeta: { fontSize: 7.5, color: '#64748b', marginTop: 0.5 },
    acad: { fontSize: 8.5, color: '#475569' },
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 36,
        right: 36,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#94a3b8',
    },
});

type Props = {
    eventTitle: string;
    items: WoReportItem[];
    generatedAt?: Date;
    filtroLabel?: string | null;
};

export function WoReportPdfDocument({ eventTitle, items, generatedAt = new Date(), filtroLabel }: Props) {
    // agrupa por super-divisão preservando a ordem já vinda do server
    const groups: { div: SuperDivisao; items: WoReportItem[] }[] = [];
    for (const it of items) {
        const div = getSuperDivisao(parseCategoria(it.categoria).grupo);
        const last = groups[groups.length - 1];
        if (last && last.div === div) last.items.push(it);
        else groups.push({ div, items: [it] });
    }
    groups.sort((a, b) => SUPER_DIVISAO_ORDER.indexOf(a.div) - SUPER_DIVISAO_ORDER.indexOf(b.div));

    return (
        <Document>
            <Page size="A4" style={s.page}>
                <View style={s.titleRow}>
                    <View>
                        <Text style={s.superTitle}>Relatório de W.O.</Text>
                        <Text style={s.title}>{eventTitle}</Text>
                        <Text style={s.subtitle}>
                            {items.length} {items.length === 1 ? 'categoria' : 'categorias'} com atleta único (vence por W.O.)
                            {filtroLabel ? ` · ${filtroLabel}` : ''}
                        </Text>
                    </View>
                    <Image src="/logo.png" style={s.logo} />
                </View>

                {items.length === 0 ? (
                    <Text style={{ marginTop: 20, fontStyle: 'italic', color: '#64748b' }}>
                        Nenhuma categoria de W.O. encontrada.
                    </Text>
                ) : (
                    groups.map((g, gi) => (
                        <View key={`${g.div}-${gi}`} wrap>
                            <Text style={s.groupHeader}>{SUPER_DIVISAO_LABELS[g.div]}</Text>
                            <View style={s.headRow}>
                                <Text style={[s.colNum, s.th]}>#</Text>
                                <Text style={[s.colCat, s.th]}>Categoria</Text>
                                <Text style={[s.colAtleta, s.th]}>Atleta (W.O.)</Text>
                                <Text style={[s.colAcad, s.th]}>Academia</Text>
                            </View>
                            {g.items.map((it, i) => {
                                const idade = calcAge(it.atleta.birth_date);
                                const meta = [formatPeso(it.atleta.peso), idade != null ? `${idade} anos` : null]
                                    .filter(Boolean)
                                    .join(' · ');
                                return (
                                    <View key={i} style={s.row} wrap={false}>
                                        <Text style={s.colNum}>{i + 1}</Text>
                                        <View style={s.colCat}>
                                            <Text style={s.cat}>{it.categoria}</Text>
                                        </View>
                                        <View style={s.colAtleta}>
                                            <Text style={s.atletaNome}>{it.atleta.nome}</Text>
                                            {meta ? <Text style={s.atletaMeta}>{meta}</Text> : null}
                                        </View>
                                        <View style={s.colAcad}>
                                            <Text style={s.acad}>{it.atleta.academia || 'Sem equipe'}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ))
                )}

                <View style={s.footer} fixed>
                    <Text>Gerado em {formatDateTime(generatedAt)}</Text>
                    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}

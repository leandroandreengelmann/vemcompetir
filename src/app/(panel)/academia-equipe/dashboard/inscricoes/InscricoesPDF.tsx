import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

type Academia = {
    name: string;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    masterName?: string | null;
};

type Inscricao = {
    id: string;
    price?: number | string | null;
    tipo: string;
    status: string;
    athlete?: { full_name?: string; cpf?: string; belt_color?: string };
    event?: { title?: string; event_date?: string; location?: string; city?: string; state?: string };
    category?: { categoria_completa?: string };
};

type Totals = {
    count: number;
    totalValue: number;
    totalPago: number;
    totalPagoEmMao: number;
    totalPixDireto: number;
    totalPacote: number;
    totalEventoProprio: number;
};

type Props = {
    academia: Academia;
    inscricoes: Inscricao[];
    totals: Totals;
    eventoFiltrado?: { title: string; event_date?: string } | null;
};

const COLORS = {
    primary: '#0f172a',
    primaryLight: '#cbd5e1',
    primarySoft: '#f1f5f9',
    accent: '#1e293b',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    zebra: '#f8fafc',
    badgePagoBg: '#f1f5f9',
    badgePagoText: '#0f172a',
    badgePacoteBg: '#e2e8f0',
    badgePacoteText: '#334155',
    badgeOwnBg: '#f1f5f9',
    badgeOwnText: '#475569',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        paddingTop: 100,
        paddingBottom: 60,
        paddingHorizontal: 36,
        fontSize: 9,
        color: COLORS.text,
        backgroundColor: '#ffffff',
    },
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 36,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brand: {
        fontSize: 9,
        letterSpacing: 2,
        color: COLORS.primaryLight,
    },
    title: {
        fontSize: 16,
        color: '#ffffff',
        marginTop: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    headerDate: {
        fontSize: 9,
        color: COLORS.primaryLight,
    },
    identCard: {
        backgroundColor: COLORS.primarySoft,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    identTitle: {
        fontSize: 8,
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 6,
    },
    identAcademy: {
        fontSize: 14,
        marginBottom: 4,
        color: COLORS.text,
    },
    identRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    identItem: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 2,
    },
    identLabel: {
        fontSize: 8,
        color: COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    identValue: {
        fontSize: 9,
        color: COLORS.text,
    },
    eventBanner: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    eventBannerLabel: {
        fontSize: 8,
        color: COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    eventBannerTitle: {
        fontSize: 13,
        marginTop: 2,
    },
    eventGroupBar: {
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginTop: 8,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    eventGroupTitle: {
        fontSize: 10,
        color: '#ffffff',
    },
    eventGroupMeta: {
        fontSize: 9,
        color: COLORS.primaryLight,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tableHeaderCell: {
        fontSize: 8,
        color: COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
    },
    tableRowZebra: {
        backgroundColor: COLORS.zebra,
    },
    cellNum: { width: 22, fontSize: 8, color: COLORS.muted },
    cellName: { flex: 2.2, fontSize: 9, paddingRight: 4 },
    cellCpf: { width: 70, fontSize: 8, color: COLORS.muted },
    cellBelt: { width: 50, fontSize: 7, textTransform: 'uppercase' },
    cellCategory: { flex: 2.4, fontSize: 8, paddingRight: 4 },
    cellStatus: { width: 84, fontSize: 7 },
    cellValue: { width: 60, fontSize: 9, textAlign: 'right' },
    badge: {
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderRadius: 3,
        fontSize: 7,
        textAlign: 'center',
    },
    summaryCard: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        overflow: 'hidden',
    },
    summaryHeader: {
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    summaryHeaderText: {
        color: '#ffffff',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    summaryItem: {
        width: '33.33%',
        padding: 10,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: COLORS.border,
    },
    summaryLabel: {
        fontSize: 8,
        color: COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    summaryValue: {
        fontSize: 13,
        marginTop: 2,
        color: COLORS.text,
    },
    summaryTotal: {
        backgroundColor: COLORS.primarySoft,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryTotalLabel: {
        fontSize: 10,
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    summaryTotalValue: {
        fontSize: 18,
        color: COLORS.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 36,
        right: 36,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        paddingTop: 8,
    },
    footerText: {
        fontSize: 8,
        color: COLORS.muted,
    },
});

function formatCPF(cpf?: string | null) {
    if (!cpf) return '—';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return '—'; }
}

function formatMoney(v: number | string | null | undefined) {
    const n = Number(v || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function tipoLabel(tipo: string) {
    switch (tipo) {
        case 'pago': return 'Pago';
        case 'pago_em_mao': return 'Pago em Mão';
        case 'pix_direto': return 'PIX Direto';
        case 'pacote': return 'Pacote de Inscrição';
        case 'evento_proprio':
        case 'isento_evento_proprio': return 'Evento Próprio';
        default: return tipo;
    }
}

function tipoBadgeStyle(tipo: string) {
    if (tipo === 'pago' || tipo === 'pago_em_mao' || tipo === 'pix_direto') {
        return { backgroundColor: COLORS.badgePagoBg, color: COLORS.badgePagoText };
    }
    if (tipo === 'pacote') {
        return { backgroundColor: COLORS.badgePacoteBg, color: COLORS.badgePacoteText };
    }
    return { backgroundColor: COLORS.badgeOwnBg, color: COLORS.badgeOwnText };
}

function groupByEvent(inscricoes: Inscricao[]) {
    const groups = new Map<string, { title: string; date?: string; rows: Inscricao[] }>();
    for (const r of inscricoes) {
        const key = `${r.event?.title || 'Sem evento'}|${r.event?.event_date || ''}`;
        if (!groups.has(key)) {
            groups.set(key, { title: r.event?.title || 'Sem evento', date: r.event?.event_date, rows: [] });
        }
        groups.get(key)!.rows.push(r);
    }
    return Array.from(groups.values());
}

export function InscricoesPDF({ academia, inscricoes, totals, eventoFiltrado }: Props) {
    const emitidoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const groups = eventoFiltrado ? null : groupByEvent(inscricoes);
    const cidadeUf = [academia.city, academia.state].filter(Boolean).join(' - ');

    let counter = 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header fixo */}
                <View style={styles.headerBar} fixed>
                    <View>
                        <Text style={styles.brand}>VEM COMPETIR</Text>
                        <Text style={styles.title}>Relatório de Inscrições Confirmadas</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.headerDate}>Emitido em</Text>
                        <Text style={{ fontSize: 10, color: '#ffffff' }}>{emitidoEm}</Text>
                    </View>
                </View>

                {/* Identificação */}
                <View style={styles.identCard}>
                    <Text style={styles.identTitle}>Academia / Equipe</Text>
                    <Text style={styles.identAcademy}>{academia.name}</Text>
                    <View style={styles.identRow}>
                        {academia.masterName && (
                            <View style={styles.identItem}>
                                <Text style={styles.identLabel}>Mestre:</Text>
                                <Text style={styles.identValue}>{academia.masterName}</Text>
                            </View>
                        )}
                        {academia.document && (
                            <View style={styles.identItem}>
                                <Text style={styles.identLabel}>CNPJ:</Text>
                                <Text style={styles.identValue}>{academia.document}</Text>
                            </View>
                        )}
                        {academia.phone && (
                            <View style={styles.identItem}>
                                <Text style={styles.identLabel}>Telefone:</Text>
                                <Text style={styles.identValue}>{academia.phone}</Text>
                            </View>
                        )}
                        {academia.email && (
                            <View style={styles.identItem}>
                                <Text style={styles.identLabel}>E-mail:</Text>
                                <Text style={styles.identValue}>{academia.email}</Text>
                            </View>
                        )}
                        {cidadeUf && (
                            <View style={styles.identItem}>
                                <Text style={styles.identLabel}>Local:</Text>
                                <Text style={styles.identValue}>{cidadeUf}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Evento (quando filtrado) */}
                {eventoFiltrado && (
                    <View style={styles.eventBanner}>
                        <Text style={styles.eventBannerLabel}>Evento</Text>
                        <Text style={styles.eventBannerTitle}>{eventoFiltrado.title}</Text>
                        {eventoFiltrado.event_date && (
                            <Text style={{ fontSize: 9, color: COLORS.muted, marginTop: 2 }}>
                                Data: {formatDate(eventoFiltrado.event_date)}
                            </Text>
                        )}
                        <Text style={{ fontSize: 9, color: COLORS.text, marginTop: 4 }}>
                            {totals.count} inscrição(ões) confirmada(s) — {formatMoney(totals.totalValue)}
                        </Text>
                    </View>
                )}

                {/* Tabela */}
                {inscricoes.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: COLORS.muted }}>Nenhuma inscrição confirmada encontrada.</Text>
                    </View>
                ) : eventoFiltrado ? (
                    <View>
                        <View style={styles.tableHeader} fixed>
                            <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Atleta</Text>
                            <Text style={[styles.tableHeaderCell, { width: 70 }]}>CPF</Text>
                            <Text style={[styles.tableHeaderCell, { width: 50 }]}>Faixa</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2.4 }]}>Categoria</Text>
                            <Text style={[styles.tableHeaderCell, { width: 84 }]}>Forma</Text>
                            <Text style={[styles.tableHeaderCell, { width: 60, textAlign: 'right' }]}>Valor</Text>
                        </View>
                        {inscricoes.map((r, idx) => (
                            <View key={r.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowZebra : {}]} wrap={false}>
                                <Text style={styles.cellNum}>{idx + 1}</Text>
                                <Text style={styles.cellName}>{r.athlete?.full_name}</Text>
                                <Text style={styles.cellCpf}>{formatCPF(r.athlete?.cpf)}</Text>
                                <Text style={styles.cellBelt}>{r.athlete?.belt_color || '—'}</Text>
                                <Text style={styles.cellCategory}>{r.category?.categoria_completa || '—'}</Text>
                                <View style={styles.cellStatus}>
                                    <Text style={[styles.badge, tipoBadgeStyle(r.tipo)]}>{tipoLabel(r.tipo)}</Text>
                                </View>
                                <Text style={styles.cellValue}>{formatMoney(r.price)}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    groups!.map((g, gi) => {
                        const subtotal = g.rows.reduce((s, r) => s + Number(r.price || 0), 0);
                        return (
                            <View key={gi} wrap={true}>
                                <View style={styles.eventGroupBar} wrap={false}>
                                    <Text style={styles.eventGroupTitle}>
                                        {g.title} {g.date ? `• ${formatDate(g.date)}` : ''}
                                    </Text>
                                    <Text style={styles.eventGroupMeta}>
                                        {g.rows.length} insc. • {formatMoney(subtotal)}
                                    </Text>
                                </View>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Atleta</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>CPF</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 50 }]}>Faixa</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 2.4 }]}>Categoria</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 84 }]}>Forma</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 60, textAlign: 'right' }]}>Valor</Text>
                                </View>
                                {g.rows.map((r, idx) => {
                                    counter += 1;
                                    return (
                                        <View key={r.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowZebra : {}]} wrap={false}>
                                            <Text style={styles.cellNum}>{counter}</Text>
                                            <Text style={styles.cellName}>{r.athlete?.full_name}</Text>
                                            <Text style={styles.cellCpf}>{formatCPF(r.athlete?.cpf)}</Text>
                                            <Text style={styles.cellBelt}>{r.athlete?.belt_color || '—'}</Text>
                                            <Text style={styles.cellCategory}>{r.category?.categoria_completa || '—'}</Text>
                                            <View style={styles.cellStatus}>
                                                <Text style={[styles.badge, tipoBadgeStyle(r.tipo)]}>{tipoLabel(r.tipo)}</Text>
                                            </View>
                                            <Text style={styles.cellValue}>{formatMoney(r.price)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })
                )}

                {/* Resumo */}
                {inscricoes.length > 0 && (
                    <View style={styles.summaryCard} wrap={false}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryHeaderText}>Resumo Financeiro</Text>
                        </View>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Inscrições</Text>
                                <Text style={styles.summaryValue}>{totals.count}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Pago (online)</Text>
                                <Text style={styles.summaryValue}>{formatMoney(totals.totalPago)}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Pago em Mão</Text>
                                <Text style={styles.summaryValue}>{formatMoney(totals.totalPagoEmMao)}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>PIX Direto</Text>
                                <Text style={styles.summaryValue}>{formatMoney(totals.totalPixDireto)}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Pacote de Inscrição</Text>
                                <Text style={styles.summaryValue}>{formatMoney(totals.totalPacote)}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Evento Próprio</Text>
                                <Text style={styles.summaryValue}>{formatMoney(totals.totalEventoProprio)}</Text>
                            </View>
                        </View>
                        <View style={styles.summaryTotal}>
                            <Text style={styles.summaryTotalLabel}>Valor Total</Text>
                            <Text style={styles.summaryTotalValue}>{formatMoney(totals.totalValue)}</Text>
                        </View>
                    </View>
                )}

                {/* Footer fixo */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{academia.name}</Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                    <Text style={styles.footerText}>vemcompetir.com.br</Text>
                </View>
            </Page>
        </Document>
    );
}

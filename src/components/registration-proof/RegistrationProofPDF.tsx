import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { RegistrationProofData } from '@/app/(panel)/academia-equipe/dashboard/eventos/registration-proof-actions';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 48,
        fontSize: 11,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    headerBar: {
        backgroundColor: '#1e293b',
        color: '#ffffff',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    brand: {
        fontSize: 10,
        letterSpacing: 2,
        color: '#cbd5e1',
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        marginTop: 4,
    },
    numberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    numberBlock: {
        flexDirection: 'column',
    },
    label: {
        fontSize: 9,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    value: {
        fontSize: 12,
        fontWeight: 600,
        marginTop: 2,
    },
    athleteHero: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    athleteName: {
        fontSize: 20,
        fontWeight: 700,
        color: '#0f172a',
        marginTop: 4,
    },
    athleteMeta: {
        fontSize: 10,
        color: '#475569',
        marginTop: 6,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    rowLabel: {
        width: 120,
        fontSize: 10,
        color: '#6b7280',
    },
    rowValue: {
        flex: 1,
        fontSize: 11,
        fontWeight: 500,
    },
    tableHead: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 4,
        marginBottom: 6,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    colNum: {
        width: 60,
        fontSize: 10,
    },
    colCat: {
        flex: 1,
        fontSize: 10,
        paddingRight: 8,
    },
    colAmount: {
        width: 80,
        fontSize: 10,
        textAlign: 'right',
    },
    colHeadText: {
        fontSize: 9,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: 700,
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 700,
    },
    courtesyNote: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'right',
    },
    declaration: {
        fontSize: 11,
        lineHeight: 1.6,
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 6,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 48,
        right: 48,
        flexDirection: 'column',
        alignItems: 'center',
    },
    signature: {
        borderTopWidth: 1,
        borderTopColor: '#111827',
        width: 240,
        paddingTop: 6,
        alignItems: 'center',
    },
    signatureName: {
        fontSize: 10,
        fontWeight: 600,
    },
    signatureRole: {
        fontSize: 9,
        color: '#6b7280',
    },
    issuedAt: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 12,
    },
});

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCPF(cpf: string | null) {
    if (!cpf) return '—';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatNumber(n: number | null) {
    return n != null ? `#${String(n).padStart(3, '0')}` : '—';
}

export function RegistrationProofPDF({ data }: { data: RegistrationProofData }) {
    const { athlete, event, payment, items } = data;
    const plural = items.length === 1 ? 'categoria' : 'categorias';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerBar}>
                    <Text style={styles.brand}>{data.tenantName?.toUpperCase() ?? 'COMPROVANTE'}</Text>
                    <Text style={styles.title}>Comprovante de Inscrição</Text>
                </View>

                <View style={styles.numberRow}>
                    <View style={styles.numberBlock}>
                        <Text style={styles.label}>Inscrição</Text>
                        <Text style={styles.value}>
                            {items.map(i => formatNumber(i.registrationNumber)).join('  ')}
                        </Text>
                    </View>
                    <View style={styles.numberBlock}>
                        <Text style={styles.label}>Emitido em</Text>
                        <Text style={styles.value}>{formatDate(data.issuedAt)}</Text>
                    </View>
                </View>

                <View style={styles.athleteHero}>
                    <Text style={styles.label}>Atleta</Text>
                    <Text style={styles.athleteName}>{athlete.name}</Text>
                    <Text style={styles.athleteMeta}>
                        CPF {formatCPF(athlete.cpf)}
                        {athlete.beltColor ? ` · Faixa ${athlete.beltColor}` : ''}
                        {athlete.gymName ? ` · ${athlete.gymName}` : ''}
                        {athlete.masterName ? ` · Mestre ${athlete.masterName}` : ''}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evento</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Nome</Text>
                        <Text style={styles.rowValue}>{event.title}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Data</Text>
                        <Text style={styles.rowValue}>{formatDate(event.date)}</Text>
                    </View>
                    {event.location && (
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Local</Text>
                            <Text style={styles.rowValue}>{event.location}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categorias inscritas</Text>
                    <View style={styles.tableHead}>
                        <Text style={[styles.colNum, styles.colHeadText]}>Nº</Text>
                        <Text style={[styles.colCat, styles.colHeadText]}>Categoria</Text>
                        <Text style={[styles.colAmount, styles.colHeadText]}>Valor</Text>
                    </View>
                    {items.map((item) => (
                        <View key={item.registrationId} style={styles.tableRow}>
                            <Text style={styles.colNum}>{formatNumber(item.registrationNumber)}</Text>
                            <Text style={styles.colCat}>{item.categoryTitle}</Text>
                            <Text style={styles.colAmount}>
                                {payment.isCourtesy ? formatCurrency(0) : formatCurrency(item.amount)}
                            </Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total ({items.length} {plural})</Text>
                        <Text style={styles.totalValue}>{formatCurrency(payment.total)}</Text>
                    </View>
                    {payment.isCourtesy && payment.donatedTotal > 0 && (
                        <Text style={styles.courtesyNote}>
                            Valor doado pela organização: {formatCurrency(payment.donatedTotal)}
                        </Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pagamento</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Forma</Text>
                        <Text style={styles.rowValue}>{payment.methodLabel}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>
                            {payment.isCourtesy ? 'Motivo' : 'Descrição'}
                        </Text>
                        <Text style={styles.rowValue}>{payment.notes ?? '—'}</Text>
                    </View>
                </View>

                <View style={styles.declaration}>
                    <Text>
                        Declaramos para os devidos fins que {athlete.name}
                        {athlete.cpf ? `, portador do CPF ${formatCPF(athlete.cpf)},` : ''} está
                        inscrito em {event.title}
                        {event.date ? `, realizado em ${formatDate(event.date)}` : ''}, nas categorias
                        relacionadas neste comprovante
                        {payment.isCourtesy
                            ? ', na condição de inscrição cortesia, sem custo para o atleta.'
                            : `, com pagamento confirmado no valor de ${formatCurrency(payment.total)}.`}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.signature}>
                        <Text style={styles.signatureName}>{data.tenantName ?? '—'}</Text>
                        <Text style={styles.signatureRole}>Organização do evento</Text>
                    </View>
                    <Text style={styles.issuedAt}>
                        Gerado eletronicamente em {new Date(data.issuedAt).toLocaleString('pt-BR')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReceiptPayload } from '../actions';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 48,
        fontSize: 11,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    headerBar: {
        backgroundColor: '#065f46',
        color: '#ffffff',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    brand: {
        fontSize: 10,
        letterSpacing: 2,
        color: '#d1fae5',
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
    amountHero: {
        backgroundColor: '#ecfdf5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    amountLabel: {
        fontSize: 10,
        color: '#065f46',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    amountValue: {
        fontSize: 28,
        fontWeight: 700,
        color: '#065f46',
        marginTop: 4,
    },
    amountWords: {
        fontSize: 10,
        color: '#374151',
        marginTop: 6,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: '#065f46',
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const UNITS = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
const TEENS = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'QUATORZE', 'QUINZE', 'DEZESSEIS', 'DEZESSETE', 'DEZOITO', 'DEZENOVE'];
const TENS = ['', '', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CENTO', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];

function intToWords(n: number): string {
    if (n === 0) return 'ZERO';
    if (n === 100) return 'CEM';
    const parts: string[] = [];
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    if (thousands > 0) {
        parts.push(thousands === 1 ? 'MIL' : `${intToWords(thousands)} MIL`);
    }
    if (remainder > 0) {
        const hundreds = Math.floor(remainder / 100);
        const tensOnes = remainder % 100;
        const sub: string[] = [];
        if (hundreds > 0) sub.push(HUNDREDS[hundreds]);
        if (tensOnes > 0) {
            if (tensOnes < 10) sub.push(UNITS[tensOnes]);
            else if (tensOnes < 20) sub.push(TEENS[tensOnes - 10]);
            else {
                const t = Math.floor(tensOnes / 10);
                const u = tensOnes % 10;
                sub.push(u === 0 ? TENS[t] : `${TENS[t]} E ${UNITS[u]}`);
            }
        }
        parts.push(sub.join(hundreds > 0 && tensOnes > 0 ? ' E ' : ' '));
    }
    return parts.join(' E ');
}

function amountToWords(value: number): string {
    const reais = Math.floor(value);
    const cents = Math.round((value - reais) * 100);
    const reaisText = `${intToWords(reais)} ${reais === 1 ? 'REAL' : 'REAIS'}`;
    if (cents === 0) return reaisText;
    return `${reaisText} E ${intToWords(cents)} ${cents === 1 ? 'CENTAVO' : 'CENTAVOS'}`;
}

const methodLabel: Record<string, string> = {
    pix: 'PIX',
    pix_direto: 'PIX Direto',
    credit_card: 'Cartão de Crédito',
    boleto: 'Boleto',
    pago_em_mao: 'Pago em Mão',
    dinheiro: 'Dinheiro',
};

export function ReceiptPDF({ receipt }: { receipt: ReceiptPayload }) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerBar}>
                    <Text style={styles.brand}>{receipt.tenant_name?.toUpperCase() ?? 'RECIBO'}</Text>
                    <Text style={styles.title}>Recibo de Pagamento</Text>
                </View>

                <View style={styles.numberRow}>
                    <View style={styles.numberBlock}>
                        <Text style={styles.label}>Número</Text>
                        <Text style={styles.value}>{receipt.receipt_number}/{receipt.receipt_year}</Text>
                    </View>
                    <View style={styles.numberBlock}>
                        <Text style={styles.label}>Emitido em</Text>
                        <Text style={styles.value}>{formatDate(receipt.issued_at)}</Text>
                    </View>
                </View>

                <View style={styles.amountHero}>
                    <Text style={styles.amountLabel}>Valor Recebido</Text>
                    <Text style={styles.amountValue}>{formatCurrency(receipt.amount)}</Text>
                    <Text style={styles.amountWords}>({amountToWords(receipt.amount)})</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pagador</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Nome</Text>
                        <Text style={styles.rowValue}>{receipt.payer_name ?? '—'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Documento</Text>
                        <Text style={styles.rowValue}>{receipt.payer_document ?? '—'}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Detalhes do Pagamento</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Descrição</Text>
                        <Text style={styles.rowValue}>{receipt.description ?? '—'}</Text>
                    </View>
                    {receipt.event_title && (
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Evento</Text>
                            <Text style={styles.rowValue}>{receipt.event_title}</Text>
                        </View>
                    )}
                    {receipt.event_date && (
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Data do evento</Text>
                            <Text style={styles.rowValue}>{formatDate(receipt.event_date)}</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Forma</Text>
                        <Text style={styles.rowValue}>
                            {receipt.payment_method ? (methodLabel[receipt.payment_method] ?? receipt.payment_method) : '—'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Data do pagto</Text>
                        <Text style={styles.rowValue}>{formatDate(receipt.paid_at)}</Text>
                    </View>
                </View>

                <View style={styles.declaration}>
                    <Text>
                        Declaramos para os devidos fins que recebemos de {receipt.payer_name ?? 'pagador identificado neste recibo'}
                        {receipt.payer_document ? `, portador do documento ${receipt.payer_document},` : ''} a quantia de
                        {' '}{formatCurrency(receipt.amount)} ({amountToWords(receipt.amount)}) referente a {receipt.description ?? 'serviço prestado'}.
                        Por ser expressão da verdade, firmamos o presente.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.signature}>
                        <Text style={styles.signatureName}>{receipt.tenant_name ?? '—'}</Text>
                        <Text style={styles.signatureRole}>Emissor</Text>
                    </View>
                    <Text style={styles.issuedAt}>
                        Gerado eletronicamente em {new Date(receipt.issued_at).toLocaleString('pt-BR')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

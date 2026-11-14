import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CancellationProofData } from '@/app/(panel)/academia-equipe/dashboard/eventos/cancel-registration-actions';

const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', padding: 48, fontSize: 11, color: '#111827', backgroundColor: '#ffffff' },
    headerBar: { backgroundColor: '#7f1d1d', color: '#ffffff', paddingVertical: 14, paddingHorizontal: 20, marginBottom: 18 },
    brand: { fontSize: 10, letterSpacing: 2, color: '#fecaca' },
    title: { fontSize: 22, fontWeight: 700, marginTop: 4 },
    stamp: { borderWidth: 2, borderColor: '#b91c1c', borderRadius: 6, padding: 12, marginBottom: 20, backgroundColor: '#fef2f2' },
    stampTitle: { fontSize: 12, fontWeight: 700, color: '#b91c1c', letterSpacing: 1 },
    stampLine: { fontSize: 11, color: '#7f1d1d', marginTop: 4 },
    label: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
    numberRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    value: { fontSize: 12, fontWeight: 600, marginTop: 2 },
    athleteHero: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 16, marginBottom: 20 },
    athleteName: { fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 },
    athleteMeta: { fontSize: 10, color: '#475569', marginTop: 6 },
    section: { marginBottom: 18 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
    row: { flexDirection: 'row', marginBottom: 6 },
    rowLabel: { width: 130, fontSize: 10, color: '#6b7280' },
    rowValue: { flex: 1, fontSize: 11, fontWeight: 500 },
    reasonBox: { fontSize: 11, lineHeight: 1.5, padding: 10, backgroundColor: '#f9fafb', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
    declaration: { fontSize: 11, lineHeight: 1.6, marginTop: 4, padding: 12, backgroundColor: '#f9fafb', borderRadius: 6 },
    footer: { position: 'absolute', bottom: 40, left: 48, right: 48, flexDirection: 'column', alignItems: 'center' },
    signature: { borderTopWidth: 1, borderTopColor: '#111827', width: 260, paddingTop: 6, alignItems: 'center' },
    signatureName: { fontSize: 10, fontWeight: 600 },
    signatureRole: { fontSize: 9, color: '#6b7280' },
    issuedAt: { fontSize: 9, color: '#6b7280', marginTop: 12 },
});

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCPF = (cpf: string | null) => {
    if (!cpf) return '—';
    const d = cpf.replace(/\D/g, '');
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
};

export function CancellationProofPDF({ data }: { data: CancellationProofData }) {
    const { athlete, event, cancellation } = data;
    const cancelledBy = cancellation.cancelledByGym && cancellation.cancelledByGym !== cancellation.cancelledByName
        ? `${cancellation.cancelledByName} (${cancellation.cancelledByGym})`
        : cancellation.cancelledByName;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerBar}>
                    <Text style={styles.brand}>{data.tenantName?.toUpperCase() ?? 'COMPROVANTE'}</Text>
                    <Text style={styles.title}>Comprovante de Cancelamento de Inscrição</Text>
                </View>

                <View style={styles.stamp}>
                    <Text style={styles.stampTitle}>INSCRIÇÃO CANCELADA</Text>
                    <Text style={styles.stampLine}>Cancelada por: {cancelledBy}</Text>
                    <Text style={styles.stampLine}>Em: {fmtDateTime(cancellation.cancelledAt)}</Text>
                </View>

                <View style={styles.numberRow}>
                    <View>
                        <Text style={styles.label}>Inscrição</Text>
                        <Text style={styles.value}>
                            {data.registrationNumber != null ? `#${String(data.registrationNumber).padStart(3, '0')}` : '—'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Emitido em</Text>
                        <Text style={styles.value}>{fmtDate(data.issuedAt)}</Text>
                    </View>
                </View>

                <View style={styles.athleteHero}>
                    <Text style={styles.label}>Atleta</Text>
                    <Text style={styles.athleteName}>{athlete.name}</Text>
                    <Text style={styles.athleteMeta}>
                        CPF {fmtCPF(athlete.cpf)}
                        {athlete.beltColor ? ` · Faixa ${athlete.beltColor}` : ''}
                        {athlete.gymName ? ` · ${athlete.gymName}` : ''}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inscrição cancelada</Text>
                    <View style={styles.row}><Text style={styles.rowLabel}>Evento</Text><Text style={styles.rowValue}>{event.title}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>Data do evento</Text><Text style={styles.rowValue}>{fmtDate(event.date)}</Text></View>
                    {event.location && (
                        <View style={styles.row}><Text style={styles.rowLabel}>Local</Text><Text style={styles.rowValue}>{event.location}</Text></View>
                    )}
                    <View style={styles.row}><Text style={styles.rowLabel}>Categoria</Text><Text style={styles.rowValue}>{data.categoryTitle}</Text></View>
                    <View style={styles.row}><Text style={styles.rowLabel}>Valor da inscrição</Text><Text style={styles.rowValue}>{fmtMoney(data.amount)}</Text></View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Motivo do cancelamento</Text>
                    <Text style={styles.reasonBox}>{cancellation.reason ?? '—'}</Text>
                </View>

                <View style={styles.declaration}>
                    <Text>
                        Declaramos que a inscrição de {athlete.name}
                        {athlete.cpf ? `, CPF ${fmtCPF(athlete.cpf)},` : ''} na categoria {data.categoryTitle} do evento {event.title}
                        {event.date ? `, realizado em ${fmtDate(event.date)},` : ''} foi cancelada em {fmtDateTime(cancellation.cancelledAt)} por {cancelledBy}.
                        Eventuais devoluções de valores são tratadas diretamente com a organização do evento.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.signature}>
                        <Text style={styles.signatureName}>{data.tenantName ?? '—'}</Text>
                        <Text style={styles.signatureRole}>Organização do evento</Text>
                    </View>
                    <Text style={styles.issuedAt}>Gerado eletronicamente em {new Date(data.issuedAt).toLocaleString('pt-BR')}</Text>
                </View>
            </Page>
        </Document>
    );
}

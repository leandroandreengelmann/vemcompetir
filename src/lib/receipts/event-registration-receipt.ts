// Helper compartilhado para emitir recibo de uma inscrição (evento próprio).
// Usado tanto no fechamento do pagamento (checkoutOwnEventAction) quanto na
// geração retroativa de recibos pendentes.

export type EventRegistrationReceipt = {
    id: string;
    receipt_number: string;
    receipt_year: number;
    amount: number;
    description: string | null;
    payment_method: string | null;
    paid_at: string | null;
    issued_at: string;
    payer_name: string | null;
    payer_document: string | null;
    source_type: string;
    source_id: string;
    tenant_name: string | null;
    tenant_document: string | null;
    event_title: string | null;
    event_date: string | null;
};

export type CreateReceiptResult =
    | { receipt: EventRegistrationReceipt; skipped?: undefined }
    | { receipt?: undefined; skipped: 'exists' | 'zero' | 'error'; error?: string };

/**
 * Cria um recibo (tabela `receipts`) para uma inscrição de evento.
 * Idempotente: se já existir recibo para a inscrição, retorna skipped:'exists'.
 * Não cobra nada — apenas registra o documento.
 */
export async function createEventRegistrationReceipt(
    admin: any,
    params: {
        tenantId: string;
        userId: string;
        registrationId: string;
        amount: number;
        paymentMethod?: string;
        payerName: string | null;
        payerDocument: string | null;
        description: string;
        eventId: string;
        eventTitle: string | null;
        eventDate: string | null;
        athleteId: string | null;
        tenantName: string | null;
        paidAt?: string | null;
    },
): Promise<CreateReceiptResult> {
    const amount = Number(params.amount || 0);
    if (!(amount > 0)) return { skipped: 'zero' };

    // Já existe recibo para esta inscrição?
    const { data: existing } = await admin
        .from('receipts')
        .select('id')
        .eq('source_type', 'event_registration')
        .eq('source_id', params.registrationId)
        .eq('tenant_id', params.tenantId)
        .maybeSingle();

    if (existing) return { skipped: 'exists' };

    const year = new Date().getFullYear();
    const { data: numberData, error: numberErr } = await admin.rpc('next_receipt_number', {
        p_tenant_id: params.tenantId,
        p_year: year,
    });
    if (numberErr || !numberData) {
        return { skipped: 'error', error: 'Não foi possível gerar o número do recibo.' };
    }

    const { data: inserted, error: insertErr } = await admin
        .from('receipts')
        .insert({
            tenant_id: params.tenantId,
            receipt_number: numberData,
            receipt_year: year,
            source_type: 'event_registration',
            source_id: params.registrationId,
            payer_name: params.payerName,
            payer_document: params.payerDocument,
            description: params.description,
            amount,
            payment_method: params.paymentMethod ?? 'pix',
            paid_at: params.paidAt ?? new Date().toISOString(),
            issued_by: params.userId,
            metadata: { event_id: params.eventId, athlete_id: params.athleteId },
        })
        .select()
        .single();

    if (insertErr || !inserted) {
        return { skipped: 'error', error: insertErr?.message ?? 'Falha ao registrar o recibo.' };
    }

    return {
        receipt: {
            id: inserted.id,
            receipt_number: inserted.receipt_number,
            receipt_year: inserted.receipt_year,
            amount: Number(inserted.amount),
            description: inserted.description,
            payment_method: inserted.payment_method,
            paid_at: inserted.paid_at,
            issued_at: inserted.issued_at,
            payer_name: inserted.payer_name,
            payer_document: inserted.payer_document,
            source_type: inserted.source_type,
            source_id: inserted.source_id,
            tenant_name: params.tenantName,
            tenant_document: null,
            event_title: params.eventTitle,
            event_date: params.eventDate,
        },
    };
}

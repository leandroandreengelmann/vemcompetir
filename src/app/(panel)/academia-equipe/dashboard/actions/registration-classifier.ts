// Helper: classificar tipo de registro com base no status, payment e manual_payment_method
export function classifyRegistration(
    status: string,
    payment: { payer_type?: string; asaas_payment_id?: string } | null,
    manualPaymentMethod?: string | null,
    isCourtesy?: boolean | null
): { tipo: string; payer_type: string | null; manual_method: string | null } {
    // Cortesia real (flag is_courtesy) tem prioridade sobre status
    if (isCourtesy) return { tipo: 'cortesia', payer_type: null, manual_method: null };

    // Novos status de evento proprio
    if (status === 'pago_em_mao') return { tipo: 'pago_em_mao', payer_type: 'OWN_EVENT', manual_method: 'pago_em_mao' };
    if (status === 'pix_direto') return { tipo: 'pix_direto', payer_type: 'OWN_EVENT', manual_method: 'pix_direto' };
    if (status === 'isento_evento_proprio') return { tipo: 'isento_evento_proprio', payer_type: 'OWN_EVENT', manual_method: 'isento' };

    // Status legado de evento proprio (inscricoes antigas)
    if (status === 'isento') {
        if (payment?.asaas_payment_id?.startsWith('own_event_')) {
            return { tipo: 'evento_proprio', payer_type: payment?.payer_type || null, manual_method: null };
        }
        return { tipo: 'pacote', payer_type: null, manual_method: null };
    }
    if (status === 'pago' || status === 'paga' || status === 'confirmado') {
        return { tipo: 'pago', payer_type: payment?.payer_type || null, manual_method: null };
    }
    if (status === 'agendado') return { tipo: 'agendado', payer_type: payment?.payer_type || null, manual_method: null };
    if (status === 'pendente' || status === 'aguardando_pagamento') return { tipo: 'pendente', payer_type: payment?.payer_type || null, manual_method: null };
    return { tipo: 'carrinho', payer_type: null, manual_method: null };
}

// Helper: buscar payments e criar mapa
export async function fetchPaymentsMap(adminSupabase: any, paymentIds: string[]): Promise<Record<string, { payer_type: string; asaas_payment_id: string }>> {
    if (paymentIds.length === 0) return {};
    const { data: payments } = await adminSupabase
        .from('payments')
        .select('id, payer_type, asaas_payment_id')
        .in('id', paymentIds);
    if (!payments) return {};
    return Object.fromEntries(payments.map((p: any) => [p.id, p]));
}

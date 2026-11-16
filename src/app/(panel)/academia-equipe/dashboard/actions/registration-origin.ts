// Classificador único da ORIGEM do dinheiro de uma inscrição (detalhamento financeiro).
// Funções puras, em centavos inteiros, para evitar erro de ponto flutuante.

export type Origin =
    | 'asaas'
    | 'pix_academia'
    | 'dinheiro'
    | 'por_fora'
    | 'cortesia'
    | 'gratis'
    | 'pacote'
    | 'pendente';

export type OriginInput = {
    status: string;
    is_courtesy?: boolean | null;
    manual_payment_method?: string | null;
    promo_type_applied?: string | null;
    /** valor cobrado (manual_amount ?? price) em centavos */
    amountCents: number;
};

export type OriginPayment = { asaas_payment_id?: string | null } | null;

const PAID = ['pago', 'paga', 'confirmado', 'agendado'];
const CASH_METHODS = ['pago_em_mao', 'dinheiro', 'especie'];

export const toCents = (n: number | string | null | undefined): number =>
    Math.round(Number(n ?? 0) * 100);

/** Retorna null para inscrições fora do financeiro (canceladas e carrinho). */
export function classifyOrigin(reg: OriginInput, payment: OriginPayment): Origin | null {
    const s = reg.status;
    if (s === 'cancelado' || s === 'cancelada' || s === 'carrinho') return null;

    if (reg.is_courtesy) return 'cortesia';

    const method = reg.manual_payment_method ?? null;
    if (s === 'pix_direto' || method === 'pix_direto') return 'pix_academia';
    if (s === 'pago_em_mao' || (method && CASH_METHODS.includes(method))) return 'dinheiro';

    const isOwnEventPayment = !!payment?.asaas_payment_id?.startsWith('own_event_');

    if (s === 'isento_evento_proprio') return 'gratis';
    if (s === 'isento') return isOwnEventPayment ? 'gratis' : 'pacote';

    if (PAID.includes(s)) {
        if (reg.amountCents === 0) return 'gratis';
        // Evento próprio pago sem método informado: dinheiro foi por fora do Asaas.
        if (isOwnEventPayment) return 'por_fora';
        return 'asaas';
    }

    if (s === 'pendente' || s === 'aguardando_pagamento') return 'pendente';
    return null;
}

/** Divide `totalCents` em `n` partes; a sobra de centavos vai para as primeiras. */
export function splitCents(totalCents: number, n: number): number[] {
    if (n <= 0) return [];
    const base = Math.floor(totalCents / n);
    const rest = totalCents - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

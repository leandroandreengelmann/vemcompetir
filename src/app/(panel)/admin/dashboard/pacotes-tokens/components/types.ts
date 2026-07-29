export interface TokenPackage {
    id: string;
    name: string;
    token_count: number;
    price_cents: number;
    description: string | null;
    is_active: boolean;
}

export interface AcademySummary {
    id: string;
    name: string;
    inscription_token_balance: number;
    token_management_enabled: boolean;
    token_alert_sent_at: string | null;
}

export interface TokenMovement {
    id: string;
    type: 'consumed' | 'refunded' | 'granted' | 'adjusted';
    amount: number;
    balance_after: number;
    notes: string | null;
    created_at: string;
}

/** Abaixo disso a academia entra na contagem de "precisando de saldo". */
export const LOW_BALANCE_THRESHOLD = 20;

export const priceReais = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

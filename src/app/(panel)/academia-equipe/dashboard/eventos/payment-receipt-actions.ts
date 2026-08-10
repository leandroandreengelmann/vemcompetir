'use server';

import { requireTenantScope } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import * as cheerio from 'cheerio';

// Comprovante bancário — o comprovante oficial da Asaas (data, código da transação,
// banco e nome de quem pagou). Diferente do comprovante de inscrição (registration-proof-actions.ts),
// que é gerado por nós e só atesta que a inscrição existe.

type Admin = ReturnType<typeof createAdminClient>;

async function getAsaasConfig(admin: Admin) {
    const { data: settings } = await admin
        .from('asaas_settings')
        .select('environment, api_key_encrypted, api_key_iv, is_enabled')
        .eq('is_enabled', true)
        .single();

    if (!settings) return null;

    const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
    const baseUrl = settings.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    return { apiKey, baseUrl };
}

async function resolveAsaasConfig(admin: Admin, organizerTenantId?: string | null) {
    if (organizerTenantId) {
        const { data: tenant } = await admin
            .from('tenants')
            .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
            .eq('id', organizerTenantId)
            .single();

        if (tenant?.use_own_asaas_api && tenant.asaas_api_key_encrypted && tenant.asaas_api_key_iv) {
            const apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
            const { data: settings } = await admin
                .from('asaas_settings')
                .select('environment')
                .eq('is_enabled', true)
                .single();
            const baseUrl = settings?.environment === 'production'
                ? 'https://api.asaas.com'
                : 'https://api-sandbox.asaas.com';
            return { apiKey, baseUrl };
        }
    }

    return getAsaasConfig(admin);
}

type AsaasReceiptUrlResult = { url: string } | { error: string };

// Resolve o registro → cobrança na Asaas → transactionReceiptUrl. Uso interno, compartilhado
// pelas duas actions públicas abaixo.
async function resolveAsaasReceiptUrl(registrationId: string, tenant_id: string | null): Promise<AsaasReceiptUrlResult> {
    const admin = createAdminClient();

    const { data: reg, error } = await admin
        .from('event_registrations')
        .select(`
            id,
            payment_id,
            event:events!event_id ( tenant_id ),
            payment:payments!payment_id ( asaas_payment_id, tenant_id_organizer )
        `)
        .eq('id', registrationId)
        .maybeSingle();

    if (error || !reg) return { error: 'Inscrição não encontrada.' };

    // Só a academia organizadora do evento pode consultar o comprovante bancário.
    const eventTenantId = (reg as any).event?.tenant_id;
    if (eventTenantId !== tenant_id) return { error: 'Sem permissão para ver este comprovante.' };

    const payment = (reg as any).payment;
    const asaasPaymentId = payment?.asaas_payment_id as string | undefined;

    if (!asaasPaymentId) {
        return { error: 'Essa inscrição não teve uma cobrança gerada pela plataforma — não existe comprovante bancário para ela.' };
    }

    // Cortesias e eventos próprios usam ids sintéticos (free_*, own_event_*), sem transação real na Asaas.
    if (asaasPaymentId.startsWith('free_') || asaasPaymentId.startsWith('own_event_')) {
        return { error: 'Essa inscrição foi confirmada manualmente e não passou pela Asaas — não há comprovante bancário.' };
    }

    const config = await resolveAsaasConfig(admin, payment.tenant_id_organizer ?? eventTenantId);
    if (!config) return { error: 'Configuração da Asaas não encontrada.' };

    const res = await fetch(`${config.baseUrl}/v3/payments/${asaasPaymentId}`, {
        headers: { 'access_token': config.apiKey },
    });

    if (!res.ok) {
        return { error: 'Não foi possível consultar o pagamento na Asaas agora. Tente novamente em instantes.' };
    }

    const data = await res.json();
    if (!data.transactionReceiptUrl) {
        return { error: 'Esse pagamento ainda não tem comprovante disponível — geralmente aparece só depois de confirmado.' };
    }

    return { url: data.transactionReceiptUrl as string };
}

export async function getPaymentReceiptUrlAction(registrationId: string): Promise<AsaasReceiptUrlResult> {
    const { tenant_id } = await requireTenantScope();
    return resolveAsaasReceiptUrl(registrationId, tenant_id);
}

export interface PaymentReceiptDetails {
    value: string | null;
    paymentDate: string | null;
    transactionCode: string | null;
    payerName: string | null;
    payerDocument: string | null;
    payerBank: string | null;
    receiptUrl: string;
}

type ReceiptDetailsResult = { data: PaymentReceiptDetails } | { error: string };

// Faz o parsing do HTML do comprovante da Asaas — é uma página server-rendered com blocos
// previsíveis (<div class="control-group"><label>Campo:</label> valor</div>), separados por
// seções "Dados do pagador" / "Dados do recebedor". Se a Asaas mudar esse layout, os campos
// específicos somem mas a action ainda devolve receiptUrl como fallback (link pra página original).
function parseReceiptHtml(html: string) {
    const $ = cheerio.load(html);
    const sections: Record<'general' | 'payer' | 'receiver', Record<string, string>> = {
        general: {}, payer: {}, receiver: {},
    };
    let current: 'general' | 'payer' | 'receiver' = 'general';

    $('.control-group').each((_, el) => {
        const $el = $(el);
        const $label = $el.find('label').first();
        const label = $label.text().trim().replace(/:$/, '');
        const value = $el.text().replace($label.text(), '').trim();

        if (label === 'Dados do pagador') { current = 'payer'; return; }
        if (label === 'Dados do recebedor') { current = 'receiver'; return; }
        if (!label || !value) return;

        sections[current][label] = value;
    });

    return sections;
}

export async function getPaymentReceiptDetailsAction(registrationId: string): Promise<ReceiptDetailsResult> {
    const { tenant_id } = await requireTenantScope();
    const receipt = await resolveAsaasReceiptUrl(registrationId, tenant_id);
    if ('error' in receipt) return receipt;

    const res = await fetch(receipt.url);
    if (!res.ok) {
        return { error: 'Não foi possível abrir o comprovante agora. Tente novamente em instantes.' };
    }

    const html = await res.text();
    const sections = parseReceiptHtml(html);

    return {
        data: {
            value: sections.general['Valor pago'] ?? null,
            paymentDate: sections.general['Data do pagamento'] ?? null,
            transactionCode: sections.general['ID/Transação Pix'] ?? null,
            payerName: sections.payer['Nome'] ?? null,
            payerDocument: sections.payer['CPF/CNPJ'] ?? null,
            payerBank: sections.payer['Instituição'] ?? null,
            receiptUrl: receipt.url,
        },
    };
}

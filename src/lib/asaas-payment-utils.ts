import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { auditLog } from '@/lib/audit-log';

async function getAsaasApiKey(
    admin: ReturnType<typeof createAdminClient>,
    tenantId: string | null
): Promise<{ apiKey: string; baseUrl: string } | null> {
    const { data: settings } = await admin
        .from('asaas_settings')
        .select('environment, api_key_encrypted, api_key_iv, is_enabled')
        .eq('is_enabled', true)
        .single();

    if (!settings) return null;

    const baseUrl = settings.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    if (tenantId) {
        const { data: tenant } = await admin
            .from('tenants')
            .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
            .eq('id', tenantId)
            .single();

        if (tenant?.use_own_asaas_api && tenant.asaas_api_key_encrypted && tenant.asaas_api_key_iv) {
            return { apiKey: decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv), baseUrl };
        }
    }

    return { apiKey: decrypt(settings.api_key_encrypted, settings.api_key_iv), baseUrl };
}

/**
 * Cancela no Asaas um pagamento PIX que ainda está PENDING no nosso banco.
 * Chamado antes de desvincular uma inscrição do pagamento (ex: "reativar carrinho"),
 * pra evitar que o QR code continue pagável depois que o sistema já desistiu dele
 * — o que gera um pagamento "fantasma" que nunca é linkado a nenhuma inscrição.
 * Best-effort: nunca lança erro, só loga, pra não travar a ação do usuário no carrinho.
 */
export async function cancelPendingAsaasPayment(paymentId: string): Promise<void> {
    const admin = createAdminClient();

    const { data: payment } = await admin
        .from('payments')
        .select('id, asaas_payment_id, status, tenant_id_organizer')
        .eq('id', paymentId)
        .single();

    if (!payment || payment.status !== 'PENDING') return;
    if (payment.asaas_payment_id?.startsWith('free_') || payment.asaas_payment_id?.startsWith('own_event_')) return;

    try {
        const config = await getAsaasApiKey(admin, payment.tenant_id_organizer);
        if (!config) return;

        const res = await fetch(`${config.baseUrl}/v3/payments/${payment.asaas_payment_id}`, {
            method: 'DELETE',
            headers: { 'access_token': config.apiKey },
        });

        if (res.ok) {
            await admin
                .from('payments')
                .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                .eq('id', paymentId);

            auditLog('PAYMENT_CANCELLED_ON_REACTIVATE', {
                payment_id: paymentId,
                asaas_payment_id: payment.asaas_payment_id,
            });
        } else {
            auditLog('PAYMENT_CANCEL_FAILED', {
                payment_id: paymentId,
                asaas_payment_id: payment.asaas_payment_id,
                status: res.status,
            }, 'warn');
        }
    } catch (err) {
        auditLog('PAYMENT_CANCEL_FAILED', {
            payment_id: paymentId,
            error: err instanceof Error ? err.message : String(err),
        }, 'warn');
    }
}

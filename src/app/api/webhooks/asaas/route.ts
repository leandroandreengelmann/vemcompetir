import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt, hashToken } from '@/lib/crypto';
import { auditLog } from '@/lib/audit-log';
import { consumeTokens, refundTokens } from '@/lib/token-utils';

async function getAsaasConfig() {
    const admin = createAdminClient();
    const { data: settings } = await admin
        .from('asaas_settings')
        .select('environment, api_key_encrypted, api_key_iv, is_enabled, webhook_token_hash')
        .eq('is_enabled', true)
        .single();

    if (!settings) return null;

    const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
    const baseUrl = settings.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    return { apiKey, baseUrl, webhookTokenHash: settings.webhook_token_hash };
}

async function getVerifyConfig(organizerTenantId?: string | null) {
    const admin = createAdminClient();

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

    return getAsaasConfig();
}

export async function POST(request: NextRequest) {
    try {
        // 1. Validate Asaas webhook token BEFORE reading body
        const incomingToken = request.headers.get('asaas-access-token');
        const admin = createAdminClient();

        const { data: globalSettings } = await admin
            .from('asaas_settings')
            .select('webhook_token_hash')
            .eq('is_enabled', true)
            .single();

        const { data: tenantsWithOwnApi } = await admin
            .from('tenants')
            .select('asaas_webhook_token_hash')
            .eq('use_own_asaas_api', true)
            .not('asaas_webhook_token_hash', 'is', null);

        const validHashes = [
            globalSettings?.webhook_token_hash,
            ...(tenantsWithOwnApi?.map(t => t.asaas_webhook_token_hash) ?? []),
        ].filter(Boolean) as string[];

        if (validHashes.length === 0) {
            console.error('[webhook] Critical: No webhook token hashes configured. Rejecting all webhooks.');
            return NextResponse.json({ error: 'Webhook not configured securely' }, { status: 401 });
        }

        if (!incomingToken || !validHashes.includes(hashToken(incomingToken))) {
            auditLog('WEBHOOK_INVALID_TOKEN', { has_token: !!incomingToken }, 'warn');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { event: eventType, payment, account } = body;

        // 2. Handle Account Status Events
        if (eventType && eventType.startsWith('ACCOUNT_STATUS_')) {
            const asaasAccountId = account?.id;
            if (!asaasAccountId) {
                return NextResponse.json({ ok: true });
            }

            // Find our subaccount record
            const { data: subaccountRecord } = await admin
                .from('asaas_subaccounts')
                .select('id, tenant_id')
                .eq('asaas_account_id', asaasAccountId)
                .single();

            if (!subaccountRecord) {
                console.warn(`[webhook] Account not found for asaas_account_id: ${asaasAccountId}`);
                return NextResponse.json({ ok: true });
            }

            // Map event to status
            let mappedStatus = null;
            if (eventType.includes('APPROVED')) mappedStatus = 'APPROVED';
            else if (eventType.includes('REJECTED')) mappedStatus = 'REJECTED';
            else if (eventType.includes('AWAITING_APPROVAL')) mappedStatus = 'UNDER_REVIEW';
            else if (eventType.includes('PENDING')) mappedStatus = 'AWAITING_ONBOARDING';

            if (mappedStatus) {
                await admin
                    .from('asaas_subaccounts')
                    .update({
                        status: mappedStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subaccountRecord.id);
                console.log(`[webhook] Subaccount ${subaccountRecord.id} updated to ${mappedStatus} via event ${eventType}`);
            }

            return NextResponse.json({ ok: true });
        }

        // 3. Handle Payment Events
        if (!payment?.id) {
            return NextResponse.json({ ok: true }); // Ignore non-payment events
        }

        const asaasPaymentId = payment.id;

        // Find our payment record
        const { data: paymentRecord } = await admin
            .from('payments')
            .select('id, status, tenant_id_organizer, qtd_inscricoes, event_id')
            .eq('asaas_payment_id', asaasPaymentId)
            .single();

        if (!paymentRecord) {
            auditLog('WEBHOOK_PAYMENT_NOT_FOUND', { asaas_payment_id: asaasPaymentId }, 'warn');
            return NextResponse.json({ ok: true }); // Not ours, ignore
        }

        // Revalidate with Asaas API using the correct key (global or tenant's own)
        const config = await getVerifyConfig(paymentRecord.tenant_id_organizer);
        let confirmedStatus: string | null = null;

        let verifiedData: any = null;

        if (config) {
            const verifyRes = await fetch(`${config.baseUrl}/v3/payments/${asaasPaymentId}`, {
                headers: { 'access_token': config.apiKey },
            });

            if (verifyRes.ok) {
                verifiedData = await verifyRes.json();
                confirmedStatus = verifiedData.status;
            } else {
                console.error(`[webhook] Sec-Error: Asaas validation request failed for id: ${asaasPaymentId}`);
                return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
            }
        } else {
            console.error(`[webhook] Sec-Error: Asaas config missing for validation`);
            return NextResponse.json({ error: 'System not configured' }, { status: 500 });
        }

        if (!confirmedStatus) {
            console.error(`[webhook] Sec-Error: Payment status could not be verified.`);
            return NextResponse.json({ error: 'Status verification failed' }, { status: 400 });
        }

        // Use ONLY the official confirmed status from Asaas
        const effectiveStatus = confirmedStatus;

        // Handle CONFIRMED (pagamento agendado — dinheiro ainda não caiu)
        if (effectiveStatus === 'CONFIRMED') {
            if (paymentRecord.status === 'PAID') {
                return NextResponse.json({ ok: true });
            }

            await admin
                .from('payments')
                .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
                .eq('id', paymentRecord.id);

            await admin
                .from('event_registrations')
                .update({ status: 'agendado' })
                .eq('payment_id', paymentRecord.id);

            auditLog('WEBHOOK_PAYMENT_SCHEDULED', { payment_id: paymentRecord.id, asaas_payment_id: asaasPaymentId });
        }

        // Handle RECEIVED (dinheiro efetivamente recebido)
        if (['RECEIVED', 'RECEIVED_IN_CASH'].includes(effectiveStatus)) {
            // Idempotency: skip if already PAID
            if (paymentRecord.status === 'PAID') {
                return NextResponse.json({ ok: true });
            }

            // Security: Use ONLY the official confirmed data from Asaas revalidation
            const confirmedValue = verifiedData.value;
            const confirmedNetValue = verifiedData.netValue;

            // Determine fee_pix from netValue if available
            const feePixSnapshot = confirmedValue && confirmedNetValue
                ? parseFloat((confirmedValue - confirmedNetValue).toFixed(2))
                : null;

            // Update payment
            const updatePayment: Record<string, any> = {
                status: 'PAID',
                updated_at: new Date().toISOString(),
            };

            if (feePixSnapshot !== null) {
                updatePayment.fee_pix_snapshot = feePixSnapshot;

                // Get gross to calculate net
                const { data: fullPayment } = await admin
                    .from('payments')
                    .select('fee_saas_gross_snapshot')
                    .eq('id', paymentRecord.id)
                    .single();

                if (fullPayment) {
                    updatePayment.fee_saas_net_snapshot = parseFloat(
                        (Number(fullPayment.fee_saas_gross_snapshot) - feePixSnapshot).toFixed(2)
                    );
                }
            }

            await admin
                .from('payments')
                .update(updatePayment)
                .eq('id', paymentRecord.id);

            // Update linked registrations
            await admin
                .from('event_registrations')
                .update({ status: 'pago' })
                .eq('payment_id', paymentRecord.id);

            // Consome tokens do organizador (1 token por inscrição confirmada)
            if (paymentRecord.tenant_id_organizer && paymentRecord.qtd_inscricoes) {
                await consumeTokens(paymentRecord.tenant_id_organizer, paymentRecord.qtd_inscricoes, {
                    eventId: paymentRecord.event_id,
                    notes: `${paymentRecord.qtd_inscricoes} inscrição(ões) confirmada(s) via PIX`,
                });
            }

            auditLog('WEBHOOK_PAYMENT_CONFIRMED', { payment_id: paymentRecord.id, asaas_payment_id: asaasPaymentId, value: confirmedValue, net_value: confirmedNetValue });
        }

        // Handle PARTIALLY_RECEIVED — log only, no action (Asaas will send RECEIVED when complete)
        if (effectiveStatus === 'PARTIALLY_RECEIVED') {
            auditLog('WEBHOOK_PARTIALLY_RECEIVED', { payment_id: paymentRecord.id, asaas_payment_id: asaasPaymentId }, 'warn');
            return NextResponse.json({ ok: true });
        }

        // Handle OVERDUE/DELETED/REFUNDED → revert to cart
        if (['OVERDUE', 'DELETED', 'REFUNDED'].includes(effectiveStatus)) {
            if (paymentRecord.status === 'EXPIRED' || paymentRecord.status === 'CANCELLED') {
                return NextResponse.json({ ok: true }); // Already handled
            }

            const newStatus = effectiveStatus === 'REFUNDED' ? 'CANCELLED' : 'EXPIRED';

            await admin
                .from('payments')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', paymentRecord.id);

            // Revert registrations back to cart
            await admin
                .from('event_registrations')
                .update({ status: 'carrinho', payment_id: null })
                .eq('payment_id', paymentRecord.id);

            // Estorna tokens se o pagamento já havia sido confirmado (reembolso)
            if (paymentRecord.status === 'PAID' && paymentRecord.tenant_id_organizer && paymentRecord.qtd_inscricoes) {
                await refundTokens(paymentRecord.tenant_id_organizer, paymentRecord.qtd_inscricoes, {
                    eventId: paymentRecord.event_id,
                    notes: 'Estorno por cancelamento/reembolso de pagamento',
                });
            }

            auditLog(newStatus === 'CANCELLED' ? 'WEBHOOK_PAYMENT_CANCELLED' : 'WEBHOOK_PAYMENT_EXPIRED', { payment_id: paymentRecord.id, asaas_payment_id: asaasPaymentId, asaas_status: effectiveStatus });;
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[webhook] Error:', error);
        return NextResponse.json({ ok: true }); // Always 200 to avoid Asaas retries
    }
}

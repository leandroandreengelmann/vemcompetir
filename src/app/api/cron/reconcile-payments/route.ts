import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { auditLog } from '@/lib/audit-log';
import { consumeTokens } from '@/lib/token-utils';

function getAsaasBaseUrl(environment: string) {
    return environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';
}

export async function GET(request: NextRequest) {
    // Proteger com CRON_SECRET (Vercel injeta automaticamente para cron jobs)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const admin = createAdminClient();

        // Buscar config global
        const { data: settings } = await admin
            .from('asaas_settings')
            .select('environment, api_key_encrypted, api_key_iv, is_enabled')
            .eq('is_enabled', true)
            .single();

        if (!settings) {
            return NextResponse.json({ error: 'Asaas not configured' }, { status: 500 });
        }

        const baseUrl = getAsaasBaseUrl(settings.environment);

        // Buscar pagamentos PENDING reais (não free/own_event)
        const { data: pendingPayments } = await admin
            .from('payments')
            .select('id, asaas_payment_id, status, tenant_id_organizer, qtd_inscricoes, event_id, total_inscricoes_snapshot, fee_saas_gross_snapshot')
            .eq('status', 'PENDING')
            .not('asaas_payment_id', 'like', 'free_%')
            .not('asaas_payment_id', 'like', 'own_event_%')
            .order('created_at', { ascending: true })
            .limit(20);

        if (!pendingPayments || pendingPayments.length === 0) {
            return NextResponse.json({ message: 'No pending payments', processed: 0 });
        }

        // Cache de API keys por tenant
        const tenantKeyCache = new Map<string, string>();

        async function getApiKey(tenantId: string | null): Promise<string> {
            if (tenantId) {
                const cached = tenantKeyCache.get(tenantId);
                if (cached) return cached;

                const { data: tenant } = await admin
                    .from('tenants')
                    .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
                    .eq('id', tenantId)
                    .single();

                if (tenant?.use_own_asaas_api && tenant.asaas_api_key_encrypted && tenant.asaas_api_key_iv) {
                    const key = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
                    tenantKeyCache.set(tenantId, key);
                    return key;
                }
            }
            return decrypt(settings!.api_key_encrypted, settings!.api_key_iv);
        }

        let confirmed = 0;
        let expired = 0;

        for (const payment of pendingPayments) {
            try {
                const apiKey = await getApiKey(payment.tenant_id_organizer);

                const res = await fetch(`${baseUrl}/v3/payments/${payment.asaas_payment_id}`, {
                    headers: { 'access_token': apiKey },
                });

                if (!res.ok) continue;

                const asaasData = await res.json();

                if (['RECEIVED', 'RECEIVED_IN_CASH'].includes(asaasData.status)) {
                    const confirmedValue = asaasData.value;
                    const confirmedNetValue = asaasData.netValue;

                    const expectedTotal = Number(payment.total_inscricoes_snapshot || 0);
                    if (confirmedValue && expectedTotal > 0 && Math.abs(confirmedValue - expectedTotal) > 0.01) {
                        await admin.from('payments').update({
                            status: 'AMOUNT_MISMATCH',
                            error_type: 'amount_mismatch',
                            error_details: { expected: expectedTotal, received: confirmedValue },
                            updated_at: new Date().toISOString(),
                        }).eq('id', payment.id);
                        continue;
                    }

                    const feePixSnapshot = confirmedValue && confirmedNetValue
                        ? parseFloat((confirmedValue - confirmedNetValue).toFixed(2))
                        : null;

                    const updatePayment: Record<string, any> = {
                        status: 'PAID',
                        updated_at: new Date().toISOString(),
                    };

                    if (feePixSnapshot !== null) {
                        updatePayment.fee_pix_snapshot = feePixSnapshot;
                        updatePayment.fee_saas_net_snapshot = parseFloat(
                            (Number(payment.fee_saas_gross_snapshot) - feePixSnapshot).toFixed(2)
                        );
                    }

                    await admin.from('payments').update(updatePayment).eq('id', payment.id);
                    await admin.from('event_registrations').update({ status: 'pago' }).eq('payment_id', payment.id);

                    if (payment.tenant_id_organizer && payment.qtd_inscricoes) {
                        await consumeTokens(payment.tenant_id_organizer, payment.qtd_inscricoes, {
                            eventId: payment.event_id,
                            notes: `${payment.qtd_inscricoes} inscrição(ões) confirmada(s) via cron reconciliação`,
                        });
                    }

                    auditLog('RECONCILE_PAYMENT_CONFIRMED', {
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        value: confirmedValue,
                    });
                    confirmed++;
                }

                else if (['OVERDUE', 'DELETED'].includes(asaasData.status)) {
                    await admin.from('payments').update({
                        status: 'EXPIRED',
                        updated_at: new Date().toISOString(),
                    }).eq('id', payment.id);

                    await admin.from('event_registrations')
                        .update({ status: 'carrinho', payment_id: null })
                        .eq('payment_id', payment.id);

                    auditLog('RECONCILE_PAYMENT_EXPIRED', {
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                    });
                    expired++;
                }

            } catch (err) {
                console.error(`[cron-reconcile] Error processing ${payment.asaas_payment_id}:`, err);
            }
        }

        if (confirmed > 0 || expired > 0) {
            auditLog('RECONCILE_RUN', { total: pendingPayments.length, confirmed, expired, source: 'cron' });
        }

        return NextResponse.json({
            processed: pendingPayments.length,
            confirmed,
            expired,
        });

    } catch (error) {
        console.error('[cron-reconcile] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

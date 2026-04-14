import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { auditLog } from '@/lib/audit-log';
import { consumeTokens } from '@/lib/token-utils';

async function getAsaasConfigForTenant(adminClient: ReturnType<typeof createAdminClient>, tenantId: string | null) {
    const { data: settings } = await adminClient
        .from('asaas_settings')
        .select('environment, api_key_encrypted, api_key_iv, is_enabled')
        .eq('is_enabled', true)
        .single();

    if (!settings) return null;

    const baseUrl = settings.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    if (tenantId) {
        const { data: tenant } = await adminClient
            .from('tenants')
            .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
            .eq('id', tenantId)
            .single();

        if (tenant?.use_own_asaas_api && tenant.asaas_api_key_encrypted && tenant.asaas_api_key_iv) {
            const apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
            return { apiKey, baseUrl };
        }
    }

    const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
    return { apiKey, baseUrl };
}

export async function POST(request: NextRequest) {
    try {
        // 1. Auth — somente admin_geral
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const admin = createAdminClient();

        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin_geral') {
            return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }

        // 2. Buscar pagamentos PENDING que têm asaas_payment_id real (não free/own_event)
        const { data: pendingPayments, error: fetchError } = await admin
            .from('payments')
            .select('id, asaas_payment_id, status, tenant_id_organizer, qtd_inscricoes, event_id, total_inscricoes_snapshot, fee_saas_gross_snapshot')
            .eq('status', 'PENDING')
            .not('asaas_payment_id', 'like', 'free_%')
            .not('asaas_payment_id', 'like', 'own_event_%')
            .order('created_at', { ascending: true });

        if (fetchError) {
            return NextResponse.json({ error: 'Erro ao buscar pagamentos.' }, { status: 500 });
        }

        if (!pendingPayments || pendingPayments.length === 0) {
            return NextResponse.json({ message: 'Nenhum pagamento pendente encontrado.', results: [] });
        }

        const results: Array<{
            payment_id: string;
            asaas_payment_id: string;
            asaas_status: string;
            action: string;
            error?: string;
        }> = [];

        for (const payment of pendingPayments) {
            try {
                const config = await getAsaasConfigForTenant(admin, payment.tenant_id_organizer);
                if (!config) {
                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: 'UNKNOWN',
                        action: 'skipped',
                        error: 'Config Asaas não encontrada',
                    });
                    continue;
                }

                // Consultar status real no Asaas
                const res = await fetch(`${config.baseUrl}/v3/payments/${payment.asaas_payment_id}`, {
                    headers: { 'access_token': config.apiKey },
                });

                if (!res.ok) {
                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: 'UNKNOWN',
                        action: 'skipped',
                        error: `Asaas API retornou ${res.status}`,
                    });
                    continue;
                }

                const asaasData = await res.json();
                const asaasStatus = asaasData.status;

                // RECEIVED / RECEIVED_IN_CASH → confirmar pagamento
                if (['RECEIVED', 'RECEIVED_IN_CASH'].includes(asaasStatus)) {
                    const confirmedValue = asaasData.value;
                    const confirmedNetValue = asaasData.netValue;

                    // Validação de valor (mesma lógica do webhook corrigido)
                    const expectedTotal = Number(payment.total_inscricoes_snapshot || 0);
                    if (confirmedValue && expectedTotal > 0 && Math.abs(confirmedValue - expectedTotal) > 0.01) {
                        await admin
                            .from('payments')
                            .update({
                                status: 'AMOUNT_MISMATCH',
                                error_type: 'amount_mismatch',
                                error_details: { expected: expectedTotal, received: confirmedValue },
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', payment.id);

                        results.push({
                            payment_id: payment.id,
                            asaas_payment_id: payment.asaas_payment_id,
                            asaas_status: asaasStatus,
                            action: 'amount_mismatch',
                            error: `Esperado ${expectedTotal}, recebido ${confirmedValue}`,
                        });
                        continue;
                    }

                    // Calcular fee PIX
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

                    await admin
                        .from('payments')
                        .update(updatePayment)
                        .eq('id', payment.id);

                    await admin
                        .from('event_registrations')
                        .update({ status: 'pago' })
                        .eq('payment_id', payment.id);

                    if (payment.tenant_id_organizer && payment.qtd_inscricoes) {
                        await consumeTokens(payment.tenant_id_organizer, payment.qtd_inscricoes, {
                            eventId: payment.event_id,
                            notes: `${payment.qtd_inscricoes} inscrição(ões) confirmada(s) via reconciliação`,
                        });
                    }

                    auditLog('RECONCILE_PAYMENT_CONFIRMED', {
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        value: confirmedValue,
                        net_value: confirmedNetValue,
                    });

                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: asaasStatus,
                        action: 'confirmed',
                    });
                }

                // CONFIRMED (agendado, ainda não caiu)
                else if (asaasStatus === 'CONFIRMED') {
                    await admin
                        .from('payments')
                        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
                        .eq('id', payment.id);

                    await admin
                        .from('event_registrations')
                        .update({ status: 'agendado' })
                        .eq('payment_id', payment.id);

                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: asaasStatus,
                        action: 'scheduled',
                    });
                }

                // OVERDUE / DELETED → expirar
                else if (['OVERDUE', 'DELETED'].includes(asaasStatus)) {
                    await admin
                        .from('payments')
                        .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
                        .eq('id', payment.id);

                    await admin
                        .from('event_registrations')
                        .update({ status: 'carrinho', payment_id: null })
                        .eq('payment_id', payment.id);

                    auditLog('RECONCILE_PAYMENT_EXPIRED', {
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: asaasStatus,
                    });

                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: asaasStatus,
                        action: 'expired',
                    });
                }

                // PENDING ou outro → não mexe
                else {
                    results.push({
                        payment_id: payment.id,
                        asaas_payment_id: payment.asaas_payment_id,
                        asaas_status: asaasStatus,
                        action: 'no_change',
                    });
                }

            } catch (err) {
                results.push({
                    payment_id: payment.id,
                    asaas_payment_id: payment.asaas_payment_id,
                    asaas_status: 'ERROR',
                    action: 'error',
                    error: String(err),
                });
            }
        }

        const confirmed = results.filter(r => r.action === 'confirmed').length;
        const expired = results.filter(r => r.action === 'expired').length;
        const unchanged = results.filter(r => r.action === 'no_change').length;

        auditLog('RECONCILE_RUN', {
            total: results.length,
            confirmed,
            expired,
            unchanged,
            triggered_by: user.id,
        });

        return NextResponse.json({
            message: `Reconciliação concluída: ${confirmed} confirmado(s), ${expired} expirado(s), ${unchanged} sem alteração.`,
            results,
        });

    } catch (error) {
        console.error('[reconcile] Error:', error);
        return NextResponse.json({ error: 'Erro interno na reconciliação.' }, { status: 500 });
    }
}

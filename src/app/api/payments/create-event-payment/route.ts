import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { getEventFee } from '@/lib/fee-calculator';
import { calculateAsaasSplit } from '@/lib/payment-utils';
import { shouldPaymentBeNoSplit } from '@/lib/no-split-logic';

async function getAsaasConfig() {
    const admin = createAdminClient();
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

export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { event_id, payer_type } = body;

        if (!event_id || !payer_type || !['ACADEMY', 'ATHLETE'].includes(payer_type)) {
            return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
        }

        // 2. Asaas config
        const config = await getAsaasConfig();
        if (!config) {
            return NextResponse.json({ error: 'Asaas não configurado.' }, { status: 500 });
        }

        const admin = createAdminClient();

        // 3. Resolve payer
        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('id, tenant_id, full_name, asaas_customer_id, cpf')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        const payer_ref = payer_type === 'ACADEMY' ? profile.tenant_id : user.id;
        if (!payer_ref) {
            return NextResponse.json({ error: 'Referência do pagador não encontrada.' }, { status: 400 });
        }

        // 4. Fetch cart items for this event
        let cartQuery = admin
            .from('event_registrations')
            .select('id, price, athlete_id, category_id')
            .eq('event_id', event_id)
            .eq('status', 'carrinho');

        if (payer_type === 'ACADEMY') {
            cartQuery = cartQuery
                .eq('tenant_id', payer_ref)
                .eq('registered_by', user.id);
        } else {
            cartQuery = cartQuery
                .eq('athlete_id', user.id)
                .eq('registered_by', user.id)
                .is('tenant_id', null);
        }

        const { data: cartItems, error: cartError } = await cartQuery;

        if (cartError || !cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Nenhum item no carrinho para este evento.' }, { status: 400 });
        }

        // 5. Calculate
        const qtd_inscricoes = cartItems.length;
        const total_inscricoes = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const { fee, source: fee_source } = await getEventFee(event_id);
        const fee_saas_bruta = qtd_inscricoes * fee;

        // 6. Get event organizer
        const { data: event } = await admin
            .from('events')
            .select('tenant_id')
            .eq('id', event_id)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
        }

        const tenant_id_organizer = event.tenant_id;

        // 7. Determine if own event
        const isOwnEvent = payer_type === 'ACADEMY' && payer_ref === tenant_id_organizer;

        // 8. Validation
        if (!isOwnEvent && fee_saas_bruta > total_inscricoes && total_inscricoes > 0) {
            return NextResponse.json({ error: 'Taxa SaaS excede o valor total das inscrições.' }, { status: 400 });
        }

        // 9. Check organizer has approved Asaas subaccount (for split)
        let organizerWalletId: string | null = null;
        if (!isOwnEvent) {
            const { data: subaccount } = await admin
                .from('asaas_subaccounts')
                .select('wallet_id, status')
                .eq('tenant_id', tenant_id_organizer)
                .single();

            if (!subaccount || subaccount.status !== 'APPROVED') {
                return NextResponse.json(
                    { error: 'Organizador do evento não possui conta Asaas aprovada.' },
                    { status: 400 }
                );
            }
            organizerWalletId = subaccount.wallet_id;
        }

        // 9.5. Check no-split rule for this event
        let isNoSplit = false;
        if (!isOwnEvent && organizerWalletId) {
            const { data: noSplitRule } = await admin
                .from('event_no_split_rules')
                .select('is_enabled, start_after_paid, offsets')
                .eq('event_id', event_id)
                .eq('is_enabled', true)
                .maybeSingle();

            if (noSplitRule) {
                // Count paid inscriptions for this event (excluding own-event payments)
                const { count: paidCount } = await admin
                    .from('event_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event_id)
                    .eq('status', 'pago');

                const currentPaidCount = paidCount || 0;

                if (shouldPaymentBeNoSplit(
                    currentPaidCount,
                    qtd_inscricoes,
                    noSplitRule.start_after_paid,
                    noSplitRule.offsets
                )) {
                    isNoSplit = true;
                    organizerWalletId = null; // Suppress split
                    console.log(`[NoSplit] Event ${event_id}: position ${currentPaidCount + 1} is no-split. Full amount goes to platform.`);
                }
            }
        }

        // 10. Get/create Asaas customer
        let asaas_customer_id = profile.asaas_customer_id;
        let paymentRes: Response | null = null;
        let paymentData: any = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
            if (!asaas_customer_id) {
                const customerPayload: Record<string, any> = {
                    name: profile.full_name || 'Cliente COMPETIR',
                    email: user.email,
                    // CPF sempre vem do perfil autenticado, nunca do body da request
                    cpfCnpj: profile.cpf,
                };

                if (!customerPayload.cpfCnpj) {
                    return NextResponse.json(
                        { error: 'CPF não encontrado no seu perfil. Atualize seu cadastro antes de pagar.' },
                        { status: 400 }
                    );
                }

                const customerAbort = new AbortController();
                const customerTimeout = setTimeout(() => customerAbort.abort(), 10000);

                let customerRes: Response;
                try {
                    customerRes = await fetch(`${config.baseUrl}/v3/customers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': config.apiKey,
                        },
                        body: JSON.stringify(customerPayload),
                        signal: customerAbort.signal,
                    });
                } finally {
                    clearTimeout(customerTimeout);
                }

                const customerData = await customerRes.json();

                if (!customerRes.ok || !customerData.id) {
                    console.error('Failed to create Asaas customer:', customerData);
                    return NextResponse.json(
                        { error: 'Erro ao criar cliente no Asaas.' },
                        { status: 500 }
                    );
                }

                asaas_customer_id = customerData.id;

                // Save to profiles
                await admin
                    .from('profiles')
                    .update({ asaas_customer_id })
                    .eq('id', user.id);
            }

            // 11. Create Asaas payment
            const chargeValue = isOwnEvent ? fee_saas_bruta : total_inscricoes;

            if (chargeValue <= 0) {
                // No charge needed — just confirm registrations
                const paymentId = crypto.randomUUID();
                await admin.from('payments').insert({
                    id: paymentId,
                    event_id,
                    payer_type,
                    payer_ref,
                    tenant_id_organizer,
                    qtd_inscricoes,
                    total_inscricoes_snapshot: total_inscricoes,
                    fee_unit_snapshot: fee,
                    fee_saas_gross_snapshot: fee_saas_bruta,
                    fee_source,
                    asaas_payment_id: `free_${paymentId}`,
                    asaas_customer_id,
                    payment_method: 'PIX',
                    status: 'PAID',
                    is_no_split: isNoSplit,
                });

                const registrationIds = cartItems.map(i => i.id);
                await admin
                    .from('event_registrations')
                    .update({ status: 'pago', payment_id: paymentId })
                    .in('id', registrationIds);

                return NextResponse.json({
                    payment_id: paymentId,
                    free: true,
                    message: 'Inscrições confirmadas sem cobrança.',
                });
            }

            const asaasPayload: Record<string, any> = {
                customer: asaas_customer_id,
                billingType: 'PIX',
                value: chargeValue,
                description: `Inscrições COMPETIR - Evento`,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            };

            // Add split for third-party events
            asaasPayload.split = calculateAsaasSplit(
                total_inscricoes,
                fee_saas_bruta,
                isOwnEvent ? null : organizerWalletId
            );

            console.log(`[Asaas] Attempt ${attempt} payload:`, JSON.stringify(asaasPayload, null, 2));

            const paymentAbort = new AbortController();
            const paymentTimeout = setTimeout(() => paymentAbort.abort(), 10000);
            try {
                paymentRes = await fetch(`${config.baseUrl}/v3/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': config.apiKey,
                    },
                    body: JSON.stringify(asaasPayload),
                    signal: paymentAbort.signal,
                });
            } finally {
                clearTimeout(paymentTimeout);
            }

            paymentData = await paymentRes.json();

            if (paymentRes.ok && paymentData.id) {
                break; // Sucesso!
            }

            // Verificação de erro de cliente inválido (ex: ID do sandbox em produção)
            const isInvalidCustomer = paymentData.errors?.some((e: any) =>
                e.code === 'invalid_customer' ||
                e.description?.includes('Customer inválido') ||
                e.description?.includes('não encontrado')
            );

            if (isInvalidCustomer && attempt === 1 && profile.asaas_customer_id) {
                console.log(`[Asaas] Invalid customer ${asaas_customer_id} detected. Clearing and retrying...`);
                // Limpa no banco para o futuro
                await admin.from('profiles').update({ asaas_customer_id: null }).eq('id', user.id);
                // Limpa localmente para a próxima tentativa do loop
                asaas_customer_id = null;
                continue;
            }

            // Se for outro erro ou já for a segunda tentativa, sai do loop
            break;
        }

        if (!paymentRes?.ok || !paymentData?.id) {
            console.error('Failed to create Asaas payment:', JSON.stringify(paymentData, null, 2));
            return NextResponse.json(
                { error: 'Erro ao criar cobrança no Asaas.', details: paymentData },
                { status: 500 }
            );
        }

        // 12. Fetch QR Code
        let pix_qr_code: string | null = null;
        let pix_payload: string | null = null;
        let pix_expiration: string | null = null;

        const qrRes = await fetch(`${config.baseUrl}/v3/payments/${paymentData.id}/pixQrCode`, {
            headers: { 'access_token': config.apiKey },
        });

        if (qrRes.ok) {
            const qrData = await qrRes.json();
            pix_qr_code = qrData.encodedImage || null;
            pix_payload = qrData.payload || null;
            pix_expiration = qrData.expirationDate || null;
        }

        // 13. Save payment record
        const { data: payment, error: paymentInsertError } = await admin
            .from('payments')
            .insert({
                event_id,
                payer_type,
                payer_ref,
                tenant_id_organizer,
                qtd_inscricoes,
                total_inscricoes_snapshot: total_inscricoes,
                fee_unit_snapshot: fee,
                fee_saas_gross_snapshot: fee_saas_bruta,
                fee_source,
                asaas_payment_id: paymentData.id,
                asaas_customer_id,
                payment_method: 'PIX',
                pix_qr_code,
                pix_payload,
                pix_expiration,
                status: 'PENDING',
                is_no_split: isNoSplit,
            })
            .select('id')
            .single();

        if (paymentInsertError || !payment) {
            console.error('Failed to save payment:', paymentInsertError);
            return NextResponse.json({ error: 'Erro ao salvar pagamento.' }, { status: 500 });
        }

        // 14. Update registrations
        const registrationIds = cartItems.map(i => i.id);
        await admin
            .from('event_registrations')
            .update({
                status: 'aguardando_pagamento',
                payment_id: payment.id,
            })
            .in('id', registrationIds);

        // Forçar expiração visual de 30 minutos (sobrescrevendo o padrão de 1 ano do Asaas)
        const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const final_pix_expiration = thirtyMinutesFromNow;

        return NextResponse.json({
            payment_id: payment.id,
            asaas_payment_id: paymentData.id,
            pix_qr_code,
            pix_payload,
            pix_expiration: final_pix_expiration,
            total_inscricoes,
            fee_unit: fee,
            fee_saas_bruta,
        });

    } catch (error) {
        console.error('create-event-payment error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

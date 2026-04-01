import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { getEventFee } from '@/lib/fee-calculator';
import { calculateAsaasSplit } from '@/lib/payment-utils';
import { shouldPaymentBeNoSplit } from '@/lib/no-split-logic';
import { rateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit-log';
import { consumeTokens } from '@/lib/token-utils';

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

    return { apiKey, baseUrl, isOwnAccount: false as const };
}

async function resolveAsaasConfig(organizerTenantId?: string | null) {
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
            return { apiKey, baseUrl, isOwnAccount: true as const };
        }
    }

    return getAsaasConfig();
}

export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        // Rate limit: 5 tentativas de pagamento por usuário a cada 5 minutos
        if (!rateLimit(`payment:${user.id}`, 5, 5 * 60 * 1000)) {
            auditLog('PAYMENT_FAILED', { user_id: user.id, reason: 'rate_limit_exceeded' }, 'warn');
            return NextResponse.json(
                { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { event_id, payer_type } = body;

        if (!event_id || !payer_type || !['ACADEMY', 'ATHLETE'].includes(payer_type)) {
            return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
        }

        const admin = createAdminClient();

        // 3. Resolve payer
        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('id, tenant_id, full_name, asaas_customer_id, cpf')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Failed to fetch profile:', profileError);
            return NextResponse.json({ error: 'Erro ao buscar perfil.' }, { status: 500 });
        }

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        // Guard: atleta precisa ter aceito os termos para este evento
        if (payer_type === 'ATHLETE') {
            const { data: termAcceptance } = await supabase
                .from('athlete_term_acceptances')
                .select('id')
                .eq('athlete_id', user.id)
                .eq('event_id', event_id)
                .maybeSingle();

            if (!termAcceptance) {
                return NextResponse.json(
                    { error: 'Você precisa aceitar o Termo de Responsabilidade antes de realizar o pagamento.' },
                    { status: 400 }
                );
            }
        }

        const payer_ref = payer_type === 'ACADEMY' ? profile.tenant_id : user.id;
        if (!payer_ref) {
            return NextResponse.json({ error: 'Referência do pagador não encontrada.' }, { status: 400 });
        }

        // 4. Fetch cart items for this event
        let cartQuery = admin
            .from('event_registrations')
            .select('id, price, athlete_id, category_id, promo_source_id, promo_type_applied')
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

        // 4.5. Validate promo companion items — ensure their source registration is in the same cart
        type CartItem = typeof cartItems[number] & { promo_source_id?: string | null; promo_type_applied?: string | null };
        const cartIds = new Set(cartItems.map(i => i.id));
        for (const item of cartItems) {
            const promoSourceId = (item as CartItem).promo_source_id;
            if (promoSourceId && !cartIds.has(promoSourceId)) {
                // Source not in this cart batch — check if it's already paid/confirmed
                const { data: sourceReg } = await admin
                    .from('event_registrations')
                    .select('status')
                    .eq('id', promoSourceId)
                    .eq('athlete_id', user.id)
                    .maybeSingle();

                if (!sourceReg || !['pago', 'confirmado', 'isento'].includes(sourceReg.status)) {
                    return NextResponse.json(
                        { error: 'Uma categoria gratuita no carrinho perdeu o benefício (a categoria Absoluto correspondente não está mais ativa). Por favor, remova-a e tente novamente.' },
                        { status: 400 }
                    );
                }
            }
        }

        // 4.6. Validate combo_bundle items — garante que o combo está completo e os preços batem
        const comboBundleItems = cartItems.filter(i => (i as CartItem).promo_type_applied === 'combo_bundle');
        if (comboBundleItems.length > 0) {
            const { data: combo } = await admin
                .from('event_combo_bundles')
                .select('bundle_total, is_active')
                .eq('event_id', event_id)
                .eq('is_active', true)
                .maybeSingle();

            if (!combo) {
                return NextResponse.json(
                    { error: 'O combo de categorias foi desativado pelo organizador. Remova os itens do carrinho e adicione-os novamente pelo valor cheio.' },
                    { status: 400 }
                );
            }

            // Deve ter exatamente 4 itens no combo
            if (comboBundleItems.length !== 4) {
                return NextResponse.json(
                    { error: 'O pacote combo está incompleto. Adicione todas as 4 categorias do combo ou remova os itens com desconto.' },
                    { status: 400 }
                );
            }

            // Verifica se o preço armazenado bate com o esperado
            const expectedPrice = Math.round((combo.bundle_total / 4) * 100) / 100;
            for (const item of comboBundleItems) {
                if (Math.abs(Number(item.price) - expectedPrice) > 0.01) {
                    return NextResponse.json(
                        { error: 'O preço do combo diverge do configurado. Remova os itens e adicione-os novamente.' },
                        { status: 400 }
                    );
                }
            }
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

        // 2. Asaas config — resolvido aqui pois depende do tenant_id_organizer
        const config = await resolveAsaasConfig(tenant_id_organizer);
        if (!config) {
            return NextResponse.json({ error: 'Asaas não configurado.' }, { status: 500 });
        }

        // 7. Determine if own event
        const isOwnEvent = payer_type === 'ACADEMY' && payer_ref === tenant_id_organizer;

        // 8. Validation
        if (!isOwnEvent && !config.isOwnAccount && fee_saas_bruta > total_inscricoes && total_inscricoes > 0) {
            return NextResponse.json({ error: 'Taxa SaaS excede o valor total das inscrições.' }, { status: 400 });
        }

        // 9. Check organizer has approved Asaas subaccount (for split)
        // Pulado quando academia usa conta própria — o dinheiro vai direto para ela
        let organizerWalletId: string | null = null;
        if (!isOwnEvent && !config.isOwnAccount) {
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
            // Academia com API própria em evento próprio: confirma sem cobrança
            if (isOwnEvent && config.isOwnAccount) {
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
                    fee_saas_gross_snapshot: 0,
                    fee_source,
                    asaas_payment_id: `own_event_${paymentId}`,
                    asaas_customer_id: asaas_customer_id ?? null,
                    payment_method: 'PIX',
                    status: 'PAID',
                    is_no_split: false,
                    is_authorized_free: true,
                });

                const registrationIds = cartItems.map(i => i.id);
                const { error: regUpdateError } = await admin
                    .from('event_registrations')
                    .update({ status: 'pago', payment_id: paymentId })
                    .in('id', registrationIds);

                if (regUpdateError) {
                    auditLog('PAYMENT_ROLLBACK', { user_id: user.id, event_id, payment_id: paymentId, reason: 'own_event_reg_update_failed', error: regUpdateError.message }, 'error');
                    await admin.from('payments').delete().eq('id', paymentId);
                    return NextResponse.json({ error: 'Erro ao confirmar inscrições. Tente novamente.' }, { status: 500 });
                }

                // Consome tokens do organizador (1 por inscrição confirmada)
                await consumeTokens(tenant_id_organizer, qtd_inscricoes, {
                    eventId: event_id,
                    notes: `${qtd_inscricoes} inscrição(ões) confirmada(s) - evento próprio`,
                    createdBy: user.id,
                });

                auditLog('PAYMENT_OWN_EVENT_CONFIRMED', { user_id: user.id, event_id, payment_id: paymentId, qty: qtd_inscricoes });

                return NextResponse.json({
                    payment_id: paymentId,
                    free: true,
                    own_event: true,
                    message: 'Inscrições confirmadas sem cobrança.',
                });
            }

            const chargeValue = isOwnEvent ? fee_saas_bruta : total_inscricoes;

            if (chargeValue <= 0) {
                // For ATHLETE payments with zero total, validate that every free item
                // is legitimately free (genuinely priced at 0, not promo abuse).
                // Companions (promo_source_id set) must have their source in the same
                // batch — if the source is absent, it means the companion is alone and
                // should never be confirmed for free.
                if (payer_type === 'ATHLETE') {
                    const batchIds = new Set(cartItems.map(i => i.id));
                    for (const item of cartItems) {
                        if ((item as CartItem).promo_source_id && !batchIds.has((item as CartItem).promo_source_id!)) {
                            return NextResponse.json(
                                { error: 'Não é possível confirmar inscrição gratuita sem o pagamento da categoria Absoluto correspondente.' },
                                { status: 400 }
                            );
                        }
                    }
                }

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
                    is_authorized_free: true,
                });

                const registrationIds = cartItems.map(i => i.id);
                const { error: freeRegUpdateError } = await admin
                    .from('event_registrations')
                    .update({ status: 'pago', payment_id: paymentId })
                    .in('id', registrationIds);

                if (freeRegUpdateError) {
                    auditLog('PAYMENT_ROLLBACK', { user_id: user.id, event_id, payment_id: paymentId, reason: 'free_reg_update_failed', error: freeRegUpdateError.message }, 'error');
                    await admin.from('payments').delete().eq('id', paymentId);
                    return NextResponse.json({ error: 'Erro ao confirmar inscrições. Tente novamente.' }, { status: 500 });
                }

                // Consome tokens do organizador (1 por inscrição confirmada)
                await consumeTokens(tenant_id_organizer, qtd_inscricoes, {
                    eventId: event_id,
                    notes: `${qtd_inscricoes} inscrição(ões) gratuita(s) confirmada(s)`,
                    createdBy: user.id,
                });

                auditLog('PAYMENT_FREE_CONFIRMED', { user_id: user.id, event_id, payment_id: paymentId, qty: qtd_inscricoes });

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
        const { error: pendingRegUpdateError } = await admin
            .from('event_registrations')
            .update({
                status: 'aguardando_pagamento',
                payment_id: payment.id,
            })
            .in('id', registrationIds);

        if (pendingRegUpdateError) {
            auditLog('PAYMENT_ROLLBACK', {
                user_id: user.id,
                event_id,
                payment_id: payment.id,
                asaas_payment_id: paymentData.id,
                reason: 'pending_reg_update_failed',
                error: pendingRegUpdateError.message,
            }, 'error');
            // Compensating: remove the payment record from our DB.
            // The Asaas payment remains open — it will expire naturally.
            // The user can retry and a new Asaas payment will be created.
            await admin.from('payments').delete().eq('id', payment.id);
            return NextResponse.json(
                { error: 'Erro ao vincular inscrições ao pagamento. Tente novamente.' },
                { status: 500 }
            );
        }

        auditLog('PAYMENT_CREATED', {
            user_id: user.id,
            event_id,
            payment_id: payment.id,
            asaas_payment_id: paymentData.id,
            total: total_inscricoes,
            fee: fee_saas_bruta,
            qty: qtd_inscricoes,
            is_no_split: isNoSplit,
        });

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

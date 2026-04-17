import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { getEventFee } from '@/lib/fee-calculator';
import { calculateAsaasSplit } from '@/lib/payment-utils';
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
            .select('id, tenant_id, full_name, asaas_customer_id, asaas_customer_id_platform, cpf, gym_name, master_name')
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

        // 4.7. Revalidação server-side: recalcular preço esperado e comparar com o armazenado
        // Buscar todas as tabelas de preço vinculadas ao evento
        const { data: linkedTables } = await admin
            .from('event_category_tables')
            .select('category_table_id, registration_fee')
            .eq('event_id', event_id);

        const tablePriceMap = new Map(
            (linkedTables || []).map(lt => [lt.category_table_id, Number(lt.registration_fee)])
        );

        // Buscar overrides individuais por categoria
        const { data: allOverrides } = await admin
            .from('event_category_overrides')
            .select('category_id, registration_fee, promo_type')
            .eq('event_id', event_id);

        const overridePriceMap = new Map(
            (allOverrides || []).map(o => [o.category_id, Number(o.registration_fee)])
        );
        const overridePromoMap = new Map(
            (allOverrides || []).map(o => [o.category_id, o.promo_type])
        );

        // Buscar preço diferenciado por academia (aplica quando a academia é o pagador)
        let tenantPricingData: { registration_fee: number; promo_registration_fee: number | null } | null = null;
        if (payer_type === 'ACADEMY' && payer_ref) {
            const { data: tp } = await admin
                .from('event_tenant_pricing')
                .select('registration_fee, promo_registration_fee')
                .eq('event_id', event_id)
                .eq('tenant_id', payer_ref)
                .eq('active', true)
                .maybeSingle();
            tenantPricingData = tp;
        }

        // Buscar preço diferenciado por atleta (aplica quando o atleta é o pagador)
        // Match por gym_name/master_name do perfil do atleta, mesma lógica do carrinho
        let athletePricings: Array<{ gym_name: string | null; master_name: string | null; registration_fee: number }> | null = null;
        if (payer_type === 'ATHLETE' && (profile.gym_name || profile.master_name)) {
            const { data: ap } = await admin
                .from('event_athlete_pricing')
                .select('gym_name, master_name, registration_fee')
                .eq('event_id', event_id)
                .eq('active', true);
            athletePricings = ap;
        }

        const normStr = (s: string | null) =>
            (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

        const matchAthletePrice = (): number | null => {
            if (!athletePricings || athletePricings.length === 0) return null;
            const gym = normStr(profile.gym_name);
            const master = normStr(profile.master_name);
            // Prioridade: ambos > só gym > só master
            if (gym && master) {
                const m = athletePricings.find(ap => ap.gym_name && ap.master_name && normStr(ap.gym_name) === gym && normStr(ap.master_name) === master);
                if (m) return Number(m.registration_fee);
            }
            if (gym) {
                const m = athletePricings.find(ap => ap.gym_name && !ap.master_name && normStr(ap.gym_name) === gym);
                if (m) return Number(m.registration_fee);
            }
            if (master) {
                const m = athletePricings.find(ap => !ap.gym_name && ap.master_name && normStr(ap.master_name) === master);
                if (m) return Number(m.registration_fee);
            }
            return null;
        };

        // Buscar table_id e categoria_completa de cada categoria no carrinho
        const categoryIds = [...new Set(cartItems.map(i => i.category_id))];
        const { data: categoryRows } = await admin
            .from('category_rows')
            .select('id, table_id, categoria_completa')
            .in('id', categoryIds);

        const categoryTableMap = new Map(
            (categoryRows || []).map(c => [c.id, c.table_id])
        );
        const categoryNameMap = new Map(
            (categoryRows || []).map(c => [c.id, (c as any).categoria_completa as string | null])
        );
        const isAbsoluto = (catId: string) => normStr(categoryNameMap.get(catId) || '').includes('absoluto');

        // Validar cada item (exceto promos gratuitas e combos já validados acima)
        for (const item of cartItems) {
            const ci = item as CartItem;
            // Pular itens gratuitos de promo (free_second_registration com price 0)
            if (ci.promo_type_applied === 'free_second_registration' && Number(item.price) === 0) continue;
            // Combos já foram validados no passo 4.6
            if (ci.promo_type_applied === 'combo_bundle') continue;

            const tableId = categoryTableMap.get(item.category_id);
            const basePrice = overridePriceMap.get(item.category_id)
                ?? (tableId ? tablePriceMap.get(tableId) : null)
                ?? 0;

            const promoType = overridePromoMap.get(item.category_id) || null;

            let expectedPrice = basePrice;
            if (tenantPricingData) {
                if (promoType) {
                    if (tenantPricingData.promo_registration_fee !== null) {
                        expectedPrice = tenantPricingData.promo_registration_fee;
                    }
                } else {
                    expectedPrice = tenantPricingData.registration_fee;
                }
            }

            // Athlete pricing: só quando o próprio atleta paga e a categoria não é Absoluto
            // (mesma regra do carrinho em athlete-cart-actions.ts)
            if (payer_type === 'ATHLETE' && !isAbsoluto(item.category_id)) {
                const athletePrice = matchAthletePrice();
                if (athletePrice !== null) {
                    expectedPrice = athletePrice;
                }
            }

            if (Math.abs(Number(item.price) - expectedPrice) > 0.01) {
                return NextResponse.json(
                    { error: 'O preço de uma inscrição no carrinho diverge do valor atual. Remova os itens e adicione novamente.' },
                    { status: 400 }
                );
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

        // 10. Get/create Asaas customer
        // Conta da plataforma (split) usa campo separado para evitar conflito com contas próprias
        const customerIdField = config.isOwnAccount ? 'asaas_customer_id' : 'asaas_customer_id_platform';
        let asaas_customer_id = config.isOwnAccount
            ? profile.asaas_customer_id
            : profile.asaas_customer_id_platform;
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
                    try {
                        await admin.from('payments').insert({
                            event_id, payer_type, payer_ref, tenant_id_organizer,
                            qtd_inscricoes,
                            total_inscricoes_snapshot: total_inscricoes,
                            fee_unit_snapshot: fee,
                            fee_saas_gross_snapshot: fee_saas_bruta,
                            fee_source,
                            payment_method: 'PIX',
                            status: 'FAILED',
                            is_authorized_free: false,
                            error_type: 'customer_creation',
                            error_details: customerData,
                        });
                    } catch { /* silent — não afeta o fluxo */ }
                    return NextResponse.json(
                        { error: 'Erro ao criar cliente no Asaas.' },
                        { status: 500 }
                    );
                }

                asaas_customer_id = customerData.id;

                // Save to the correct field based on account type
                await admin
                    .from('profiles')
                    .update({ [customerIdField]: asaas_customer_id })
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
                    is_authorized_free: true,
                });

                const registrationIds = cartItems.map(i => i.id);
                const { error: regUpdateError } = await admin
                    .from('event_registrations')
                    .update({ status: 'isento', payment_id: paymentId })
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

            const originalCustomerId = config.isOwnAccount ? profile.asaas_customer_id : profile.asaas_customer_id_platform;
            if (isInvalidCustomer && attempt === 1 && originalCustomerId) {
                console.log(`[Asaas] Invalid customer ${asaas_customer_id} detected. Clearing and retrying...`);
                // Limpa no banco para o futuro (campo correto por tipo de conta)
                await admin.from('profiles').update({ [customerIdField]: null }).eq('id', user.id);
                // Limpa localmente para a próxima tentativa do loop
                asaas_customer_id = null;
                continue;
            }

            // Se for outro erro ou já for a segunda tentativa, sai do loop
            break;
        }

        if (!paymentRes?.ok || !paymentData?.id) {
            console.error('Failed to create Asaas payment:', JSON.stringify(paymentData, null, 2));
            try {
                await admin.from('payments').insert({
                    event_id, payer_type, payer_ref, tenant_id_organizer,
                    qtd_inscricoes,
                    total_inscricoes_snapshot: total_inscricoes,
                    fee_unit_snapshot: fee,
                    fee_saas_gross_snapshot: fee_saas_bruta,
                    fee_source,
                    payment_method: 'PIX',
                    status: 'FAILED',
                    is_authorized_free: false,
                    error_type: 'payment_creation',
                    error_details: paymentData,
                });
            } catch { /* silent — não afeta o fluxo */ }
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

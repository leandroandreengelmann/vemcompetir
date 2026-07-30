import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit-log';

/**
 * Gera uma cobrança PIX para o ATLETA pagar a própria inscrição, na conta Asaas
 * PRÓPRIA da academia dona do evento. Sem split e sem taxa — o valor cai 100% na
 * conta da academia. Usado quando a organizadora inscreve um atleta externo e quer
 * mandar o link/QR para ele pagar.
 *
 * A confirmação acontece via webhook do Asaas (marca as inscrições como `pago`).
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        if (!rateLimit(`athlete-link:${user.id}`, 10, 5 * 60 * 1000)) {
            return NextResponse.json(
                { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { event_id, registration_ids } = body as { event_id?: string; registration_ids?: string[] };

        if (!event_id || !Array.isArray(registration_ids) || registration_ids.length === 0) {
            return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
        }

        const admin = createAdminClient();

        // Caller deve ser academia organizadora do próprio evento
        const { data: profile } = await admin
            .from('profiles')
            .select('id, tenant_id, role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'academia/equipe' || !profile.tenant_id) {
            return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }

        const { data: event } = await admin
            .from('events')
            .select('id, tenant_id, title')
            .eq('id', event_id)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
        }
        if (event.tenant_id !== profile.tenant_id) {
            return NextResponse.json({ error: 'Este evento não pertence à sua academia.' }, { status: 403 });
        }

        // Resolve a API Asaas PRÓPRIA da academia dona do evento — obrigatória
        const { data: tenant } = await admin
            .from('tenants')
            .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
            .eq('id', event.tenant_id)
            .single();

        if (!tenant?.use_own_asaas_api || !tenant.asaas_api_key_encrypted || !tenant.asaas_api_key_iv) {
            return NextResponse.json(
                { error: 'A academia dona do evento ainda não configurou a API Asaas própria. Configure-a para gerar links de pagamento, ou marque a inscrição como PIX direto na conta.' },
                { status: 400 }
            );
        }

        const apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
        const { data: settings } = await admin
            .from('asaas_settings')
            .select('environment')
            .eq('is_enabled', true)
            .single();
        const baseUrl = settings?.environment === 'production'
            ? 'https://api.asaas.com'
            : 'https://api-sandbox.asaas.com';

        // Inscrições alvo (carrinho deste evento, registradas por este usuário)
        const { data: regs } = await admin
            .from('event_registrations')
            .select('id, price, athlete_id, status')
            .in('id', registration_ids)
            .eq('event_id', event_id)
            .eq('registered_by', user.id)
            .eq('status', 'carrinho');

        if (!regs || regs.length !== registration_ids.length) {
            return NextResponse.json({ error: 'Algumas inscrições não foram encontradas no carrinho.' }, { status: 400 });
        }

        // Todas as inscrições devem ser do mesmo atleta (o link é dele)
        const athleteIds = [...new Set(regs.map(r => r.athlete_id))];
        if (athleteIds.length !== 1) {
            return NextResponse.json({ error: 'O link deve ser de um único atleta.' }, { status: 400 });
        }
        const athleteId = athleteIds[0];

        const total = regs.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
        if (total <= 0) {
            return NextResponse.json({ error: 'O valor total das inscrições é zero. Use a confirmação direta.' }, { status: 400 });
        }

        const { data: athlete } = await admin
            .from('profiles')
            .select('full_name, cpf')
            .eq('id', athleteId)
            .single();

        if (!athlete?.cpf) {
            return NextResponse.json(
                { error: 'O atleta não possui CPF cadastrado. Atualize o cadastro antes de gerar o link.' },
                { status: 400 }
            );
        }

        // Cria o cliente Asaas (na conta da academia) para o atleta
        const customerRes = await fetch(`${baseUrl}/v3/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
            body: JSON.stringify({
                name: athlete.full_name || 'Atleta',
                cpfCnpj: athlete.cpf,
            }),
        });
        const customerData = await customerRes.json();
        if (!customerRes.ok || !customerData.id) {
            console.error('[create-athlete-link] customer error:', customerData);
            return NextResponse.json({ error: 'Erro ao criar cliente no Asaas.' }, { status: 500 });
        }

        // Cobrança PIX pelo valor cheio — SEM split
        const paymentRes = await fetch(`${baseUrl}/v3/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
            body: JSON.stringify({
                customer: customerData.id,
                billingType: 'PIX',
                value: parseFloat(total.toFixed(2)),
                description: `Inscrição - ${event.title ?? 'evento'}`,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            }),
        });
        const paymentData = await paymentRes.json();
        if (!paymentRes.ok || !paymentData.id) {
            console.error('[create-athlete-link] payment error:', paymentData);
            return NextResponse.json({ error: 'Erro ao criar cobrança no Asaas.' }, { status: 500 });
        }

        // QR Code
        let pix_qr_code: string | null = null;
        let pix_payload: string | null = null;
        const qrRes = await fetch(`${baseUrl}/v3/payments/${paymentData.id}/pixQrCode`, {
            headers: { 'access_token': apiKey },
        });
        if (qrRes.ok) {
            const qr = await qrRes.json();
            pix_qr_code = qr.encodedImage || null;
            pix_payload = qr.payload || null;
        }

        // Registro do pagamento — fee zero, organizador = academia dona (webhook usa a chave própria dela)
        const { data: payment, error: payErr } = await admin
            .from('payments')
            .insert({
                event_id,
                payer_type: 'ATHLETE',
                payer_ref: athleteId,
                tenant_id_organizer: event.tenant_id,
                qtd_inscricoes: regs.length,
                total_inscricoes_snapshot: parseFloat(total.toFixed(2)),
                fee_unit_snapshot: 0,
                fee_saas_gross_snapshot: 0,
                fee_source: 'NONE',
                asaas_payment_id: paymentData.id,
                asaas_customer_id: customerData.id,
                payment_method: 'PIX',
                pix_qr_code,
                pix_payload,
                status: 'PENDING',
            })
            .select('id')
            .single();

        if (payErr || !payment) {
            console.error('[create-athlete-link] save payment error:', payErr);
            return NextResponse.json({ error: 'Erro ao salvar o pagamento.' }, { status: 500 });
        }

        // Vincula as inscrições ao pagamento (aguardando pagamento)
        const { error: regErr } = await admin
            .from('event_registrations')
            .update({ status: 'aguardando_pagamento', payment_id: payment.id })
            .in('id', regs.map(r => r.id));

        if (regErr) {
            await admin.from('payments').delete().eq('id', payment.id);
            return NextResponse.json({ error: 'Erro ao vincular as inscrições. Tente novamente.' }, { status: 500 });
        }

        auditLog('ATHLETE_LINK_CREATED', {
            user_id: user.id, event_id, payment_id: payment.id,
            asaas_payment_id: paymentData.id, total, qty: regs.length,
        });

        const pix_expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        return NextResponse.json({
            payment_id: payment.id,
            asaas_payment_id: paymentData.id,
            pix_qr_code,
            pix_payload,
            pix_expiration,
            total_inscricoes: total,
            invoice_url: paymentData.invoiceUrl ?? null,
            athlete_name: athlete.full_name ?? null,
        });
    } catch (error) {
        console.error('create-athlete-link error:', error);
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }
}

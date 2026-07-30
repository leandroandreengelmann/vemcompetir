'use server';

import { requireTenantScope } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsappMedia, sendWhatsappText } from '@/lib/evolution';

function buildCaption(opts: {
    athleteName: string | null;
    eventTitle: string | null;
    amount: number;
    pixPayload: string | null;
    invoiceUrl: string | null;
}): string {
    const valor = `R$ ${Number(opts.amount || 0).toFixed(2).replace('.', ',')}`;
    const lines = [
        `🥋 Olá ${opts.athleteName || 'atleta'}! Sua inscrição${opts.eventTitle ? ` em *${opts.eventTitle}*` : ''} está reservada.`,
        ``,
        `*Valor:* ${valor}`,
        `Escaneie o QR Code acima ou copie o código PIX abaixo:`,
    ];
    if (opts.pixPayload) lines.push(``, opts.pixPayload);
    if (opts.invoiceUrl) lines.push(``, `Ou pague pelo link: ${opts.invoiceUrl}`);
    lines.push(``, `Assim que o pagamento for confirmado, sua vaga é garantida. ✅`);
    return lines.join('\n');
}

/**
 * Recupera os dados da cobrança PIX de uma inscrição pendente, para reenviar o QR/código
 * (ex.: na lista de inscrições "aguardando pagamento"). Valida posse pelo tenant.
 */
export async function getPixResendDataAction(registrationId: string) {
    const { profile, tenant_id } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' as const };

    const admin = createAdminClient();

    const { data: reg } = await admin
        .from('event_registrations')
        .select('id, payment_id, status')
        .eq('id', registrationId)
        .maybeSingle();

    if (!reg?.payment_id) return { error: 'Esta inscrição não tem cobrança PIX gerada.' as const };

    const { data: payment } = await admin
        .from('payments')
        .select('id, pix_qr_code, pix_payload, total_inscricoes_snapshot, tenant_id_organizer, payer_ref')
        .eq('id', reg.payment_id)
        .maybeSingle();

    if (!payment) return { error: 'Pagamento não encontrado.' as const };
    if (payment.tenant_id_organizer !== tenant_id) return { error: 'Sem permissão.' as const };
    if (!payment.pix_qr_code) return { error: 'Esta cobrança não é PIX por link (sem QR Code).' as const };

    const { data: athlete } = await admin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', payment.payer_ref)
        .maybeSingle();

    return {
        ok: true as const,
        paymentId: payment.id,
        pix_qr_code: payment.pix_qr_code,
        pix_payload: payment.pix_payload,
        total: Number(payment.total_inscricoes_snapshot || 0),
        athlete_name: athlete?.full_name ?? null,
        athlete_phone: athlete?.phone ?? null,
    };
}

/**
 * Envia o QR Code do PIX (imagem) + código/links pelo WhatsApp do atleta via Evolution API.
 * Os dados sensíveis (QR, valor) vêm do registro de pagamento no banco; telefone e invoiceUrl
 * podem vir do cliente (telefone é editável pelo organizador).
 */
export async function sendPixWhatsappAction(input: {
    paymentId: string;
    phone?: string | null;
    invoiceUrl?: string | null;
}) {
    const { profile, tenant_id } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { ok: false, error: 'Sem permissão.' };

    const admin = createAdminClient();

    const { data: payment } = await admin
        .from('payments')
        .select('id, pix_qr_code, pix_payload, total_inscricoes_snapshot, event_id, payer_ref, tenant_id_organizer')
        .eq('id', input.paymentId)
        .maybeSingle();

    if (!payment) return { ok: false, error: 'Pagamento não encontrado.' };
    if (payment.tenant_id_organizer !== tenant_id) return { ok: false, error: 'Este pagamento não pertence à sua academia.' };
    if (!payment.pix_qr_code) return { ok: false, error: 'Este pagamento não tem QR Code (não é cobrança PIX por link).' };

    const [{ data: event }, { data: athlete }] = await Promise.all([
        admin.from('events').select('title').eq('id', payment.event_id).maybeSingle(),
        admin.from('profiles').select('full_name, phone').eq('id', payment.payer_ref).maybeSingle(),
    ]);

    // Telefone: usa o informado, senão o do perfil do atleta
    const phone = ((input.phone || athlete?.phone || '') as string).replace(/\D/g, '');
    if (phone.length < 10) return { ok: false, error: 'Atleta sem telefone válido. Informe o WhatsApp.' };

    const caption = buildCaption({
        athleteName: athlete?.full_name ?? null,
        eventTitle: event?.title ?? null,
        amount: Number(payment.total_inscricoes_snapshot || 0),
        pixPayload: payment.pix_payload,
        invoiceUrl: input.invoiceUrl ?? null,
    });

    const res = await sendWhatsappMedia({
        phone,
        base64Image: payment.pix_qr_code,
        caption,
        fileName: 'pix.png',
        recipientId: payment.payer_ref,
        relatedEntityType: 'payment',
        relatedEntityId: payment.id,
    });

    if (res.ok) return { ok: true as const };

    // Fallback: se a imagem falhar (ex.: hiccup no upload), tenta texto com código + link.
    const textRes = await sendWhatsappText({ phone, text: caption });
    if (textRes.ok) {
        return { ok: true as const, fallback: 'text' as const, note: 'Enviado como texto (sem a imagem do QR).' };
    }

    // Os dois falharam — retorna o erro mais informativo (geralmente o da mídia).
    return { ok: false as const, error: res.error || textRes.error };
}

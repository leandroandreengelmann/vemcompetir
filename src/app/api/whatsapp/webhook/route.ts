import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // ── Ao conectar: Z-API notifica que o WhatsApp conectou ──
        if (body?.connected === true || body?.status === 'CONNECTED') {
            const supabase = createAdminClient();
            await supabase
                .from('whatsapp_config')
                .update({ connected: true, connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // atualiza o único registro existente
            return NextResponse.json({ ok: true });
        }

        // ── Presença do chat: contato está digitando ou ficou online ──
        if (body?.presence !== undefined || (body?.isOnline !== undefined && !body?.text?.message)) {
            const phone = body?.phone?.replace(/\D/g, '');
            if (phone) {
                const presence = body?.presence ?? (body?.isOnline ? 'available' : 'unavailable');
                const supabase = createAdminClient();
                const channel = supabase.channel('whatsapp-presence');
                await channel.send({
                    type: 'broadcast',
                    event: 'presence_update',
                    payload: { phone, presence },
                });
            }
            return NextResponse.json({ ok: true });
        }

        // ── Echo "Ao enviar": Z-API ecoa mensagens que nós enviamos ──
        // Payload: { fromMe: true, text: { message }, zaapId, ... }
        // Já salvamos a mensagem em sendMessage() — só atualiza zaapId se ausente
        if (body?.fromMe === true && body?.text?.message) {
            const zaapId = body?.zaapId ?? body?.messageId ?? null;
            if (zaapId) {
                const supabase = createAdminClient();
                // Busca a mensagem outbound mais recente sem zaapId e com o mesmo texto
                const { data: msg } = await supabase
                    .from('whatsapp_messages')
                    .select('id')
                    .eq('direction', 'outbound')
                    .is('zapi_message_id', null)
                    .eq('body', body.text.message)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (msg) {
                    await supabase
                        .from('whatsapp_messages')
                        .update({ zapi_message_id: zaapId })
                        .eq('id', msg.id);
                }
            }
            return NextResponse.json({ ok: true });
        }

        // ── Status callback: Z-API notifica que nossa mensagem foi recebida/lida ──
        // Payload: { zaapId, phone, fromMe: true, status: "RECEIVED" | "READ", ... }
        // Não tem campo text/message — só atualiza o status da mensagem salva
        const statusRaw = body?.status as string | undefined;
        if (body?.fromMe === true && statusRaw && !body?.text?.message) {
            const zaapId = body?.zaapId ?? body?.messageId ?? null;
            if (zaapId) {
                const statusMap: Record<string, string> = {
                    RECEIVED: 'delivered',
                    received: 'delivered',
                    READ: 'read',
                    read: 'read',
                    PLAYED: 'read',
                    played: 'read',
                };
                const newStatus = statusMap[statusRaw];
                if (newStatus) {
                    const supabase = createAdminClient();
                    await supabase
                        .from('whatsapp_messages')
                        .update({ status: newStatus })
                        .eq('zapi_message_id', zaapId);
                }
            }
            return NextResponse.json({ ok: true });
        }

        // Z-API payload: { phone, text: { message }, isGroupMsg, ... }
        const phone = body?.phone?.replace(/\D/g, '');
        const message = body?.text?.message ?? body?.caption ?? null;
        const zaapId = body?.messageId ?? null;
        const mediaUrl = body?.image?.imageUrl ?? body?.document?.documentUrl ?? null;
        const mediaType = body?.image ? 'image' : body?.document ? 'document' : body?.audio ? 'audio' : null;

        if (!phone) return NextResponse.json({ ok: true }); // ignorar se não tiver telefone
        if (body?.isGroupMsg) return NextResponse.json({ ok: true }); // ignorar grupos

        const supabase = createAdminClient();

        // Deduplicação por zapi_message_id
        if (zaapId) {
            const { data: existing } = await supabase
                .from('whatsapp_messages')
                .select('id')
                .eq('zapi_message_id', zaapId)
                .maybeSingle();
            if (existing) return NextResponse.json({ ok: true });
        }

        // Busca ou cria conversa
        let { data: conv } = await supabase
            .from('whatsapp_conversations')
            .select('id, contact_name, contact_type, linked_id, unread_count')
            .eq('phone', phone)
            .maybeSingle();

        if (!conv) {
            // Tenta identificar o contato no sistema
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, role, tenant_id')
                .or(`phone.eq.${phone}`)
                .maybeSingle();

            const contactType = profile?.role === 'atleta' ? 'atleta'
                : profile?.role === 'academia/equipe' ? 'academia'
                : 'desconhecido';

            const { data: newConv } = await supabase
                .from('whatsapp_conversations')
                .insert({
                    phone,
                    contact_name: profile?.full_name ?? null,
                    contact_type: contactType,
                    linked_id: profile?.id ?? null,
                    last_message: message,
                    last_message_at: new Date().toISOString(),
                    unread_count: 1,
                    status: 'aberta',
                })
                .select('id, contact_name, contact_type, linked_id, unread_count')
                .single();
            conv = newConv;
        } else {
            // Atualiza conversa existente
            await supabase
                .from('whatsapp_conversations')
                .update({
                    last_message: message,
                    last_message_at: new Date().toISOString(),
                    unread_count: (conv.unread_count ?? 0) + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', conv.id);
        }

        // Salva mensagem
        await supabase.from('whatsapp_messages').insert({
            conversation_id: conv!.id,
            zapi_message_id: zaapId,
            direction: 'inbound',
            body: message,
            media_url: mediaUrl,
            media_type: mediaType,
            status: 'delivered',
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[WhatsApp webhook error]', err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

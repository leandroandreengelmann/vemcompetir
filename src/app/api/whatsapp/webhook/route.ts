import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const type = body?.type as string | undefined;

        // ── ConnectedCallback: WhatsApp conectou ──
        if (type === 'ConnectedCallback' || body?.connected === true) {
            const supabase = createAdminClient();
            await supabase
                .from('whatsapp_config')
                .update({ connected: true, connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('connected', false); // só atualiza se estava desconectado
            return NextResponse.json({ ok: true });
        }

        // ── MessageStatusCallback: mensagem entregue ou lida ──
        if (type === 'MessageStatusCallback') {
            const ids: string[] = body?.ids ?? [];
            const statusRaw = body?.status as string | undefined;
            console.log('[STATUS CALLBACK]', JSON.stringify({ type, ids, statusRaw, body }));
            const statusMap: Record<string, string> = {
                RECEIVED: 'delivered',
                READ: 'read',
                PLAYED: 'read',
            };
            const newStatus = statusRaw ? statusMap[statusRaw] : null;
            if (newStatus && ids.length > 0) {
                const supabase = createAdminClient();
                await supabase
                    .from('whatsapp_messages')
                    .update({ status: newStatus })
                    .in('zapi_message_id', ids);
            }
            return NextResponse.json({ ok: true });
        }

        // ── PresenceChatCallback: digitando / online ──
        if (type === 'PresenceChatCallback') {
            const phone = body?.phone ? normalizePhone(body.phone) : null;
            const presence = body?.status as string | undefined; // COMPOSING, PAUSED, AVAILABLE, UNAVAILABLE
            if (phone && presence) {
                const supabase = createAdminClient();
                const channel = supabase.channel('whatsapp-presence');
                await channel.send({
                    type: 'broadcast',
                    event: 'presence_update',
                    payload: { phone, presence: presence.toLowerCase() },
                });
            }
            return NextResponse.json({ ok: true });
        }

        // ── ReceivedCallback: mensagem recebida ──
        if (type === 'ReceivedCallback') {
            if (body?.fromMe === true) return NextResponse.json({ ok: true }); // ignora echo
            if (body?.isGroup === true) return NextResponse.json({ ok: true }); // ignora grupos

            const phone = body?.phone ? normalizePhone(body.phone) : null;
            const message = body?.text?.message ?? body?.caption ?? null;
            const zaapId = body?.messageId ?? null;
            const mediaUrl = body?.image?.imageUrl ?? body?.video?.videoUrl ?? body?.document?.documentUrl ?? body?.audio?.audioUrl ?? null;
            const mediaType = body?.image ? 'image' : body?.video ? 'video' : body?.document ? 'document' : body?.audio ? 'audio' : null;

            if (!phone) return NextResponse.json({ ok: true });

            const supabase = createAdminClient();

            // Deduplicação
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
                .select('id, unread_count')
                .eq('phone', phone)
                .maybeSingle();

            if (!conv) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .eq('phone', phone)
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
                    .select('id, unread_count')
                    .single();
                conv = newConv;
            } else {
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
        }

        // ── Fallback: Z-API sem campo type — detecta pelo conteúdo ──
        console.log('[FALLBACK payload]', JSON.stringify({ fromMe: body?.fromMe, messageId: body?.messageId, type: body?.type, keys: Object.keys(body ?? {}) }));

        // Echo "Ao enviar": fromMe=true, tem messageId (ID nativo WhatsApp)
        // Atualiza o zapi_message_id da mensagem enviada para o ID que o status callback usa
        if (body?.fromMe === true && body?.messageId) {
            console.log('[ECHO payload]', JSON.stringify(body));
            const whatsappId = body.messageId as string;
            const phone = body?.phone ? normalizePhone(body.phone) : null;
            if (phone) {
                const supabase = createAdminClient();
                // Busca a mensagem outbound mais recente para esse telefone com ID interno (019D...)
                const { data: conv } = await supabase
                    .from('whatsapp_conversations')
                    .select('id')
                    .eq('phone', phone)
                    .maybeSingle();
                if (conv) {
                    const { data: msg } = await supabase
                        .from('whatsapp_messages')
                        .select('id')
                        .eq('conversation_id', conv.id)
                        .eq('direction', 'outbound')
                        .not('zapi_message_id', 'like', '3EB%') // ainda com ID interno
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (msg) {
                        await supabase
                            .from('whatsapp_messages')
                            .update({ zapi_message_id: whatsappId })
                            .eq('id', msg.id);
                    }
                }
            }
            return NextResponse.json({ ok: true });
        }

        // Mensagem inbound: tem phone, fromMe=false e texto ou mídia
        const hasContent = body?.text?.message || body?.caption || body?.image || body?.video || body?.document || body?.audio;
        if (body?.fromMe === false && body?.phone && hasContent) {
            const phone = body?.phone ? normalizePhone(body.phone) : null;
            const message = body?.text?.message ?? body?.caption ?? null;
            const zaapId = body?.messageId ?? null;
            const mediaUrl = body?.image?.imageUrl ?? body?.video?.videoUrl ?? body?.document?.documentUrl ?? body?.audio?.audioUrl ?? null;
            const mediaType = body?.image ? 'image' : body?.video ? 'video' : body?.document ? 'document' : body?.audio ? 'audio' : null;

            if (!phone) return NextResponse.json({ ok: true });
            if (body?.isGroup === true) return NextResponse.json({ ok: true });

            const supabase = createAdminClient();

            if (zaapId) {
                const { data: existing } = await supabase
                    .from('whatsapp_messages')
                    .select('id')
                    .eq('zapi_message_id', zaapId)
                    .maybeSingle();
                if (existing) return NextResponse.json({ ok: true });
            }

            let { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('id, unread_count')
                .eq('phone', phone)
                .maybeSingle();

            if (!conv) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .eq('phone', phone)
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
                    .select('id, unread_count')
                    .single();
                conv = newConv;
            } else {
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

            await supabase.from('whatsapp_messages').insert({
                conversation_id: conv!.id,
                zapi_message_id: zaapId,
                direction: 'inbound',
                body: message,
                media_url: mediaUrl,
                media_type: mediaType,
                status: 'delivered',
            });
        }

        return NextResponse.json({ ok: true });

    } catch (err) {
        console.error('[WhatsApp webhook error]', err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

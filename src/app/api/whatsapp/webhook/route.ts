import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
            const phone = body?.phone?.replace(/\D/g, '');
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

            const phone = body?.phone?.replace(/\D/g, '');
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
        // Loga o payload para debug nos logs da Vercel
        console.log('[WhatsApp webhook] payload sem type reconhecido:', JSON.stringify(body));

        // Mensagem inbound: tem phone, fromMe=false e texto ou mídia
        const hasContent = body?.text?.message || body?.caption || body?.image || body?.video || body?.document || body?.audio;
        if (body?.fromMe === false && body?.phone && hasContent) {
            const phone = body?.phone?.replace(/\D/g, '');
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

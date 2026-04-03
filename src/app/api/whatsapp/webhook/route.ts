import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';

function decryptApiKey(stored: string): string {
    if (!stored) return stored;
    const parts = stored.split(':');
    if (parts.length === 3) {
        try {
            return decrypt(`${parts[1]}:${parts[2]}`, parts[0]);
        } catch {
            // Plain text legacy key — return as-is
        }
    }
    return stored;
}

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
}

// ─── Envia mensagem via Z-API ─────────────────────────────────────────────────

async function sendZapi(config: any, phone: string, message: string) {
    const res = await fetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(config.client_token ? { 'Client-Token': config.client_token } : {}) },
            body: JSON.stringify({ phone, message }),
        }
    );
    if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error('[sendZapi error]', res.status, err);
    }
}

// ─── Salva mensagem outbound no banco ────────────────────────────────────────

async function saveOutboundMessage(supabase: any, conversationId: string, body: string) {
    await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        body,
        status: 'sent',
    });
    await supabase.from('whatsapp_conversations').update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        last_message_direction: 'outbound',
        last_message_status: 'sent',
        updated_at: new Date().toISOString(),
    }).eq('id', conversationId);
}

// ─── Palavras que acionam atendimento humano ──────────────────────────────────

const HUMAN_TRIGGERS = [
    'falar com humano', 'falar com atendente', 'falar com pessoa',
    'quero humano', 'quero atendente', 'preciso de atendente',
    'atendente humano', 'suporte humano', 'falar com alguem',
    'falar com alguém', 'me transfere', 'me transferir',
    'nao quero ia', 'não quero ia', 'nao quero robo', 'não quero robô',
];

function isHumanRequest(text: string): boolean {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return HUMAN_TRIGGERS.some(t =>
        lower.includes(t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );
}

// ─── Chama OpenAI e retorna resposta ─────────────────────────────────────────

async function callOpenAI(aiConfig: any, conversationId: string, userMessage: string, supabase: any, contactName?: string | null): Promise<string | null> {
    try {
        // Busca histórico da conversa (últimas 20 mensagens)
        const { data: history } = await supabase
            .from('whatsapp_messages')
            .select('direction, body')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(20);

        const nameHint = contactName
            ? `\n\nNome do contato nesta conversa: ${contactName}. Use o primeiro nome ao cumprimentar. NUNCA use {nome} ou qualquer placeholder — sempre use o nome real ou cumprimente sem nome.`
            : `\n\nNome do contato desconhecido. Cumprimente sem mencionar nome. NUNCA use {nome} ou qualquer placeholder nas respostas.`;

        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            { role: 'system', content: aiConfig.system_prompt + nameHint },
        ];

        for (const msg of history ?? []) {
            if (!msg.body) continue;
            messages.push({ role: msg.direction === 'inbound' ? 'user' : 'assistant', content: msg.body });
        }

        // Garante que a última mensagem do usuário está incluída
        if (messages[messages.length - 1]?.content !== userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decryptApiKey(aiConfig.openai_api_key)}`,
            },
            body: JSON.stringify({
                model: aiConfig.model ?? 'gpt-4o-mini',
                messages,
                max_tokens: 600,
                temperature: 0.7,
            }),
        });

        const json = await res.json();
        return json?.choices?.[0]?.message?.content ?? null;
    } catch (err) {
        console.error('[AI error]', err);
        return null;
    }
}

// ─── Notifica admin no WhatsApp pessoal ──────────────────────────────────────

async function notifyAdmin(zapiConfig: any, aiConfig: any, contactName: string | null, phone: string, lastMessage: string) {
    const name = contactName ?? phone;
    const msg = `🔔 *Atendimento solicitado*\n👤 Contato: ${name}\n📱 Telefone: ${phone}\n💬 Mensagem: "${lastMessage}"\n\n➡️ Acesse o inbox para responder.`;
    await sendZapi(zapiConfig, aiConfig.admin_phone, msg);
}

// ─── Handler principal de mensagem inbound ───────────────────────────────────

async function handleInboundMessage(phone: string, message: string | null, zaapId: string | null, mediaUrl: string | null, mediaType: string | null) {
    const supabase = createAdminClient();

    // Deduplicação
    if (zaapId) {
        const { data: existing } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('zapi_message_id', zaapId)
            .maybeSingle();
        if (existing) return;
    }

    // Busca ou cria conversa
    let { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('id, unread_count, handler_mode, contact_name')
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

        const { data: newConv, error: insertErr } = await supabase
            .from('whatsapp_conversations')
            .insert({
                phone,
                contact_name: profile?.full_name ?? null,
                contact_type: contactType,
                linked_id: profile?.id ?? null,
                last_message: message,
                last_message_at: new Date().toISOString(),
                last_message_direction: 'inbound',
                last_message_status: 'delivered',
                unread_count: 1,
                status: 'aberta',
                handler_mode: 'ai',
            })
            .select('id, unread_count, handler_mode, contact_name')
            .single();

        if (insertErr) {
            // Race condition: another concurrent request created this conversation first
            const { data: existing } = await supabase
                .from('whatsapp_conversations')
                .select('id, unread_count, handler_mode, contact_name')
                .eq('phone', phone)
                .maybeSingle();
            conv = existing;
        } else {
            conv = newConv;
        }
    } else {
        await supabase
            .from('whatsapp_conversations')
            .update({
                last_message: message,
                last_message_at: new Date().toISOString(),
                last_message_direction: 'inbound',
                last_message_status: 'delivered',
                unread_count: (conv.unread_count ?? 0) + 1,
                updated_at: new Date().toISOString(),
            })
            .eq('id', conv.id);
    }

    // Salva mensagem inbound
    await supabase.from('whatsapp_messages').insert({
        conversation_id: conv!.id,
        zapi_message_id: zaapId,
        direction: 'inbound',
        body: message,
        media_url: mediaUrl,
        media_type: mediaType,
        status: 'delivered',
    });

    // Sem texto → não processa IA
    if (!message) return;

    // Busca configs
    const [{ data: zapiConfig }, { data: aiConfig }] = await Promise.all([
        supabase.from('whatsapp_config').select('*').limit(1).maybeSingle(),
        supabase.from('ai_config').select('*').limit(1).maybeSingle(),
    ]);

    if (!zapiConfig?.connected) return;

    const handlerMode = conv!.handler_mode ?? 'ai';

    // ── Modo HUMANO: admin está tratando, não faz nada ────────────────────────
    if (handlerMode === 'human') return;

    // ── Pedido de atendimento humano ──────────────────────────────────────────
    if (isHumanRequest(message)) {
        // Muda modo para humano
        await supabase.from('whatsapp_conversations').update({ handler_mode: 'human', updated_at: new Date().toISOString() }).eq('id', conv!.id);

        // Avisa o usuário
        const userMsg = '👤 Entendido! Vou chamar um atendente humano. Aguarde um momento, ele entrará em contato em breve pelo inbox. 🙏';
        await sendZapi(zapiConfig, phone, userMsg);
        await saveOutboundMessage(supabase, conv!.id, userMsg);

        // Notifica admin
        if (aiConfig?.admin_phone) {
            await notifyAdmin(zapiConfig, aiConfig, conv!.contact_name, phone, message);
        }
        return;
    }

    // ── Modo IA: responde automaticamente ────────────────────────────────────
    if (aiConfig?.enabled && aiConfig?.openai_api_key) {
        const aiReply = await callOpenAI(aiConfig, conv!.id, message, supabase, conv!.contact_name);

        if (aiReply) {
            await sendZapi(zapiConfig, phone, aiReply);
            await saveOutboundMessage(supabase, conv!.id, aiReply);
        } else {
            // Fallback se IA falhou
            const fallback = 'Olá! Recebi sua mensagem. Nossa equipe irá responder em breve. 😊';
            await sendZapi(zapiConfig, phone, fallback);
            await saveOutboundMessage(supabase, conv!.id, fallback);
        }
    }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // ── Validate Client-Token ──
        const supabaseAdmin = createAdminClient();
        const { data: webhookConfig } = await supabaseAdmin
            .from('whatsapp_config')
            .select('id, client_token')
            .limit(1)
            .maybeSingle();

        if (webhookConfig?.client_token) {
            const incomingToken = req.headers.get('Client-Token');
            if (incomingToken !== webhookConfig.client_token) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const type = body?.type as string | undefined;

        // ── ConnectedCallback ──
        if (type === 'ConnectedCallback' || body?.connected === true) {
            if (webhookConfig) {
                await supabaseAdmin
                    .from('whatsapp_config')
                    .update({ connected: true, connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('id', webhookConfig.id);
            }
            return NextResponse.json({ ok: true });
        }

        // ── MessageStatusCallback ──
        if (type === 'MessageStatusCallback') {
            const ids: string[] = body?.ids ?? [];
            const statusRaw = body?.status as string | undefined;
            const statusMap: Record<string, string> = { RECEIVED: 'delivered', READ: 'read', PLAYED: 'read' };
            const newStatus = statusRaw ? statusMap[statusRaw] : null;

            if (newStatus && ids.length > 0) {
                const supabase = createAdminClient();
                const { data: updated } = await supabase
                    .from('whatsapp_messages')
                    .update({ status: newStatus })
                    .in('zapi_message_id', ids)
                    .select('id, conversation_id');
                const count = updated?.length ?? 0;

                if (count > 0 && updated) {
                    const convIds = [...new Set(updated.map((m: any) => m.conversation_id))];
                    for (const convId of convIds) {
                        await supabase
                            .from('whatsapp_conversations')
                            .update({ last_message_status: newStatus, updated_at: new Date().toISOString() })
                            .eq('id', convId)
                            .eq('last_message_direction', 'outbound');
                    }
                }

                if (!count || count === 0) {
                    const phone = body?.phone ? normalizePhone(body.phone) : null;
                    if (phone) {
                        const { data: conv } = await supabase
                            .from('whatsapp_conversations')
                            .select('id')
                            .eq('phone', phone)
                            .maybeSingle();
                        if (conv) {
                            await supabase
                                .from('whatsapp_messages')
                                .update({ status: newStatus })
                                .eq('conversation_id', conv.id)
                                .eq('direction', 'outbound')
                                .in('status', newStatus === 'read' ? ['sent', 'delivered'] : ['sent']);
                            await supabase
                                .from('whatsapp_conversations')
                                .update({ last_message_status: newStatus, updated_at: new Date().toISOString() })
                                .eq('id', conv.id)
                                .eq('last_message_direction', 'outbound');
                        }
                    }
                }
            }
            return NextResponse.json({ ok: true });
        }

        // ── PresenceChatCallback ──
        if (type === 'PresenceChatCallback') {
            const phone = body?.phone ? normalizePhone(body.phone) : null;
            const presence = body?.status as string | undefined;
            if (phone && presence) {
                const supabase = createAdminClient();
                const channel = supabase.channel('whatsapp-presence');
                // Subscribe first, then broadcast (fire-and-forget — presence is best-effort)
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        channel.send({
                            type: 'broadcast',
                            event: 'presence_update',
                            payload: { phone, presence: presence.toLowerCase() },
                        }).catch(() => {});
                    }
                });
            }
            return NextResponse.json({ ok: true });
        }

        // ── ReceivedCallback ──
        if (type === 'ReceivedCallback') {
            if (body?.fromMe === true) return NextResponse.json({ ok: true });
            if (body?.isGroup === true) return NextResponse.json({ ok: true });

            const phone = body?.phone ? normalizePhone(body.phone) : null;
            if (!phone) return NextResponse.json({ ok: true });

            const message = body?.text?.message ?? body?.caption ?? null;
            const zaapId = body?.messageId ?? null;
            const mediaUrl = body?.image?.imageUrl ?? body?.video?.videoUrl ?? body?.document?.documentUrl ?? body?.audio?.audioUrl ?? null;
            const mediaType = body?.image ? 'image' : body?.video ? 'video' : body?.document ? 'document' : body?.audio ? 'audio' : null;

            await handleInboundMessage(phone, message, zaapId, mediaUrl, mediaType);
            return NextResponse.json({ ok: true });
        }

        // ── Fallback: echo outbound ──
        if (body?.fromMe === true && body?.messageId) {
            const whatsappId = body.messageId as string;
            const phone = body?.phone ? normalizePhone(body.phone) : null;
            if (phone) {
                const supabase = createAdminClient();
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
                        .not('zapi_message_id', 'like', '3EB%')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (msg) {
                        await supabase.from('whatsapp_messages').update({ zapi_message_id: whatsappId }).eq('id', msg.id);
                    }
                }
            }
            return NextResponse.json({ ok: true });
        }

        // ── Fallback: inbound sem type ──
        const hasContent = body?.text?.message || body?.caption || body?.image || body?.video || body?.document || body?.audio;
        if (body?.fromMe === false && body?.phone && hasContent) {
            if (body?.isGroup === true) return NextResponse.json({ ok: true });

            const phone = normalizePhone(body.phone);
            const message = body?.text?.message ?? body?.caption ?? null;
            const zaapId = body?.messageId ?? null;
            const mediaUrl = body?.image?.imageUrl ?? body?.video?.videoUrl ?? body?.document?.documentUrl ?? body?.audio?.audioUrl ?? null;
            const mediaType = body?.image ? 'image' : body?.video ? 'video' : body?.document ? 'document' : body?.audio ? 'audio' : null;

            await handleInboundMessage(phone, message, zaapId, mediaUrl, mediaType);
        }

        return NextResponse.json({ ok: true });

    } catch (err) {
        console.error('[WhatsApp webhook error]', err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

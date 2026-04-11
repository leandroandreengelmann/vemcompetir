'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt } from '@/lib/crypto';
import { normalizePhone } from '@/lib/phone';

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado.');
    // Use adminClient to bypass RLS when reading the role
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    if (profile?.role !== 'admin_geral') throw new Error('Sem permissão.');
}

function encryptApiKey(key: string): string {
    try {
        const { encrypted, iv } = encrypt(key);
        return `${iv}:${encrypted}`;
    } catch {
        // ASAAS_ENCRYPTION_KEY not configured — store plain text
        return key;
    }
}

function decryptApiKey(stored: string): string {
    if (!stored) return stored;
    const parts = stored.split(':');
    // Encrypted format: iv:encryptedData:authTag (3 colon-separated parts)
    if (parts.length === 3) {
        try {
            return decrypt(`${parts[1]}:${parts[2]}`, parts[0]);
        } catch {
            // Fall through to return as-is (plain text legacy key)
        }
    }
    return stored;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getWhatsAppConfig() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .maybeSingle();
    return data;
}

export async function saveWhatsAppConfig(instanceId: string, token: string, clientToken: string, webhookUrl?: string, supportPhone?: string, welcomeMessage?: string) {
    await requireAdmin();
    const supabase = await createClient();
    const existing = await getWhatsAppConfig();
    const updateData: any = { instance_id: instanceId, token, client_token: clientToken, updated_at: new Date().toISOString() };
    if (webhookUrl) updateData.webhook_url = webhookUrl;
    if (supportPhone !== undefined) updateData.support_phone = supportPhone;
    if (welcomeMessage !== undefined) updateData.welcome_message = welcomeMessage;

    if (existing) {
        await supabase.from('whatsapp_config').update(updateData).eq('id', existing.id);
    } else {
        await supabase.from('whatsapp_config').insert(updateData);
    }

    const urlToRegister = webhookUrl ?? existing?.webhook_url ?? null;
    if (urlToRegister) {
        await registerZapiWebhooks(instanceId, token, clientToken, urlToRegister);
    }
}

async function registerZapiWebhooks(instanceId: string, token: string, clientToken: string, webhookUrl: string) {
    const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    const headers = { 'Content-Type': 'application/json', 'Client-Token': clientToken };
    const body = JSON.stringify({ value: webhookUrl });

    const endpoints = [
        'update-webhook-received',
        'update-webhook-received-delivery',
        'update-webhook-message-status',
        'update-webhook-chat-presence',
        'update-webhook-connected',
        'update-webhook-disconnected',
    ];

    const results = await Promise.allSettled(
        endpoints.map(ep => zapiFetch(`${base}/${ep}`, { method: 'PUT', headers, body }))
    );

    console.log('[Z-API webhook registration]', results.map((r, i) => ({
        endpoint: endpoints[i],
        status: r.status,
    })));
}



function zapiHeaders(config: any) {
    return {
        'Content-Type': 'application/json',
        ...(config.client_token ? { 'Client-Token': config.client_token } : {}),
    };
}

async function zapiFetch(url: string, init: RequestInit, timeoutMs = 10_000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

export async function checkConnectionStatus() {
    const config = await getWhatsAppConfig();
    if (!config) throw new Error('Sem configuração');

    const res = await zapiFetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/status`,
        { cache: 'no-store', headers: zapiHeaders(config) }
    );
    const json = await res.json();

    console.log('[Z-API status response]', JSON.stringify(json));

    // Z-API pode retornar em formatos diferentes dependendo da versão
    const connected =
        json?.connected === true ||
        json?.value?.accountStatus?.substatus === 'CONNECTED' ||
        json?.status === 'CONNECTED' ||
        json?.accountStatus?.substatus === 'CONNECTED' ||
        json?.substatus === 'CONNECTED';

    const phone =
        json?.smartphoneConnected && json.smartphoneConnected !== true
            ? json.smartphoneConnected
            : json?.phone ?? json?.value?.phone ?? null;

    const supabase = await createClient();
    await supabase
        .from('whatsapp_config')
        .update({ connected, phone_number: phone, connected_at: connected ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
        .eq('id', config.id);

    return { connected, phone };
}

// ─── Conversas ───────────────────────────────────────────────────────────────

export async function getConversations(status?: string) {
    const supabase = await createClient();
    let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
    if (status && status !== 'todas') {
        query = query.eq('status', status);
    }
    const { data } = await query;
    return data ?? [];
}

export async function getMessages(conversationId: string, limit = 50, before?: string) {
    const supabase = await createClient();
    let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (before) {
        query = query.lt('created_at', before);
    }

    const { data } = await query;
    // Retorna em ordem cronológica (mais antiga primeiro)
    return (data ?? []).reverse();
}

export async function sendMessage(conversationId: string, body: string) {
    await requireAdmin();
    const supabase = await createClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('phone')
        .eq('id', conversationId)
        .single();
    if (!conv) throw new Error('Conversa não encontrada');

    const phone = normalizePhone(conv.phone);

    const res = await zapiFetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
        {
            method: 'POST',
            headers: zapiHeaders(config),
            body: JSON.stringify({ phone, message: body, delayMessage: 3 }),
        }
    );
    const json = await res.json();
    console.log('[Z-API send response]', res.status, JSON.stringify(json));
    if (!res.ok) throw new Error(`Falha ao enviar: ${JSON.stringify(json)}`);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        zapi_message_id: json?.messageId ?? json?.zaapId ?? null,
        direction: 'outbound',
        body,
        status: 'sent',
        sent_by: user?.id ?? null,
    });

    await supabase.from('whatsapp_conversations').update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        last_message_direction: 'outbound',
        last_message_status: 'sent',
        updated_at: new Date().toISOString(),
    }).eq('id', conversationId);

    return { success: true };
}

export async function markAsRead(conversationId: string) {
    const supabase = await createClient();
    await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
}

export async function updateConversationStatus(conversationId: string, status: 'aberta' | 'resolvida' | 'arquivada') {
    await requireAdmin();
    const supabase = await createClient();
    await supabase
        .from('whatsapp_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
}

export async function ensureConversation(phone: string, contactName?: string, athleteId?: string): Promise<string> {
    const supabase = await createClient();
    const clean = normalizePhone(phone);

    const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('phone', clean)
        .maybeSingle();

    if (existing) return existing.id;

    const { data: newConv } = await supabase
        .from('whatsapp_conversations')
        .insert({
            phone: clean,
            contact_name: contactName ?? null,
            contact_type: athleteId ? 'atleta' : 'desconhecido',
            linked_id: athleteId ?? null,
            status: 'aberta',
        })
        .select('id')
        .single();

    return newConv!.id;
}

export async function sendMessageToPhone(phone: string, body: string) {
    const supabase = await createClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    const cleanPhone = normalizePhone(phone);

    // Garante que a conversa existe
    let { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

    if (!conv) {
        const { data: newConv } = await supabase
            .from('whatsapp_conversations')
            .insert({ phone: cleanPhone, status: 'aberta' })
            .select('id')
            .single();
        conv = newConv;
    }

    return sendMessage(conv!.id, body);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getTemplates() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('category')
        .order('name');
    return data ?? [];
}

export async function saveTemplate(id: string | null, name: string, category: string, body: string) {
    await requireAdmin();
    const supabase = await createClient();
    if (id) {
        await supabase.from('whatsapp_templates').update({ name, category, body, updated_at: new Date().toISOString() }).eq('id', id);
    } else {
        await supabase.from('whatsapp_templates').insert({ name, category, body });
    }
}

export async function deleteTemplate(id: string) {
    await requireAdmin();
    const supabase = await createClient();
    await supabase.from('whatsapp_templates').delete().eq('id', id);
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export async function getBroadcasts() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('whatsapp_broadcasts')
        .select('*, whatsapp_templates(name)')
        .order('created_at', { ascending: false });
    return data ?? [];
}

export interface BroadcastFilters {
    audience: 'todos' | 'carrinho' | 'aguardando' | 'menor' | 'faixa' | 'academia';
    beltColor?: string;
    tenantId?: string;
}

export async function getTenantsForFilter() {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('tenants')
        .select('id, name')
        .order('name');
    return data ?? [];
}

function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    return age;
}

export async function previewBroadcast(filters: BroadcastFilters): Promise<{
    total: number;
    athletes: { id: string; full_name: string; phone: string; event_title?: string; category?: string; price?: number }[];
}> {
    const adminClient = createAdminClient();

    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, phone, belt_color, birth_date, tenant_id')
        .eq('role', 'atleta')
        .not('phone', 'is', null);

    if (!profiles?.length) return { total: 0, athletes: [] };

    const { data: registrations } = await adminClient
        .from('event_registrations')
        .select('id, athlete_id, status, event_id, events(title), category_id, category_rows(categoria_completa), price');

    const regMap = new Map<string, any[]>();
    for (const r of registrations ?? []) {
        const list = regMap.get(r.athlete_id) ?? [];
        list.push(r);
        regMap.set(r.athlete_id, list);
    }

    let filtered = profiles.filter(p => p.phone && p.phone.replace(/\D/g, '').length >= 10);

    if (filters.audience === 'carrinho') {
        filtered = filtered.filter(p => (regMap.get(p.id) ?? []).some((r: any) => r.status === 'carrinho'));
    } else if (filters.audience === 'aguardando') {
        filtered = filtered.filter(p => (regMap.get(p.id) ?? []).some((r: any) => ['aguardando_pagamento', 'pendente'].includes(r.status)));
    } else if (filters.audience === 'menor') {
        filtered = filtered.filter(p => { const age = calcAge(p.birth_date); return age !== null && age < 18; });
    } else if (filters.audience === 'faixa' && filters.beltColor) {
        filtered = filtered.filter(p => (p.belt_color ?? '').toLowerCase() === filters.beltColor!.toLowerCase());
    } else if (filters.audience === 'academia' && filters.tenantId) {
        filtered = filtered.filter(p => p.tenant_id === filters.tenantId);
    }

    // Exclui contatos que pediram opt-out
    const { data: optedOut } = await adminClient
        .from('whatsapp_conversations')
        .select('phone')
        .eq('opted_out', true);
    const optedOutPhones = new Set((optedOut ?? []).map((c: any) => c.phone));

    const athletes = filtered
        .filter(p => !optedOutPhones.has(normalizePhone(p.phone)))
        .map(p => {
            const regs = regMap.get(p.id) ?? [];
            const relevant = regs.find((r: any) =>
                filters.audience === 'carrinho' ? r.status === 'carrinho' :
                filters.audience === 'aguardando' ? ['aguardando_pagamento', 'pendente'].includes(r.status) :
                true
            ) ?? regs[0];
            return {
                id: p.id,
                full_name: p.full_name,
                phone: p.phone.replace(/\D/g, ''),
                event_title: (relevant?.events as any)?.title ?? undefined,
                category: (relevant?.category_rows as any)?.categoria_completa ?? undefined,
                price: relevant?.price ?? undefined,
            };
        });

    return { total: athletes.length, athletes };
}

function applyVars(template: string, vars: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function executeBroadcast(
    templateId: string | null,
    body: string,
    filters: BroadcastFilters,
    athletes: { id: string; full_name: string; phone: string; event_title?: string; category?: string; price?: number }[]
): Promise<{ sent: number; failed: number; broadcastId: string }> {
    await requireAdmin();
    const supabase = await createClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    const { data: { user } } = await supabase.auth.getUser();

    const { data: broadcast } = await supabase
        .from('whatsapp_broadcasts')
        .insert({
            template_id: templateId,
            body,
            filters,
            total: athletes.length,
            sent: 0,
            failed: 0,
            status: 'enviando',
            created_by: user?.id ?? null,
        })
        .select('id')
        .single();

    let sent = 0;
    let failed = 0;
    let delay = 300;
    let consecutiveErrors = 0;

    for (const athlete of athletes) {
        const message = applyVars(body, {
            nome: athlete.full_name,
            evento: athlete.event_title ?? '',
            categoria: athlete.category ?? '',
            valor: athlete.price ? `R$ ${athlete.price.toFixed(2)}` : '',
            link: 'https://competir.com',
        });

        const normalizedPhone = normalizePhone(athlete.phone);
        try {
            const res = await zapiFetch(
                `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
                {
                    method: 'POST',
                    headers: zapiHeaders(config),
                    body: JSON.stringify({ phone: normalizedPhone, message, delayMessage: 3 }),
                }
            );

            if (res.ok) {
                sent++;
                consecutiveErrors = 0;
                delay = 300; // Reset ao delay base após sucesso

                // Garante conversa e salva mensagem
                let { data: conv } = await supabase
                    .from('whatsapp_conversations')
                    .select('id')
                    .eq('phone', normalizedPhone)
                    .maybeSingle();

                if (!conv) {
                    const { data: newConv } = await supabase
                        .from('whatsapp_conversations')
                        .insert({ phone: normalizedPhone, contact_name: athlete.full_name, contact_type: 'atleta', linked_id: athlete.id, status: 'aberta', last_message: message, last_message_at: new Date().toISOString() })
                        .select('id').single();
                    conv = newConv;
                } else {
                    await supabase.from('whatsapp_conversations').update({ last_message: message, last_message_at: new Date().toISOString() }).eq('id', conv.id);
                }

                if (conv) {
                    await supabase.from('whatsapp_messages').insert({
                        conversation_id: conv.id,
                        direction: 'outbound',
                        body: message,
                        status: 'sent',
                        sent_by: user?.id ?? null,
                    });
                }
            } else {
                failed++;
                consecutiveErrors++;
                // Backoff exponencial: 600ms, 1.2s, 2.4s, até 10s máximo
                delay = Math.min(300 * Math.pow(2, consecutiveErrors), 10_000);
            }
        } catch {
            failed++;
            consecutiveErrors++;
            delay = Math.min(300 * Math.pow(2, consecutiveErrors), 10_000);
        }

        await new Promise(r => setTimeout(r, delay));
    }

    await supabase.from('whatsapp_broadcasts').update({
        sent,
        failed,
        status: 'concluido',
        finished_at: new Date().toISOString(),
    }).eq('id', broadcast!.id);

    return { sent, failed, broadcastId: broadcast!.id };
}

// ─── IA Config ───────────────────────────────────────────────────────────────

export async function getAIConfig() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('ai_config')
        .select('*')
        .limit(1)
        .maybeSingle();
    return data;
}

export async function saveAIConfig(
    openaiApiKey: string,
    adminPhone: string,
    model: string,
    enabled: boolean,
    systemPrompt: string,
) {
    await requireAdmin();
    const supabase = await createClient();
    const existing = await getAIConfig();
    const payload: any = { admin_phone: adminPhone, model, enabled, system_prompt: systemPrompt, updated_at: new Date().toISOString() };
    // '__keep__' significa que o usuário não alterou a chave — mantém a existente
    if (openaiApiKey !== '__keep__') payload.openai_api_key = encryptApiKey(openaiApiKey);
    if (existing) {
        await supabase.from('ai_config').update(payload).eq('id', existing.id);
    } else {
        payload.openai_api_key = openaiApiKey !== '__keep__' ? encryptApiKey(openaiApiKey) : '';
        await supabase.from('ai_config').insert(payload);
    }
}

export async function sendMediaMessage(conversationId: string, fileBase64: string, fileName: string, mimeType: string) {
    await requireAdmin();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('phone')
        .eq('id', conversationId)
        .single();
    if (!conv) throw new Error('Conversa não encontrada');

    const phone = normalizePhone(conv.phone);

    // Upload para Supabase Storage
    const ext = fileName.split('.').pop() ?? 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(fileBase64, 'base64');
    const { error: uploadError } = await adminSupabase.storage
        .from('whatsapp-media')
        .upload(path, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

    const { data: urlData } = adminSupabase.storage.from('whatsapp-media').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const headers = { 'Content-Type': 'application/json', ...(config.client_token ? { 'Client-Token': config.client_token } : {}) };
    const base = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}`;

    let endpoint = `send-document/${ext}`;
    let body: any = { phone, document: publicUrl, fileName, delayMessage: 3 };

    if (mimeType.startsWith('image/')) {
        endpoint = 'send-image';
        body = { phone, image: publicUrl, caption: fileName, delayMessage: 3 };
    } else if (mimeType.startsWith('audio/') || mimeType === 'application/ogg') {
        endpoint = 'send-audio';
        body = { phone, audio: publicUrl, delayMessage: 3 };
    } else if (mimeType.startsWith('video/')) {
        endpoint = 'send-video';
        body = { phone, video: publicUrl, caption: fileName, delayMessage: 3 };
    }

    const res = await zapiFetch(`${base}/${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(`Falha ao enviar mídia: ${JSON.stringify(json)}`);

    const { data: { user } } = await supabase.auth.getUser();
    const mediaType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : mimeType.startsWith('video/') ? 'video' : 'document';

    await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        zapi_message_id: json?.messageId ?? json?.zaapId ?? null,
        direction: 'outbound',
        body: mediaType === 'image' || mediaType === 'video' ? fileName : null,
        media_url: publicUrl,
        media_type: mediaType,
        status: 'sent',
        sent_by: user?.id ?? null,
    });

    await supabase.from('whatsapp_conversations').update({
        last_message: `📎 ${fileName}`,
        last_message_at: new Date().toISOString(),
        last_message_direction: 'outbound',
        last_message_status: 'sent',
        updated_at: new Date().toISOString(),
    }).eq('id', conversationId);

    return { success: true };
}

// ─── Notificações de inscrição ───────────────────────────────────────────────

export async function getPendingRegistrationNotifications() {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('event_registrations')
        .select('id, athlete_id, status, price, created_at, whatsapp_notified_at, events(id, title, tenant_id), category_rows(categoria_completa), profiles!athlete_id(full_name, phone)')
        .in('status', ['pago', 'confirmado', 'isento'])
        .is('whatsapp_notified_at', null)
        .order('created_at', { ascending: false });

    if (!data?.length) return [];

    // Busca telefone dos organizadores por tenant_id
    const tenantIds = [...new Set(data.map((r: any) => r.events?.tenant_id).filter(Boolean))];
    const { data: organizers } = await adminClient
        .from('profiles')
        .select('tenant_id, full_name, phone')
        .in('tenant_id', tenantIds)
        .eq('role', 'academia/equipe');

    const organizerMap = new Map((organizers ?? []).map((o: any) => [o.tenant_id, o]));

    return data
        .map((r: any) => {
            const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return { ...r, profiles: profile, organizer: organizerMap.get(r.events?.tenant_id) ?? null };
        })
        .filter((r: any) => r.profiles?.phone);
}



async function upsertConversation(supabase: any, phone: string, name: string | null, linkedId: string | null, contactType: string, message: string) {
    const { data: existing } = await supabase.from('whatsapp_conversations').select('id').eq('phone', phone).maybeSingle();
    if (existing) {
        await supabase.from('whatsapp_conversations').update({ last_message: message, last_message_at: new Date().toISOString(), last_message_direction: 'outbound', last_message_status: 'sent', updated_at: new Date().toISOString() }).eq('id', existing.id);
        return existing.id;
    }
    const { data: newConv } = await supabase.from('whatsapp_conversations').insert({ phone, contact_name: name, contact_type: contactType, linked_id: linkedId, status: 'aberta', last_message: message, last_message_at: new Date().toISOString(), last_message_direction: 'outbound', last_message_status: 'sent' }).select('id').single();
    return newConv?.id;
}

export async function sendRegistrationNotification(registrationId: string, athleteMessage: string, organizerMessage?: string) {
    await requireAdmin();
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    // Atomic mark to prevent duplicate sends from concurrent calls
    const { data: claimed } = await adminClient
        .from('event_registrations')
        .update({ whatsapp_notified_at: new Date().toISOString() })
        .eq('id', registrationId)
        .is('whatsapp_notified_at', null)
        .select('id')
        .maybeSingle();
    if (!claimed) return { success: true }; // already notified

    const { data: reg } = await adminClient
        .from('event_registrations')
        .select('id, athlete_id, profiles!athlete_id(full_name, phone), events(id, title, tenant_id), category_rows(categoria_completa)')
        .eq('id', registrationId)
        .single();
    const profile = Array.isArray(reg?.profiles) ? reg.profiles[0] : reg?.profiles as any;
    if (!profile?.phone) throw new Error('Atleta sem telefone cadastrado');

    const athletePhone = normalizePhone(profile.phone);

    // ── Envia para o atleta ──
    const athleteRes = await zapiFetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
        { method: 'POST', headers: zapiHeaders(config), body: JSON.stringify({ phone: athletePhone, message: athleteMessage, delayMessage: 3 }) }
    );
    if (!athleteRes.ok) { const json = await athleteRes.json(); throw new Error(`Falha ao enviar: ${JSON.stringify(json)}`); }
    const convId = await upsertConversation(adminClient, athletePhone, profile.full_name, reg!.athlete_id, 'atleta', athleteMessage);
    if (convId) await adminClient.from('whatsapp_messages').insert({ conversation_id: convId, direction: 'outbound', body: athleteMessage, status: 'sent' });

    // ── Envia para o organizador (se tiver mensagem e telefone) ──
    if (organizerMessage) {
        const tenantId = (reg!.events as any)?.tenant_id;
        if (tenantId) {
            const { data: organizer } = await adminClient.from('profiles').select('full_name, phone, id').eq('tenant_id', tenantId).eq('role', 'academia/equipe').maybeSingle();
            if (organizer?.phone) {
                const orgPhone = normalizePhone(organizer.phone);
                const orgRes = await zapiFetch(
                    `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
                    { method: 'POST', headers: zapiHeaders(config), body: JSON.stringify({ phone: orgPhone, message: organizerMessage, delayMessage: 3 }) }
                );
                if (!orgRes.ok) { const json = await orgRes.json(); throw new Error(`Falha ao enviar para organizador: ${JSON.stringify(json)}`); }
                const orgConvId = await upsertConversation(adminClient, orgPhone, organizer.full_name, organizer.id, 'academia', organizerMessage);
                if (orgConvId) await adminClient.from('whatsapp_messages').insert({ conversation_id: orgConvId, direction: 'outbound', body: organizerMessage, status: 'sent' });
            }
        }
    }

    return { success: true };
}

// ─── Boas-vindas ─────────────────────────────────────────────────────────────

export async function sendWelcomeWhatsApp(phone: string, name: string): Promise<void> {
    const adminClient = createAdminClient();

    const [{ data: config }, { data: aiConfig }] = await Promise.all([
        adminClient.from('whatsapp_config').select('*').limit(1).maybeSingle(),
        adminClient.from('ai_config').select('welcome_message').limit(1).maybeSingle(),
    ]);

    const welcomeMsg = (config as any)?.welcome_message;
    if (!config?.connected || !welcomeMsg) return;

    const cleanPhone = normalizePhone(phone);
    const message = welcomeMsg.replace(/\{nome\}/g, name.split(' ')[0]);

    const res = await zapiFetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
        { method: 'POST', headers: zapiHeaders(config), body: JSON.stringify({ phone: cleanPhone, message, delayMessage: 3 }) }
    );
    if (!res.ok) return;

    // Cria conversa com tag boas-vindas
    const { data: existing } = await adminClient.from('whatsapp_conversations').select('id').eq('phone', cleanPhone).maybeSingle();
    if (existing) {
        await adminClient.from('whatsapp_conversations').update({
            tag: 'boas-vindas',
            last_message: message,
            last_message_at: new Date().toISOString(),
            last_message_direction: 'outbound',
            last_message_status: 'sent',
            updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        await adminClient.from('whatsapp_messages').insert({ conversation_id: existing.id, direction: 'outbound', body: message, status: 'sent' });
    } else {
        const { data: newConv } = await adminClient.from('whatsapp_conversations').insert({
            phone: cleanPhone,
            contact_name: name,
            contact_type: 'atleta',
            tag: 'boas-vindas',
            status: 'aberta',
            handler_mode: 'ai',
            last_message: message,
            last_message_at: new Date().toISOString(),
            last_message_direction: 'outbound',
            last_message_status: 'sent',
        }).select('id').single();
        if (newConv) await adminClient.from('whatsapp_messages').insert({ conversation_id: newConv.id, direction: 'outbound', body: message, status: 'sent' });
    }
}

export async function improveMessage(text: string): Promise<string> {
    await requireAdmin();
    const aiConfig = await getAIConfig();
    if (!aiConfig?.openai_api_key) throw new Error('IA não configurada.');

    const apiKey = decryptApiKey(aiConfig.openai_api_key);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: aiConfig.model ?? 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente de escrita. Reescreva a mensagem corrigindo erros de português, melhorando clareza e tom profissional mas amigável. Mantenha o mesmo sentido original. Retorne APENAS o texto reescrito, sem explicações, sem aspas, sem prefixos.',
                },
                { role: 'user', content: text },
            ],
            max_tokens: 400,
            temperature: 0.4,
        }),
    });

    const json = await res.json();
    const improved = json?.choices?.[0]?.message?.content?.trim();
    if (!improved) throw new Error('IA não retornou resposta.');
    return improved;
}

export async function setConversationHandlerMode(conversationId: string, mode: 'ai' | 'human') {
    await requireAdmin();
    const supabase = await createClient();
    await supabase.from('whatsapp_conversations').update({ handler_mode: mode, updated_at: new Date().toISOString() }).eq('id', conversationId);
}

// ─── Deletar mensagem ─────────────────────────────────────────────────────────

export async function deleteMessage(messageId: string) {
    await requireAdmin();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: msg } = await adminClient
        .from('whatsapp_messages')
        .select('id, zapi_message_id, direction, conversation_id')
        .eq('id', messageId)
        .single();
    if (!msg) throw new Error('Mensagem não encontrada');

    // Tenta deletar no WhatsApp via Z-API (apenas mensagens outbound com ID)
    if (msg.direction === 'outbound' && msg.zapi_message_id) {
        const config = await getWhatsAppConfig();
        if (config?.connected) {
            const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('phone')
                .eq('id', msg.conversation_id)
                .single();
            if (conv) {
                const phone = normalizePhone(conv.phone);
                try {
                    const params = new URLSearchParams({ messageId: msg.zapi_message_id, phone, owner: 'true' });
                    const delRes = await zapiFetch(
                        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/messages?${params}`,
                        { method: 'DELETE', headers: zapiHeaders(config) }
                    );
                    const delJson = await delRes.json().catch(() => null);
                    console.log('[Z-API delete message]', delRes.status, JSON.stringify(delJson));
                } catch (err) {
                    console.error('[Z-API delete message error]', err);
                    // Falha silenciosa — prossegue com a exclusão local
                }
            }
        }
    }

    // Deleta do banco (adminClient para bypassar RLS)
    const { error: deleteError } = await adminClient.from('whatsapp_messages').delete().eq('id', messageId);
    if (deleteError) throw new Error('Erro ao deletar mensagem.');

    // Atualiza last_message da conversa com a mensagem anterior
    const { data: lastMsg } = await adminClient
        .from('whatsapp_messages')
        .select('body, created_at, direction, media_type')
        .eq('conversation_id', msg.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    await adminClient.from('whatsapp_conversations').update({
        last_message: lastMsg?.body ?? null,
        last_message_at: lastMsg?.created_at ?? null,
        last_message_direction: lastMsg?.direction ?? null,
        updated_at: new Date().toISOString(),
    }).eq('id', msg.conversation_id);

    return { success: true };
}

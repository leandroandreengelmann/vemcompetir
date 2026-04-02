'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function saveWhatsAppConfig(instanceId: string, token: string, clientToken: string) {
    const supabase = await createClient();
    const existing = await getWhatsAppConfig();
    if (existing) {
        await supabase
            .from('whatsapp_config')
            .update({ instance_id: instanceId, token, client_token: clientToken, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('whatsapp_config')
            .insert({ instance_id: instanceId, token, client_token: clientToken });
    }
}

function formatPhoneForZapi(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Já tem código do país (55 + DDD + número = 12 ou 13 dígitos)
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    // Adiciona 55
    return `55${digits}`;
}

function zapiHeaders(config: any) {
    return {
        'Content-Type': 'application/json',
        ...(config.client_token ? { 'Client-Token': config.client_token } : {}),
    };
}

export async function checkConnectionStatus() {
    const config = await getWhatsAppConfig();
    if (!config) throw new Error('Sem configuração');

    const res = await fetch(
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

    return { connected, phone, _raw: json };
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

export async function getMessages(conversationId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    return data ?? [];
}

export async function sendMessage(conversationId: string, body: string) {
    const supabase = await createClient();
    const config = await getWhatsAppConfig();
    if (!config?.connected) throw new Error('WhatsApp desconectado');

    const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('phone')
        .eq('id', conversationId)
        .single();
    if (!conv) throw new Error('Conversa não encontrada');

    const phone = formatPhoneForZapi(conv.phone);

    const res = await fetch(
        `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
        {
            method: 'POST',
            headers: zapiHeaders(config),
            body: JSON.stringify({ phone, message: body }),
        }
    );
    const json = await res.json();
    console.log('[Z-API send response]', res.status, JSON.stringify(json));
    if (!res.ok) throw new Error(`Falha ao enviar: ${JSON.stringify(json)}`);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        zapi_message_id: json?.zaapId ?? null,
        direction: 'outbound',
        body,
        status: 'sent',
        sent_by: user?.id ?? null,
    });

    await supabase.from('whatsapp_conversations').update({
        last_message: body,
        last_message_at: new Date().toISOString(),
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
    const supabase = await createClient();
    await supabase
        .from('whatsapp_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
}

export async function ensureConversation(phone: string, contactName?: string, athleteId?: string): Promise<string> {
    const supabase = await createClient();
    const clean = phone.replace(/\D/g, '');

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

    const cleanPhone = phone.replace(/\D/g, '');

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
    const supabase = await createClient();
    if (id) {
        await supabase.from('whatsapp_templates').update({ name, category, body, updated_at: new Date().toISOString() }).eq('id', id);
    } else {
        await supabase.from('whatsapp_templates').insert({ name, category, body });
    }
}

export async function deleteTemplate(id: string) {
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

    const athletes = filtered.map(p => {
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

    for (const athlete of athletes) {
        const message = applyVars(body, {
            nome: athlete.full_name,
            evento: athlete.event_title ?? '',
            categoria: athlete.category ?? '',
            valor: athlete.price ? `R$ ${athlete.price.toFixed(2)}` : '',
            link: 'https://competir.com',
        });

        try {
            const res = await fetch(
                `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
                {
                    method: 'POST',
                    headers: zapiHeaders(config),
                    body: JSON.stringify({ phone: formatPhoneForZapi(athlete.phone), message }),
                }
            );

            if (res.ok) {
                sent++;
                // Garante conversa e salva mensagem
                let { data: conv } = await supabase
                    .from('whatsapp_conversations')
                    .select('id')
                    .eq('phone', athlete.phone)
                    .maybeSingle();

                if (!conv) {
                    const { data: newConv } = await supabase
                        .from('whatsapp_conversations')
                        .insert({ phone: athlete.phone, contact_name: athlete.full_name, contact_type: 'atleta', linked_id: athlete.id, status: 'aberta', last_message: message, last_message_at: new Date().toISOString() })
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
            }
        } catch {
            failed++;
        }

        // Pequena pausa para não sobrecarregar a Z-API
        await new Promise(r => setTimeout(r, 300));
    }

    await supabase.from('whatsapp_broadcasts').update({
        sent,
        failed,
        status: 'concluido',
        finished_at: new Date().toISOString(),
    }).eq('id', broadcast!.id);

    return { sent, failed, broadcastId: broadcast!.id };
}

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { dispatchNotification, normalizeBrPhone, testEvolutionConnection } from '@/lib/evolution';

export async function getEvolutionConfig() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data } = await admin.from('evolution_config').select('*').limit(1).maybeSingle();
    return data;
}

export async function updateEvolutionConfigAction(formData: FormData) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const base_url = (formData.get('base_url') as string ?? '').trim();
    const api_key = (formData.get('api_key') as string ?? '').trim();
    const instance_name = (formData.get('instance_name') as string ?? '').trim();
    const sender_phone_raw = (formData.get('sender_phone') as string ?? '').trim();
    const admin_notify_phone_raw = (formData.get('admin_notify_phone') as string ?? '').trim();
    const dry_run = formData.get('dry_run') === 'on';
    const rate_limit_per_hour = Number(formData.get('rate_limit_per_hour') ?? 30);

    const adminPhone = normalizeBrPhone(admin_notify_phone_raw);
    if (!adminPhone) {
        return { error: 'Número admin inválido. Use formato BR (ex: 6699999999 ou 5566999999).' };
    }

    const senderPhone = sender_phone_raw ? normalizeBrPhone(sender_phone_raw) : null;
    if (sender_phone_raw && !senderPhone) {
        return { error: 'Número remetente inválido.' };
    }

    const { data: existing } = await admin.from('evolution_config').select('id, api_key').limit(1).maybeSingle();
    if (!existing) return { error: 'Configuração inicial não encontrada.' };

    const update: Record<string, any> = {
        base_url: base_url || null,
        instance_name: instance_name || null,
        sender_phone: senderPhone,
        admin_notify_phone: adminPhone,
        dry_run,
        rate_limit_per_hour: Math.max(1, Math.min(1000, rate_limit_per_hour)),
    };

    if (api_key) update.api_key = api_key;

    const { error } = await admin.from('evolution_config').update(update).eq('id', existing.id);
    if (error) return { error: error.message };

    revalidatePath('/admin/dashboard/notificacoes/config');
    return { success: true };
}

export async function testConnectionAction() {
    await requireRole('admin_geral');
    return await testEvolutionConnection();
}

export async function getInstanceStatusAction(): Promise<{
    state: 'open' | 'connecting' | 'close' | 'unknown';
    ownerJid: string | null;
    profileName: string | null;
    qrBase64: string | null;
    error?: string;
}> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data: cfg } = await admin
        .from('evolution_config')
        .select('base_url, api_key, instance_name')
        .limit(1)
        .maybeSingle();

    if (!cfg?.base_url || !cfg?.api_key || !cfg?.instance_name) {
        return { state: 'unknown', ownerJid: null, profileName: null, qrBase64: null, error: 'Configuração ausente.' };
    }

    try {
        const fetchRes = await fetch(`${cfg.base_url}/instance/fetchInstances?instanceName=${cfg.instance_name}`, {
            headers: { apikey: cfg.api_key },
            cache: 'no-store',
        });
        if (!fetchRes.ok) {
            return { state: 'unknown', ownerJid: null, profileName: null, qrBase64: null, error: `HTTP ${fetchRes.status}` };
        }
        const list = await fetchRes.json();
        const inst = Array.isArray(list) ? list.find((i: any) => i.name === cfg.instance_name) : null;
        const state = (inst?.connectionStatus ?? 'unknown') as 'open' | 'connecting' | 'close' | 'unknown';
        const ownerJid = inst?.ownerJid ?? null;
        const profileName = inst?.profileName ?? null;

        let qrBase64: string | null = null;
        if (state !== 'open') {
            const qrRes = await fetch(`${cfg.base_url}/instance/connect/${cfg.instance_name}`, {
                headers: { apikey: cfg.api_key },
                cache: 'no-store',
            });
            if (qrRes.ok) {
                const qr = await qrRes.json();
                qrBase64 = qr?.base64 ?? qr?.qrcode?.base64 ?? null;
            }
        } else {
            await admin.from('evolution_config').update({ connected: true, last_test_at: new Date().toISOString() }).eq('id', (await admin.from('evolution_config').select('id').limit(1).single()).data!.id);
        }

        return { state, ownerJid, profileName, qrBase64 };
    } catch (err) {
        return {
            state: 'unknown',
            ownerJid: null,
            profileName: null,
            qrBase64: null,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

export async function logoutInstanceAction() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data: cfg } = await admin
        .from('evolution_config')
        .select('base_url, api_key, instance_name')
        .limit(1)
        .maybeSingle();
    if (!cfg?.base_url || !cfg?.api_key || !cfg?.instance_name) {
        return { error: 'Configuração ausente.' };
    }
    try {
        const res = await fetch(`${cfg.base_url}/instance/logout/${cfg.instance_name}`, {
            method: 'DELETE',
            headers: { apikey: cfg.api_key },
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        await admin.from('evolution_config').update({ connected: false }).eq('id', (await admin.from('evolution_config').select('id').limit(1).single()).data!.id);
        return { success: true };
    } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}

export async function sendTestMessageAction(phone: string, text: string) {
    await requireRole('admin_geral');
    const result = await dispatchNotification({
        templateKey: 'welcome',
        recipientPhone: phone,
        recipientRole: 'outro',
        vars: { nome: 'Teste' },
    });

    if (!result.ok) return { error: result.reason };
    return { success: true, status: result.status };
}

export async function listTemplates() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data } = await admin
        .from('notification_templates')
        .select('*')
        .order('key');
    return data ?? [];
}

export async function updateTemplateAction(formData: FormData) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const id = formData.get('id') as string;
    const title = (formData.get('title') as string ?? '').trim();
    const description = (formData.get('description') as string ?? '').trim();
    const body = (formData.get('body') as string ?? '').trim();
    const enabled = formData.get('enabled') === 'on';

    if (!title || !body) return { error: 'Título e corpo são obrigatórios.' };

    const { error } = await admin
        .from('notification_templates')
        .update({ title, description: description || null, body, enabled })
        .eq('id', id);

    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard/notificacoes/templates');
    return { success: true };
}

export async function toggleTemplateAction(id: string, enabled: boolean) {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin.from('notification_templates').update({ enabled }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard/notificacoes/templates');
    return { success: true };
}

export type LogFilters = {
    template?: string;
    status?: string;
    phone?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export async function listLogs(filters: LogFilters = {}) {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
        .from('notification_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (filters.template) query = query.eq('template_key', filters.template);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.phone) {
        const norm = normalizeBrPhone(filters.phone);
        if (norm) query = query.eq('recipient_phone', norm);
    }
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, count } = await query;
    return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

export async function resendLogAction(logId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data: log } = await admin
        .from('notification_logs')
        .select('template_key, recipient_phone, recipient_role, recipient_id, payload, related_entity_type, related_entity_id')
        .eq('id', logId)
        .single();

    if (!log) return { error: 'Log não encontrado.' };

    const result = await dispatchNotification({
        templateKey: log.template_key as any,
        recipientPhone: log.recipient_phone,
        recipientRole: log.recipient_role as any,
        recipientId: log.recipient_id,
        vars: log.payload ?? {},
        relatedEntityType: log.related_entity_type ?? undefined,
        relatedEntityId: log.related_entity_id ?? undefined,
    });

    revalidatePath('/admin/dashboard/notificacoes/historico');
    if (!result.ok) return { error: result.reason };
    return { success: true };
}

import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationKey =
    | 'welcome'
    | 'payment_confirmed'
    | 'organizer_new_registration'
    | 'admin_new_registration'
    | 'event_reminder_d3'
    | 'cart_abandoned';

export type DispatchOptions = {
    templateKey: NotificationKey;
    recipientPhone: string | null | undefined;
    recipientRole?: 'atleta' | 'organizador' | 'admin' | 'outro';
    recipientId?: string | null;
    vars?: Record<string, string | number | null | undefined>;
    relatedEntityType?: string;
    relatedEntityId?: string;
    idempotencyKey?: string;
};

export type DispatchResult =
    | { ok: true; status: 'sent' | 'skipped' | 'queued'; logId?: string; reason?: string }
    | { ok: false; status: 'failed' | 'skipped'; reason: string; logId?: string };

const E164_BR_REGEX = /^55\d{10,11}$/;

export function normalizeBrPhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return null;
    const withCountry = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    return E164_BR_REGEX.test(withCountry) ? withCountry : null;
}

function renderTemplate(body: string, vars: Record<string, any> = {}): string {
    return body.replace(/\{(\w+)\}/g, (_, key) => {
        const v = vars[key];
        if (v === undefined || v === null) return `{${key}}`;
        return String(v);
    });
}

async function checkRateLimit(admin: ReturnType<typeof createAdminClient>, phone: string, limit: number): Promise<boolean> {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_phone', phone)
        .eq('status', 'sent')
        .gte('created_at', since);
    return (count ?? 0) < limit;
}

export async function dispatchNotification(opts: DispatchOptions): Promise<DispatchResult> {
    const admin = createAdminClient();

    const phone = normalizeBrPhone(opts.recipientPhone);
    if (!phone) {
        return { ok: false, status: 'skipped', reason: 'Telefone inválido ou ausente.' };
    }

    if (opts.idempotencyKey) {
        const { data: existing } = await admin
            .from('notification_logs')
            .select('id, status')
            .eq('idempotency_key', opts.idempotencyKey)
            .maybeSingle();
        if (existing && (existing.status === 'sent' || existing.status === 'delivered' || existing.status === 'read')) {
            return { ok: true, status: 'skipped', logId: existing.id, reason: 'Já enviada (idempotency).' };
        }
    }

    const { data: template } = await admin
        .from('notification_templates')
        .select('key, body, enabled')
        .eq('key', opts.templateKey)
        .maybeSingle();

    if (!template) {
        return { ok: false, status: 'failed', reason: `Template '${opts.templateKey}' não encontrado.` };
    }
    if (!template.enabled) {
        return { ok: false, status: 'skipped', reason: 'Template desativado.' };
    }

    const { data: config } = await admin
        .from('evolution_config')
        .select('base_url, api_key, instance_name, dry_run, rate_limit_per_hour')
        .limit(1)
        .maybeSingle();

    if (!config?.base_url || !config?.api_key || !config?.instance_name) {
        return { ok: false, status: 'failed', reason: 'Evolution API não configurada.' };
    }

    const allowed = await checkRateLimit(admin, phone, config.rate_limit_per_hour ?? 30);
    if (!allowed) {
        return { ok: false, status: 'skipped', reason: 'Rate limit por hora atingido.' };
    }

    const rendered = renderTemplate(template.body, opts.vars ?? {});

    const { data: logRow, error: logError } = await admin
        .from('notification_logs')
        .insert({
            template_key: opts.templateKey,
            recipient_phone: phone,
            recipient_role: opts.recipientRole ?? null,
            recipient_id: opts.recipientId ?? null,
            payload: opts.vars ?? {},
            rendered_message: rendered,
            status: 'queued',
            related_entity_type: opts.relatedEntityType ?? null,
            related_entity_id: opts.relatedEntityId ?? null,
            idempotency_key: opts.idempotencyKey ?? null,
        })
        .select('id')
        .single();

    if (logError || !logRow) {
        return { ok: false, status: 'failed', reason: `Erro ao registrar log: ${logError?.message ?? 'unknown'}` };
    }

    if (config.dry_run) {
        await admin
            .from('notification_logs')
            .update({ status: 'skipped', error: 'dry_run habilitado', sent_at: new Date().toISOString() })
            .eq('id', logRow.id);
        return { ok: true, status: 'skipped', logId: logRow.id, reason: 'dry_run' };
    }

    const url = `${config.base_url.replace(/\/$/, '')}/message/sendText/${config.instance_name}`;
    const payload = { number: phone, text: rendered };
    const headers = { 'Content-Type': 'application/json', apikey: config.api_key };

    let messageId: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 10_000);
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(t);

            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                messageId = data?.key?.id ?? data?.messageId ?? null;
                lastError = null;
                break;
            }

            const text = await res.text().catch(() => '');
            lastError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
        } catch (err: any) {
            lastError = err?.name === 'AbortError' ? 'Timeout (10s)' : (err?.message ?? 'Erro desconhecido');
        }
    }

    if (lastError) {
        await admin
            .from('notification_logs')
            .update({ status: 'failed', error: lastError })
            .eq('id', logRow.id);
        return { ok: false, status: 'failed', reason: lastError, logId: logRow.id };
    }

    await admin
        .from('notification_logs')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            evolution_message_id: messageId,
        })
        .eq('id', logRow.id);

    return { ok: true, status: 'sent', logId: logRow.id };
}

export async function testEvolutionConnection(): Promise<{ ok: boolean; message: string }> {
    const admin = createAdminClient();
    const { data: config } = await admin
        .from('evolution_config')
        .select('base_url, api_key, instance_name')
        .limit(1)
        .maybeSingle();

    if (!config?.base_url || !config?.api_key || !config?.instance_name) {
        return { ok: false, message: 'Configuração incompleta.' };
    }

    try {
        const url = `${config.base_url.replace(/\/$/, '')}/instance/connectionState/${config.instance_name}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch(url, { headers: { apikey: config.api_key }, signal: controller.signal });
        clearTimeout(t);

        if (!res.ok) {
            return { ok: false, message: `HTTP ${res.status}` };
        }
        const data = await res.json().catch(() => ({}));
        const state = data?.instance?.state ?? data?.state ?? 'unknown';

        await admin
            .from('evolution_config')
            .update({
                connected: state === 'open',
                last_test_at: new Date().toISOString(),
            })
            .eq('id', (await admin.from('evolution_config').select('id').limit(1).single()).data?.id);

        return { ok: state === 'open', message: `Estado: ${state}` };
    } catch (err: any) {
        const msg = err?.name === 'AbortError' ? 'Timeout (8s)' : (err?.message ?? 'Erro desconhecido');
        return { ok: false, message: msg };
    }
}

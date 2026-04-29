'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNotification, normalizeBrPhone } from '@/lib/evolution';

export async function getGuardianTemplateContentAction(): Promise<string> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('guardian_term_templates')
        .select('content')
        .eq('is_active', true)
        .eq('type', 'self_register')
        .single();
    return data?.content ?? '';
}

export async function sendWelcomeNotificationAction(opts: {
    userId: string;
    name: string;
    phone: string | null;
}): Promise<{ ok: boolean }> {
    if (!opts.phone) return { ok: false };
    const normalized = normalizeBrPhone(opts.phone);
    if (!normalized) return { ok: false };

    await dispatchNotification({
        templateKey: 'welcome',
        recipientPhone: normalized,
        recipientRole: 'atleta',
        recipientId: opts.userId,
        vars: { nome: opts.name },
        idempotencyKey: `welcome:${opts.userId}`,
    });
    return { ok: true };
}


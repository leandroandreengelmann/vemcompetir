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
    // Segurança: esta action é um endpoint público. Não confiamos no telefone
    // enviado pelo cliente — buscamos o telefone do próprio perfil e só enviamos
    // dentro de uma janela curta após o cadastro. Isso, somado à idempotência por
    // userId, impede o uso da action para disparar WhatsApp a números arbitrários.
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('phone, full_name, created_at')
        .eq('id', opts.userId)
        .single();

    if (!profile?.phone) return { ok: false };

    // Janela de onboarding: 10 minutos após a criação do perfil
    if (profile.created_at) {
        const ageMs = Date.now() - new Date(profile.created_at).getTime();
        if (ageMs > 10 * 60 * 1000) return { ok: false };
    }

    const normalized = normalizeBrPhone(profile.phone);
    if (!normalized) return { ok: false };

    await dispatchNotification({
        templateKey: 'welcome',
        recipientPhone: normalized,
        recipientRole: 'atleta',
        recipientId: opts.userId,
        vars: { nome: profile.full_name ?? opts.name },
        idempotencyKey: `welcome:${opts.userId}`,
    });
    return { ok: true };
}


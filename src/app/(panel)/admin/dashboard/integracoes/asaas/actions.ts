'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt, hashToken, generateToken, getLast4 } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

const REVALIDATE_PATH = '/admin/dashboard/integracoes/asaas';

const BASE_URLS: Record<string, string> = {
    sandbox: 'https://api-sandbox.asaas.com',
    production: 'https://api.asaas.com',
};

export type AsaasSettingsView = {
    id: string;
    environment: 'sandbox' | 'production';
    api_key_last4: string | null;
    has_api_key: boolean;
    webhook_token_hash: string;
    is_enabled: boolean;
    last_test_at: string | null;
    last_test_status: string | null;
    last_test_message: string | null;
    base_url: string;
};

export async function getAsaasSettings(environment: 'sandbox' | 'production'): Promise<AsaasSettingsView | null> {
    await requireRole('admin_geral');
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('asaas_settings')
        .select('*')
        .eq('environment', environment)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        environment: data.environment,
        api_key_last4: data.api_key_last4,
        has_api_key: !!data.api_key_encrypted,
        webhook_token_hash: data.webhook_token_hash,
        is_enabled: data.is_enabled,
        last_test_at: data.last_test_at,
        last_test_status: data.last_test_status,
        last_test_message: data.last_test_message,
        base_url: BASE_URLS[data.environment],
    };
}

export async function saveAsaasSettings(data: {
    environment: 'sandbox' | 'production';
    apiKey: string;
    webhookToken?: string;
}) {
    await requireRole('admin_geral');

    if (!data.apiKey || data.apiKey.trim() === '') {
        return { error: 'API Key é obrigatória.' };
    }

    const supabase = createAdminClient();

    const { encrypted, iv } = encrypt(data.apiKey);
    const last4 = getLast4(data.apiKey);

    let tokenHash: string;
    if (data.webhookToken) {
        tokenHash = hashToken(data.webhookToken);
    } else {
        const existing = await supabase
            .from('asaas_settings')
            .select('webhook_token_hash')
            .eq('environment', data.environment)
            .single();

        if (existing.data?.webhook_token_hash) {
            tokenHash = existing.data.webhook_token_hash;
        } else {
            const newToken = generateToken();
            tokenHash = hashToken(newToken);
        }
    }

    // Desativar todos os outros ambientes antes de salvar/ativar o atual
    await supabase
        .from('asaas_settings')
        .update({ is_enabled: false })
        .neq('environment', data.environment);

    const { error } = await supabase
        .from('asaas_settings')
        .upsert(
            {
                environment: data.environment,
                api_key_encrypted: encrypted,
                api_key_iv: iv,
                api_key_last4: last4,
                webhook_token_hash: tokenHash,
                is_enabled: true,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'environment' }
        );

    if (error) {
        console.error('Error saving Asaas settings:', error);
        return { error: 'Erro ao salvar configurações.' };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, message: 'Configurações salvas com sucesso!' };
}

export async function testAsaasConnection(environment: 'sandbox' | 'production') {
    await requireRole('admin_geral');
    const supabase = createAdminClient();

    const { data: settings, error: fetchError } = await supabase
        .from('asaas_settings')
        .select('api_key_encrypted, api_key_iv')
        .eq('environment', environment)
        .single();

    if (fetchError || !settings) {
        return { error: 'Nenhuma configuração encontrada para este ambiente.' };
    }

    try {
        const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
        const baseUrl = BASE_URLS[environment];

        const response = await fetch(`${baseUrl}/v3/myAccount/accountNumber`, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                access_token: apiKey,
            },
        });

        const now = new Date().toISOString();

        if (response.ok) {
            await supabase
                .from('asaas_settings')
                .update({
                    last_test_at: now,
                    last_test_status: 'ok',
                    last_test_message: 'Conexão realizada com sucesso.',
                    updated_at: now,
                })
                .eq('environment', environment);

            revalidatePath(REVALIDATE_PATH);
            return { success: true, message: 'Conexão realizada com sucesso!' };
        } else {
            const body = await response.json().catch(() => ({}));
            const errorMessage = body?.errors?.[0]?.description || `Erro HTTP ${response.status}`;

            await supabase
                .from('asaas_settings')
                .update({
                    last_test_at: now,
                    last_test_status: 'error',
                    last_test_message: errorMessage,
                    updated_at: now,
                })
                .eq('environment', environment);

            revalidatePath(REVALIDATE_PATH);
            return { error: errorMessage };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido ao testar conexão.';
        console.error('Asaas connection test error:', message);

        await supabase
            .from('asaas_settings')
            .update({
                last_test_at: new Date().toISOString(),
                last_test_status: 'error',
                last_test_message: 'Falha ao descriptografar ou conectar.',
                updated_at: new Date().toISOString(),
            })
            .eq('environment', environment);

        revalidatePath(REVALIDATE_PATH);
        return { error: 'Falha ao testar conexão. Verifique a API Key.' };
    }
}

export async function generateWebhookTokenAction(environment: 'sandbox' | 'production') {
    await requireRole('admin_geral');
    const supabase = createAdminClient();

    const token = generateToken();
    const hash = hashToken(token);

    const existing = await supabase
        .from('asaas_settings')
        .select('id')
        .eq('environment', environment)
        .single();

    if (!existing.data) {
        return { error: 'Salve a configuração primeiro antes de gerar o token.' };
    }

    const { error } = await supabase
        .from('asaas_settings')
        .update({
            webhook_token_hash: hash,
            updated_at: new Date().toISOString(),
        })
        .eq('environment', environment);

    if (error) {
        console.error('Error generating webhook token:', error);
        return { error: 'Erro ao gerar token.' };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, token, message: 'Token gerado! Copie-o agora. Ele não será mostrado novamente.' };
}

export async function toggleAsaasIntegration(environment: 'sandbox' | 'production', enabled: boolean) {
    await requireRole('admin_geral');
    const supabase = createAdminClient();

    if (enabled) {
        // Desativar todos os outros ambientes antes de ativar o atual
        await supabase
            .from('asaas_settings')
            .update({ is_enabled: false })
            .neq('environment', environment);
    }

    const { error } = await supabase
        .from('asaas_settings')
        .update({
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
        })
        .eq('environment', environment);

    if (error) {
        console.error('Error toggling integration:', error);
        return { error: 'Erro ao alterar status da integração.' };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, message: enabled ? 'Integração ativada.' : 'Integração desativada.' };
}

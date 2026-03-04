import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';

const STATUS_MAP: Record<string, string> = {
    ACTIVE: 'APPROVED',       // Conta completamente aprovada e ativa
    APPROVED: 'APPROVED',
    AWAITING_ACTION_AUTHORIZATION: 'AWAITING_ONBOARDING',
    AWAITING_DOCUMENTS: 'AWAITING_ONBOARDING',
    AWAITING_APPROVAL: 'UNDER_REVIEW',
    DENIED: 'REJECTED',
    REFUSED: 'REJECTED',
    BLOCKED: 'BLOCKED',
};

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 401 });
        }

        const admin = createAdminClient();

        // Get subaccount
        const { data: subaccount } = await admin
            .from('asaas_subaccounts')
            .select('asaas_account_id, updated_at')
            .eq('tenant_id', profile.tenant_id)
            .single();

        if (!subaccount) {
            return NextResponse.json({ error: 'Nenhuma subconta encontrada.' }, { status: 404 });
        }

        // Rate-limit: mínimo de 2 minutos entre cada consulta
        if (subaccount.updated_at) {
            const lastUpdate = new Date(subaccount.updated_at).getTime();
            const secondsElapsed = (Date.now() - lastUpdate) / 1000;
            if (secondsElapsed < 120) {
                const waitSeconds = Math.ceil(120 - secondsElapsed);
                return NextResponse.json(
                    { error: `Aguarde ${waitSeconds}s antes de atualizar novamente.` },
                    { status: 429 }
                );
            }
        }

        // Get Asaas config
        const { data: settings } = await admin
            .from('asaas_settings')
            .select('environment, api_key_encrypted, api_key_iv, is_enabled')
            .eq('is_enabled', true)
            .single();

        if (!settings) {
            return NextResponse.json(
                { error: 'Integração Asaas não configurada.' },
                { status: 400 }
            );
        }

        const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
        const baseUrl = settings.environment === 'production'
            ? 'https://api.asaas.com'
            : 'https://api-sandbox.asaas.com';

        // Query Asaas
        const response = await fetch(`${baseUrl}/v3/accounts/${subaccount.asaas_account_id}`, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                access_token: apiKey,
            },
        });

        if (!response.ok) {
            console.error('Asaas refresh error:', response.status);
            return NextResponse.json(
                { error: 'Erro ao consultar Asaas.' },
                { status: response.status }
            );
        }

        const result = await response.json();
        console.log('[Asaas Refresh] Account data:', JSON.stringify(result));

        // Map Asaas accountStatus to our status
        const asaasStatus = result?.accountStatus?.general as string | undefined;
        let mappedStatus = 'CREATED';

        if (asaasStatus) {
            mappedStatus = STATUS_MAP[asaasStatus] || asaasStatus;

            // Map PENDING from Asaas if not in STATUS_MAP
            if (asaasStatus === 'PENDING') mappedStatus = 'AWAITING_ONBOARDING';
        } else if (result?.accountNumber) {
            // Se a conta tem accountNumber atribuído, é porque está ativa/aprovada
            mappedStatus = 'APPROVED';
        } else if (result?.status) {
            // Fallback if status is inside the root object
            mappedStatus = STATUS_MAP[result.status] || result.status;
        }

        // Update in database
        const now = new Date().toISOString();
        await admin
            .from('asaas_subaccounts')
            .update({
                status: mappedStatus,
                updated_at: now,
            })
            .eq('tenant_id', profile.tenant_id);

        return NextResponse.json({ success: true, status: mappedStatus });
    } catch (err) {
        console.error('Unexpected error refreshing subaccount:', err);
        return NextResponse.json(
            { error: 'Erro interno ao verificar status.' },
            { status: 500 }
        );
    }
}

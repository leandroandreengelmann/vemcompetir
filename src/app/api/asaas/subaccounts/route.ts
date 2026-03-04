import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { z } from 'zod';
import { verifyTenantApi, handleApiError } from '@/lib/api-auth';

const baseSchema = z.object({
    personType: z.enum(['PF', 'PJ']),
    name: z.string().min(3, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido'),
    phone: z.string().optional(),
    mobilePhone: z.string().min(10, 'Celular obrigatório'),
    postalCode: z.string().length(8, 'CEP deve ter 8 dígitos'),
    address: z.string().min(1, 'Endereço obrigatório'),
    addressNumber: z.string().min(1, 'Número obrigatório'),
    complement: z.string().optional(),
    province: z.string().min(1, 'Bairro obrigatório'),
    city: z.string().min(1, 'Cidade obrigatória'),
    state: z.string().length(2, 'UF deve ter 2 letras'),
    birthDate: z.string().optional(),
    companyType: z.string().optional(),
    incomeValue: z.number().positive('Renda/faturamento é obrigatório'),
});

async function getAsaasConfig() {
    const admin = createAdminClient();

    const { data: settings } = await admin
        .from('asaas_settings')
        .select('environment, api_key_encrypted, api_key_iv, is_enabled')
        .eq('is_enabled', true)
        .single();

    if (!settings) {
        return null;
    }

    const apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
    const baseUrl = settings.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    return { apiKey, baseUrl };
}

export async function POST(request: NextRequest) {
    try {
        const { tenantId } = await verifyTenantApi();

        const config = await getAsaasConfig();
        if (!config) {
            return NextResponse.json(
                { error: 'Integração Asaas não configurada. Contate o administrador.' },
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        // Check if tenant already has a subaccount
        const { data: existing } = await admin
            .from('asaas_subaccounts')
            .select('id')
            .eq('tenant_id', tenantId)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Sua academia já possui uma subconta Asaas.' },
                { status: 409 }
            );
        }

        const body = await request.json();
        const parsed = baseSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0];
            return NextResponse.json(
                { error: firstError?.message || 'Dados inválidos.' },
                { status: 422 }
            );
        }

        const data = parsed.data;

        // Validate PF/PJ specific fields
        if (data.personType === 'PF') {
            if (!data.birthDate) {
                return NextResponse.json({ error: 'Data de nascimento obrigatória para PF.' }, { status: 422 });
            }
            if (data.cpfCnpj.length !== 11) {
                return NextResponse.json({ error: 'CPF deve ter 11 dígitos.' }, { status: 422 });
            }
        } else {
            if (!data.companyType) {
                return NextResponse.json({ error: 'Tipo de empresa obrigatório para PJ.' }, { status: 422 });
            }
            if (data.cpfCnpj.length !== 14) {
                return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos.' }, { status: 422 });
            }
        }

        // Build Asaas payload
        const asaasPayload: Record<string, unknown> = {
            name: data.name,
            email: data.email,
            cpfCnpj: data.cpfCnpj,
            mobilePhone: data.mobilePhone,
            address: data.address,
            addressNumber: data.addressNumber,
            province: data.province,
            postalCode: data.postalCode,
            city: data.city,
            state: data.state,
        };

        if (data.phone) asaasPayload.phone = data.phone;
        if (data.complement) asaasPayload.complement = data.complement;
        asaasPayload.incomeValue = data.incomeValue;

        if (data.personType === 'PF') {
            asaasPayload.personType = 'FISICA';
            asaasPayload.birthDate = data.birthDate;
        } else {
            asaasPayload.personType = 'JURIDICA';
            asaasPayload.companyType = data.companyType;
        }

        // Call Asaas API
        const response = await fetch(`${config.baseUrl}/v3/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
                access_token: config.apiKey,
            },
            body: JSON.stringify(asaasPayload),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Asaas create subaccount error:', JSON.stringify(result));
            const errorMsg = result?.errors?.[0]?.description || 'Erro ao criar subconta no Asaas.';
            return NextResponse.json({ error: errorMsg }, { status: response.status });
        }

        const asaasAccountId = result.id;
        const walletId = result.walletId;

        if (!asaasAccountId || !walletId) {
            console.error('Asaas response missing id or walletId:', JSON.stringify(result));
            return NextResponse.json(
                { error: 'Resposta inválida do Asaas. Contate o suporte.' },
                { status: 500 }
            );
        }

        // Save to database
        const { error: insertError } = await admin
            .from('asaas_subaccounts')
            .insert({
                tenant_id: tenantId,
                asaas_account_id: asaasAccountId,
                wallet_id: walletId,
                status: 'CREATED',
                email: data.email,
                cpf_cnpj: data.cpfCnpj,
                income_value: data.incomeValue,
            });

        if (insertError) {
            console.error('Error saving subaccount:', insertError);
            return NextResponse.json(
                { error: 'Subconta criada no Asaas, mas houve erro ao salvar. Contate o suporte.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, status: 'CREATED' });
    } catch (err: any) {
        if (err.name === 'ApiError') return handleApiError(err);

        console.error('Unexpected error creating subaccount:', err);
        return NextResponse.json(
            { error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        );
    }
}

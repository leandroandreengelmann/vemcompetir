'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt, getLast4, generateToken, hashToken } from '@/lib/crypto';

export async function createOrganizerAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;

    // New fields
    const document = formData.get('document') as string;
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip_code = formData.get('address_zip_code') as string;

    if (!email || !password || !full_name) return { error: 'Preencha todos os campos obrigatórios.' };

    const adminClient = createAdminClient();

    // Validar se o nome já existe (case-insensitive)
    const { data: existingEntity } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('full_name', full_name.trim())
        .eq('role', 'academia/equipe')
        .maybeSingle();

    if (existingEntity) {
        return { error: 'Uma academia ou equipe com este nome já está cadastrada.' };
    }

    const { data: { user }, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'academia/equipe',
            full_name,
            document,
            address_street,
            address_number,
            address_city,
            address_state,
            address_zip_code,
        },
        email_confirm: true,
    });

    if (error) {
        return { error: error.message };
    }

    if (user) {
        // Create Tenant
        const slug = full_name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 7);

        const { data: tenant, error: tenantError } = await adminClient
            .from('tenants')
            .insert({
                name: full_name,
                slug: slug,
                owner_id: user.id
            })
            .select()
            .single();

        if (tenantError) {
            console.error("Erro ao criar tenant:", tenantError);
            // Consider rollback or manual cleanup
        }

        await adminClient
            .from('profiles')
            .upsert({
                id: user.id,
                role: 'academia/equipe',
                full_name,
                tenant_id: tenant?.id, // Link profile to the new tenant
                document,
                address_street,
                address_number,
                address_city,
                address_state,
                address_zip_code,
            });
    }

    revalidatePath('/admin/dashboard/equipes-academias');
    return { success: true };
}

export async function updateOrganizerAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const id = formData.get('id') as string;
    const full_name = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // New fields
    const document = formData.get('document') as string;
    const address_street = formData.get('address_street') as string;
    const address_number = formData.get('address_number') as string;
    const address_city = formData.get('address_city') as string;
    const address_state = formData.get('address_state') as string;
    const address_zip_code = formData.get('address_zip_code') as string;

    if (!id || !full_name) return { error: 'ID e Nome são obrigatórios.' };

    const adminClient = createAdminClient();

    // Validar se o novo nome já existe (excluindo a própria academia)
    const { data: existingEntity } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('full_name', full_name.trim())
        .eq('role', 'academia/equipe')
        .neq('id', id)
        .maybeSingle();

    if (existingEntity) {
        return { error: 'O nome desta academia já está em uso por outra entidade.' };
    }

    // 1. Atualizar Auth User (Email, Senha, Metadata)
    const updateData: any = {
        user_metadata: {
            full_name,
            role: 'academia/equipe',
            document,
            address_street,
            address_number,
            address_city,
            address_state,
            address_zip_code,
        }
    };
    if (email) updateData.email = email;
    if (password && password.length >= 6) updateData.password = password;

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, updateData);
    if (authError) return { error: authError.message };

    // 2. Atualizar tabela Profiles
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({
            full_name,
            document,
            address_street,
            address_number,
            address_city,
            address_state,
            address_zip_code,
        })
        .eq('id', id);

    if (profileError) {
        // Log error but don't fail if profile doesn't exist? update should be safe.
        // Se profile não existir, update não faz nada. 
        // Talvez upsert? Mas upsert sem role pode quebrar. Melhor manter update se já existe, ou upsert com role.
        // Vamos usar upsert para garantir que o profile exista e tenha role correto.
        await adminClient
            .from('profiles')
            .upsert({
                id,
                full_name,
                role: 'academia/equipe',
                document,
                address_street,
                address_number,
                address_city,
                address_state,
                address_zip_code,
            });
    }

    // 3. Atualizar configuração Asaas do tenant
    const use_own_asaas_api = formData.get('use_own_asaas_api') === 'true';
    const asaas_api_key = formData.get('asaas_api_key') as string | null;

    const { data: profileForTenant } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (profileForTenant?.tenant_id) {
        const tenantUpdate: Record<string, any> = { use_own_asaas_api };

        if (use_own_asaas_api && asaas_api_key && asaas_api_key.trim().length > 0) {
            const { encrypted, iv } = encrypt(asaas_api_key.trim());
            const last4 = getLast4(asaas_api_key.trim());
            const webhookToken = generateToken();
            const webhookTokenHash = hashToken(webhookToken);

            // Buscar ambiente ativo para registrar webhook no endpoint correto
            const { data: asaasSettings } = await adminClient
                .from('asaas_settings')
                .select('environment')
                .eq('is_enabled', true)
                .single();

            const baseUrl = asaasSettings?.environment === 'production'
                ? 'https://api.asaas.com'
                : 'https://api-sandbox.asaas.com';

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
            await fetch(`${baseUrl}/v3/webhooks`, {
                method: 'POST',
                headers: { 'access_token': asaas_api_key.trim(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `${appUrl}/api/webhooks/asaas`,
                    email: 'noreply@competir.com',
                    interrupted: false,
                    enabled: true,
                    authToken: webhookToken,
                    events: [
                        'PAYMENT_CONFIRMED',
                        'PAYMENT_RECEIVED',
                        'PAYMENT_OVERDUE',
                        'PAYMENT_DELETED',
                        'PAYMENT_REFUNDED',
                    ],
                }),
            });

            tenantUpdate.asaas_api_key_encrypted = encrypted;
            tenantUpdate.asaas_api_key_iv = iv;
            tenantUpdate.asaas_api_key_last4 = last4;
            tenantUpdate.asaas_webhook_token_hash = webhookTokenHash;

        } else if (!use_own_asaas_api) {
            tenantUpdate.asaas_api_key_encrypted = null;
            tenantUpdate.asaas_api_key_iv = null;
            tenantUpdate.asaas_api_key_last4 = null;
            tenantUpdate.asaas_webhook_token_hash = null;
        }

        await adminClient.from('tenants').update(tenantUpdate).eq('id', profileForTenant.tenant_id);
    }

    revalidatePath('/admin/dashboard/equipes-academias');
    revalidatePath(`/admin/dashboard/equipes-academias/${id}`);
    return { success: true };
}

export async function getAsaasWebhookDetailsAction(entidadeId: string) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const adminClient = createAdminClient();

    const { data: profileForTenant } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', entidadeId)
        .single();

    if (!profileForTenant?.tenant_id) return { error: 'Tenant não encontrado.' };

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('asaas_api_key_encrypted, asaas_api_key_iv, use_own_asaas_api')
        .eq('id', profileForTenant.tenant_id)
        .single();

    if (!tenant?.use_own_asaas_api || !tenant.asaas_api_key_encrypted || !tenant.asaas_api_key_iv) {
        return { error: 'Asaas não configurado para esta academia.' };
    }

    let apiKey: string;
    try {
        apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
    } catch {
        return { error: 'Falha ao decifrar a API Key.' };
    }

    const { data: asaasSettings } = await adminClient
        .from('asaas_settings')
        .select('environment')
        .eq('is_enabled', true)
        .single();

    const baseUrl = asaasSettings?.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const webhookEndpoint = `${appUrl}/api/webhooks/asaas`;

    const response = await fetch(`${baseUrl}/v3/webhooks`, {
        headers: { 'access_token': apiKey },
    });

    if (!response.ok) {
        return { error: `Erro ao consultar Asaas: ${response.status}` };
    }

    const data = await response.json();
    const webhooks: any[] = data?.data ?? [];

    const ours = webhooks.filter((w: any) => w.url === webhookEndpoint);
    const others = webhooks.filter((w: any) => w.url !== webhookEndpoint);

    return {
        success: true,
        ours,
        others,
        total: webhooks.length,
        environment: asaasSettings?.environment ?? 'sandbox',
        webhookEndpoint,
    };
}

export async function updateAsaasConfigAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const id = formData.get('id') as string;
    const use_own_asaas_api = formData.get('use_own_asaas_api') === 'true';
    const asaas_api_key = formData.get('asaas_api_key') as string | null;

    if (!id) return { error: 'ID inválido.' };

    const adminClient = createAdminClient();

    const { data: profileForTenant } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (!profileForTenant?.tenant_id) return { error: 'Tenant não encontrado.' };

    const tenantUpdate: Record<string, any> = { use_own_asaas_api };

    if (use_own_asaas_api && asaas_api_key && asaas_api_key.trim().length > 0) {
        const { encrypted, iv } = encrypt(asaas_api_key.trim());
        const last4 = getLast4(asaas_api_key.trim());
        const webhookToken = generateToken();
        const webhookTokenHash = hashToken(webhookToken);

        const { data: asaasSettings } = await adminClient
            .from('asaas_settings')
            .select('environment')
            .eq('is_enabled', true)
            .single();

        const baseUrl = asaasSettings?.environment === 'production'
            ? 'https://api.asaas.com'
            : 'https://api-sandbox.asaas.com';

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        await fetch(`${baseUrl}/v3/webhooks`, {
            method: 'POST',
            headers: { 'access_token': asaas_api_key.trim(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: `${appUrl}/api/webhooks/asaas`,
                email: 'noreply@competir.com',
                interrupted: false,
                enabled: true,
                authToken: webhookToken,
                events: [
                    'PAYMENT_CONFIRMED',
                    'PAYMENT_RECEIVED',
                    'PAYMENT_OVERDUE',
                    'PAYMENT_DELETED',
                    'PAYMENT_REFUNDED',
                ],
            }),
        });

        tenantUpdate.asaas_api_key_encrypted = encrypted;
        tenantUpdate.asaas_api_key_iv = iv;
        tenantUpdate.asaas_api_key_last4 = last4;
        tenantUpdate.asaas_webhook_token_hash = webhookTokenHash;

    } else if (!use_own_asaas_api) {
        tenantUpdate.asaas_api_key_encrypted = null;
        tenantUpdate.asaas_api_key_iv = null;
        tenantUpdate.asaas_api_key_last4 = null;
        tenantUpdate.asaas_webhook_token_hash = null;
    }

    await adminClient.from('tenants').update(tenantUpdate).eq('id', profileForTenant.tenant_id);

    revalidatePath('/admin/dashboard/equipes-academias');
    return { success: true };
}

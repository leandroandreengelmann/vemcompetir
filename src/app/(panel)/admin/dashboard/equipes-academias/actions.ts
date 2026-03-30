'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt, getLast4, generateToken, hashToken } from '@/lib/crypto';
import { grantTokens } from '@/lib/token-utils';

// ---------------------------------------------------------------------------
// Helper compartilhado: valida, criptografa e registra webhook da chave Asaas
// Retorna os campos prontos para gravar no tenant, ou um erro descritivo.
// ---------------------------------------------------------------------------
async function buildOrganizerAsaasUpdate(
    adminClient: ReturnType<typeof createAdminClient>,
    apiKey: string,
): Promise<
    | { fields: Record<string, unknown>; webhookWarning?: string }
    | { error: string }
> {
    const { data: asaasSettings } = await adminClient
        .from('asaas_settings')
        .select('environment')
        .eq('is_enabled', true)
        .single();

    const baseUrl = asaasSettings?.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    // 1. Valida a chave antes de qualquer gravação
    try {
        const validateRes = await fetch(`${baseUrl}/v3/myAccount`, {
            headers: { 'access_token': apiKey },
        });
        if (!validateRes.ok) {
            return { error: 'Chave de API inválida. Verifique a chave e tente novamente.' };
        }
    } catch {
        return { error: 'Não foi possível validar a chave. Verifique sua conexão e tente novamente.' };
    }

    // 2. Prepara campos criptografados
    const { encrypted, iv } = encrypt(apiKey);
    const webhookToken = generateToken();
    const webhookTokenHash = hashToken(webhookToken);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // 3. Registra webhook na conta Asaas do organizador
    let webhookWarning: string | undefined;
    try {
        const webhookRes = await fetch(`${baseUrl}/v3/webhooks`, {
            method: 'POST',
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'VemCompetir',
                url: `${appUrl}/api/webhooks/asaas`,
                email: 'noreply@competir.com',
                interrupted: false,
                enabled: true,
                sendType: 'SEQUENTIALLY',
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
        const webhookBody = await webhookRes.json().catch(() => null);
        const hasBodyErrors = webhookBody?.errors?.length > 0;
        if (!webhookRes.ok || hasBodyErrors) {
            const detail = webhookBody?.errors?.[0]?.description ?? webhookBody?.message ?? webhookRes.status;
            webhookWarning = `Chave salva, mas o webhook não foi registrado. Motivo: ${detail}. Configure manualmente no painel Asaas.`;
        }
    } catch {
        webhookWarning = 'Chave salva, mas não foi possível registrar o webhook. Configure manualmente no painel Asaas.';
    }

    return {
        fields: {
            asaas_api_key_encrypted: encrypted,
            asaas_api_key_iv: iv,
            asaas_api_key_last4: getLast4(apiKey),
            asaas_webhook_token_hash: webhookTokenHash,
        },
        webhookWarning,
    };
}

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

    // 3. Atualizar configuração Asaas e funcionalidades do tenant
    const use_own_asaas_api = formData.get('use_own_asaas_api') === 'true';
    const can_register_academies = formData.get('can_register_academies') === 'true';
    const token_management_enabled = formData.get('token_management_enabled') === 'true';
    const asaas_api_key = formData.get('asaas_api_key') as string | null;

    const { data: profileForTenant } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', id)
        .single();

    if (profileForTenant?.tenant_id) {
        const tenantUpdate: Record<string, any> = { use_own_asaas_api, can_register_academies, token_management_enabled };

        if (use_own_asaas_api && asaas_api_key && asaas_api_key.trim().length > 0) {
            const result = await buildOrganizerAsaasUpdate(adminClient, asaas_api_key.trim());
            if ('error' in result) return result;
            Object.assign(tenantUpdate, result.fields);
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

export async function deleteAcademyAction(academyId: string) {
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

    const { data: academyProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', academyId)
        .single();

    const tenantId = academyProfile?.tenant_id;

    if (tenantId) {
        // 1. Buscar IDs dos eventos do tenant
        const { data: tenantEvents, error: eventsError } = await adminClient
            .from('events')
            .select('id')
            .eq('tenant_id', tenantId);

        if (eventsError) return { error: `[step1-events] ${eventsError.message}` };

        const eventIds = tenantEvents?.map(e => e.id) ?? [];

        if (eventIds.length > 0) {
            // 2. Zerar payment_id nas inscrições
            const { error: nullPaymentErr } = await adminClient
                .from('event_registrations')
                .update({ payment_id: null })
                .in('event_id', eventIds);

            if (nullPaymentErr) return { error: `[step2-null-payment] ${nullPaymentErr.message}` };

            // 3. Deletar payments dos eventos
            const { error: deletePaymentsErr } = await adminClient
                .from('payments')
                .delete()
                .in('event_id', eventIds);

            if (deletePaymentsErr) return { error: `[step3-delete-payments] ${deletePaymentsErr.message}` };
        }

        // 4. Desvincular TODOS os profiles do tenant (atletas + profile da academia)
        const { error: nullProfilesErr } = await adminClient
            .from('profiles')
            .update({ tenant_id: null, master_id: null })
            .eq('tenant_id', tenantId);

        if (nullProfilesErr) return { error: `[step4-null-profiles] ${nullProfilesErr.message}` };

        // 5. Zerar tenant_id nas inscrições
        const { error: nullRegErr } = await adminClient
            .from('event_registrations')
            .update({ tenant_id: null })
            .eq('tenant_id', tenantId);

        if (nullRegErr) return { error: `[step5-null-registrations] ${nullRegErr.message}` };

        // 6. Deletar o tenant
        const { error: deleteTenantErr } = await adminClient
            .from('tenants')
            .delete()
            .eq('id', tenantId);

        if (deleteTenantErr) return { error: `[step6-delete-tenant] ${deleteTenantErr.message}` };
    }

    // 7. Zerar registered_by nas inscrições que referenciam o profile da academia
    const { error: nullRegByErr } = await adminClient
        .from('event_registrations')
        .update({ registered_by: null })
        .eq('registered_by', academyId);

    if (nullRegByErr) return { error: `[step7-null-registered-by] ${nullRegByErr.message}` };

    // 8. Deletar qualquer tenant cujo owner_id seja esse usuário
    //    tenants.owner_id → auth.users(id) ON DELETE NO ACTION bloqueia o deleteUser
    const { error: deleteOwnerTenantErr } = await adminClient
        .from('tenants')
        .delete()
        .eq('owner_id', academyId);

    if (deleteOwnerTenantErr) return { error: `[step8-delete-owner-tenant] ${deleteOwnerTenantErr.message}` };

    // 9. Deletar o usuário auth
    const { error } = await adminClient.auth.admin.deleteUser(academyId);
    if (error) return { error: `[step9-delete-user] ${error.message}` };

    revalidatePath('/admin/dashboard/equipes-academias');
    return { success: true };
}

export async function deleteAthleteAction(athleteId: string, tenantId?: string) {
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

    // 1. Nullar master_id de outros profiles que apontam para este atleta
    //    profiles.master_id → profiles.id é ON DELETE NO ACTION
    await adminClient
        .from('profiles')
        .update({ master_id: null })
        .eq('master_id', athleteId);

    // 2. Nullar registered_by nas inscrições que referenciam este atleta
    //    event_registrations.registered_by → profiles.id é ON DELETE NO ACTION
    await adminClient
        .from('event_registrations')
        .update({ registered_by: null })
        .eq('registered_by', athleteId);

    // 3. Deletar o usuário auth — cascata deleta o profile, que cascata deleta
    //    event_registrations (via athlete_id CASCADE), athlete_term_acceptances, academy_management_authorizations
    const { error } = await adminClient.auth.admin.deleteUser(athleteId);
    if (error) return { error: error.message };

    if (tenantId) {
        revalidatePath(`/admin/dashboard/equipes-academias/${tenantId}`);
    }
    revalidatePath('/admin/dashboard/equipes-academias');
    return { success: true };
}

export async function getOrganizerApiKeyAction(entidadeId: string) {
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
        .select('asaas_api_key_encrypted, asaas_api_key_iv')
        .eq('id', profileForTenant.tenant_id)
        .single();

    if (!tenant?.asaas_api_key_encrypted || !tenant.asaas_api_key_iv) {
        return { error: 'Nenhuma chave cadastrada.' };
    }

    try {
        const apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);
        return { success: true, apiKey };
    } catch {
        return { error: 'Falha ao decifrar a chave.' };
    }
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
        const result = await buildOrganizerAsaasUpdate(adminClient, asaas_api_key.trim());
        if ('error' in result) return result;
        Object.assign(tenantUpdate, result.fields);
        await adminClient.from('tenants').update(tenantUpdate).eq('id', profileForTenant.tenant_id);
        revalidatePath('/admin/dashboard/equipes-academias');
        return { success: true, webhookWarning: result.webhookWarning };
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

// ---------------------------------------------------------------------------
// Concede tokens a uma academia (admin)
// ---------------------------------------------------------------------------
export async function grantTokensToAcademyAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const academyId = formData.get('academy_id') as string;
    const amount = parseInt(formData.get('amount') as string, 10);
    const notes = (formData.get('notes') as string)?.trim() || null;
    const tokenPackageId = (formData.get('token_package_id') as string) || undefined;

    if (!academyId || !amount || amount < 1) return { error: 'Quantidade inválida.' };

    const adminClient = createAdminClient();
    const { data: academyProfile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', academyId)
        .single();

    if (!academyProfile?.tenant_id) return { error: 'Tenant não encontrado.' };

    const result = await grantTokens(academyProfile.tenant_id, amount, {
        tokenPackageId,
        notes: notes ?? undefined,
        createdBy: currentUser.id,
    });

    if (!result.success) return { error: result.error };

    revalidatePath(`/admin/dashboard/equipes-academias/${academyId}`);
    return { success: true, newBalance: result.newBalance };
}

// ---------------------------------------------------------------------------
// Ação de uso único: re-registra os webhooks de todos os organizadores que
// já possuem chave própria salva. Necessário após configurar NEXT_PUBLIC_APP_URL
// em produção, para corrigir webhooks registrados com URL inválida.
// ---------------------------------------------------------------------------
export async function reregisterOrganizerWebhooksAction() {
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

    const { data: asaasSettings } = await adminClient
        .from('asaas_settings')
        .select('environment')
        .eq('is_enabled', true)
        .single();

    const baseUrl = asaasSettings?.environment === 'production'
        ? 'https://api.asaas.com'
        : 'https://api-sandbox.asaas.com';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    const { data: tenants } = await adminClient
        .from('tenants')
        .select('id, asaas_api_key_encrypted, asaas_api_key_iv')
        .eq('use_own_asaas_api', true)
        .not('asaas_api_key_encrypted', 'is', null);

    if (!tenants || tenants.length === 0) {
        return { success: true, message: 'Nenhum organizador com chave própria encontrado.', results: [] };
    }

    const results: Array<{ tenant_id: string; ok: boolean; error?: string }> = [];

    for (const tenant of tenants) {
        try {
            const apiKey = decrypt(tenant.asaas_api_key_encrypted!, tenant.asaas_api_key_iv!);
            const webhookToken = generateToken();
            const webhookTokenHash = hashToken(webhookToken);

            const webhookRes = await fetch(`${baseUrl}/v3/webhooks`, {
                method: 'POST',
                headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'VemCompetir',
                    url: `${appUrl}/api/webhooks/asaas`,
                    email: 'noreply@competir.com',
                    interrupted: false,
                    enabled: true,
                    sendType: 'SEQUENTIALLY',
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

            if (webhookRes.ok) {
                await adminClient
                    .from('tenants')
                    .update({ asaas_webhook_token_hash: webhookTokenHash })
                    .eq('id', tenant.id);
                results.push({ tenant_id: tenant.id, ok: true });
            } else {
                const errData = await webhookRes.json().catch(() => ({}));
                results.push({ tenant_id: tenant.id, ok: false, error: JSON.stringify(errData) });
            }
        } catch (err) {
            results.push({ tenant_id: tenant.id, ok: false, error: String(err) });
        }
    }

    const successCount = results.filter(r => r.ok).length;
    return {
        success: true,
        message: `${successCount}/${results.length} webhooks re-registrados com sucesso.`,
        results,
    };
}

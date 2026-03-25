'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
}

export async function registerSuggestedGym(formData: FormData) {
    await requireRole('admin_geral');

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const gymName = formData.get('gym_name') as string;
    const suggestionText = formData.get('suggestion_text') as string;

    if (!email || !password || !gymName || !suggestionText) {
        return { error: 'Preencha todos os campos obrigatórios.' };
    }

    const adminClient = createAdminClient();

    // 1. Criar o usuário Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // Não passa role nos metadados — a trigger força 'atleta'
        // Vamos corrigir o profile manualmente logo abaixo
        user_metadata: {
            full_name: gymName,
            gym_name: gymName,
        },
    });

    if (createError) {
        return { error: 'Ocorreu um erro ao criar a conta da Academia, verifique se o e-mail já está em uso.' };
    }

    if (!newUser.user) {
        return { error: 'Falha ao criar usuário.' };
    }

    const userId = newUser.user.id;

    // 2. Gerar slug único para o tenant
    const baseSlug = generateSlug(gymName);
    let slug = baseSlug;
    let slugAttempt = 0;

    while (true) {
        const { data: existing } = await adminClient
            .from('tenants')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (!existing) break;
        slugAttempt++;
        slug = `${baseSlug}-${slugAttempt}`;
    }

    // 3. Criar o tenant manualmente (sem depender de trigger)
    const { data: tenant, error: tenantError } = await adminClient
        .from('tenants')
        .insert({ name: gymName, slug, owner_id: userId })
        .select('id')
        .single();

    if (tenantError || !tenant) {
        // Rollback: remover o usuário criado para não deixar fantasma
        await adminClient.auth.admin.deleteUser(userId);
        return { error: 'Erro ao criar a academia interna. A conta não foi criada.' };
    }

    const tenantId = tenant.id;

    // 4. Corrigir o profile gerado pela trigger: definir role e tenant_id corretos
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({
            role: 'academia/equipe',
            full_name: gymName,
            gym_name: gymName,
            tenant_id: tenantId,
        })
        .eq('id', userId);

    if (profileError) {
        // Rollback
        await adminClient.auth.admin.deleteUser(userId);
        await adminClient.from('tenants').delete().eq('id', tenantId);
        return { error: 'Erro ao configurar o perfil da academia. A conta não foi criada.' };
    }

    // 5. Migrar atletas órfãos que sugeriram esse nome de academia
    await adminClient
        .from('profiles')
        .update({ tenant_id: tenantId })
        .eq('gym_name', suggestionText)
        .eq('role', 'atleta')
        .is('tenant_id', null);

    revalidatePath('/admin/dashboard/comunidade');
    return { success: true };
}

export async function dismissSuggestionAction(gymName: string, masterName: string) {
    await requireRole('admin_geral');

    const adminClient = createAdminClient();

    let query = adminClient
        .from('profiles')
        .update({ gym_name: null, master_name: null })
        .eq('role', 'atleta')
        .is('tenant_id', null);

    if (gymName) {
        query = query.eq('gym_name', gymName);
    } else {
        query = query.is('gym_name', null);
    }

    if (masterName) {
        query = query.eq('master_name', masterName);
    } else {
        query = query.is('master_name', null);
    }

    const { error } = await query;
    if (error) return { error: error.message };

    revalidatePath('/admin/dashboard/comunidade');
    return { success: true };
}

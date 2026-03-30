'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerAffiliatedAcademyAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) return { error: 'Não autorizado.' };

    const { data: hubProfile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', currentUser.id)
        .single();

    if (hubProfile?.role !== 'academia/equipe' || !hubProfile.tenant_id) {
        return { error: 'Sem permissão.' };
    }

    // Verify hub tenant has can_register_academies enabled
    const { data: hubTenant } = await supabase
        .from('tenants')
        .select('can_register_academies')
        .eq('id', hubProfile.tenant_id)
        .single();

    if (!hubTenant?.can_register_academies) {
        return { error: 'Funcionalidade não habilitada para esta academia.' };
    }

    const full_name = (formData.get('full_name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;
    const document = (formData.get('document') as string)?.trim();

    if (!full_name || !email || !password) {
        return { error: 'Nome, e-mail e senha são obrigatórios.' };
    }
    if (password.length < 6) {
        return { error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    const adminClient = createAdminClient();

    // Check name uniqueness
    const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('full_name', full_name)
        .eq('role', 'academia/equipe')
        .maybeSingle();

    if (existing) {
        return { error: 'Já existe uma academia com este nome.' };
    }

    // Create auth user
    const { data: { user }, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: { role: 'academia/equipe', full_name, document },
        email_confirm: true,
    });

    if (createError || !user) {
        return { error: createError?.message || 'Erro ao criar usuário.' };
    }

    // Create tenant
    const slug = full_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 7);

    const { data: tenant, error: tenantError } = await adminClient
        .from('tenants')
        .insert({
            name: full_name,
            slug,
            owner_id: user.id,
            registered_by_tenant_id: hubProfile.tenant_id,
        })
        .select()
        .single();

    if (tenantError) {
        console.error('Erro ao criar tenant afiliado:', tenantError);
    }

    // Update profile
    await adminClient.from('profiles').upsert({
        id: user.id,
        role: 'academia/equipe',
        full_name,
        tenant_id: tenant?.id,
        document,
    });

    revalidatePath('/academia-equipe/dashboard/academias-afiliadas');
    return { success: true };
}

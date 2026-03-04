'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

    revalidatePath('/admin/dashboard/equipes-academias');
    revalidatePath(`/admin/dashboard/equipes-academias/${id}`);
    return { success: true };
}

'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createSuperAdminAction(formData: FormData) {
    await requireRole('admin_geral');

    const full_name = (formData.get('full_name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!full_name || !email || !password) {
        return { error: 'Preencha nome, e-mail e senha.' };
    }

    if (password.length < 6) {
        return { error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    const adminClient = createAdminClient();

    // Cria o usuário no Auth. O trigger handle_new_user cria o profile como 'atleta'.
    const { data: { user }, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'admin_geral',
            full_name,
        },
        email_confirm: true,
    });

    if (error) {
        const msg = error.message?.toLowerCase().includes('already')
            ? 'Já existe uma conta com este e-mail.'
            : error.message;
        return { error: msg };
    }

    if (!user) {
        return { error: 'Não foi possível criar a conta. Tente novamente.' };
    }

    // Passo obrigatório: o trigger grava role='atleta'. Promovemos para admin_geral.
    const { error: updateError } = await adminClient
        .from('profiles')
        .update({ role: 'admin_geral', full_name })
        .eq('id', user.id);

    if (updateError) {
        // Rollback: remove a conta órfã para não deixar um usuário sem o papel correto.
        await adminClient.auth.admin.deleteUser(user.id);
        return { error: 'Falha ao definir o papel de super admin. Nenhuma conta foi criada.' };
    }

    revalidatePath('/admin/dashboard/super-admins');
    return { success: true };
}

/** Edita o nome de um super admin (profiles + metadata do Auth). */
export async function updateSuperAdminNameAction(userId: string, fullNameRaw: string) {
    await requireRole('admin_geral');

    const full_name = fullNameRaw?.trim();
    if (!userId || !full_name) {
        return { error: 'Informe um nome válido.' };
    }

    const adminClient = createAdminClient();

    // Garante que o alvo é de fato um super admin (evita editar outros papéis por aqui).
    const { data: target } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (target?.role !== 'admin_geral') {
        return { error: 'Conta não encontrada ou não é um super admin.' };
    }

    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ full_name })
        .eq('id', userId);

    if (profileError) {
        return { error: 'Falha ao atualizar o nome.' };
    }

    await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: 'admin_geral', full_name },
    });

    revalidatePath('/admin/dashboard/super-admins');
    return { success: true };
}

/** Redefine a senha de um super admin. */
export async function resetSuperAdminPasswordAction(userId: string, password: string) {
    await requireRole('admin_geral');

    if (!userId || !password) {
        return { error: 'Informe a nova senha.' };
    }
    if (password.length < 6) {
        return { error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    const adminClient = createAdminClient();

    const { data: target } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (target?.role !== 'admin_geral') {
        return { error: 'Conta não encontrada ou não é um super admin.' };
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) {
        return { error: 'Falha ao redefinir a senha.' };
    }

    return { success: true };
}

/**
 * Revoga o acesso de super admin, rebaixando a conta para 'atleta'.
 * Travas: não permite o admin rebaixar a si mesmo, nem deixar o sistema sem admin.
 */
export async function revokeSuperAdminAction(userId: string) {
    const { user } = await requireRole('admin_geral');

    if (!userId) {
        return { error: 'Conta inválida.' };
    }
    if (userId === user.id) {
        return { error: 'Você não pode revogar o seu próprio acesso.' };
    }

    const adminClient = createAdminClient();

    const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin_geral');

    if ((count ?? 0) <= 1) {
        return { error: 'Não é possível remover o último super admin do sistema.' };
    }

    const { data: target } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (target?.role !== 'admin_geral') {
        return { error: 'Conta não encontrada ou não é um super admin.' };
    }

    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ role: 'atleta' })
        .eq('id', userId);

    if (profileError) {
        return { error: 'Falha ao revogar o acesso.' };
    }

    await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: 'atleta' },
    });

    revalidatePath('/admin/dashboard/super-admins');
    return { success: true };
}

/**
 * Exclui a conta de um super admin de forma definitiva (Auth + profile via cascade).
 * Travas: não permite excluir a si mesmo, nem o último super admin.
 */
export async function deleteSuperAdminAction(userId: string) {
    const { user } = await requireRole('admin_geral');

    if (!userId) {
        return { error: 'Conta inválida.' };
    }
    if (userId === user.id) {
        return { error: 'Você não pode excluir a sua própria conta.' };
    }

    const adminClient = createAdminClient();

    const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin_geral');

    if ((count ?? 0) <= 1) {
        return { error: 'Não é possível excluir o último super admin do sistema.' };
    }

    const { data: target } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (target?.role !== 'admin_geral') {
        return { error: 'Conta não encontrada ou não é um super admin.' };
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
        return { error: 'Falha ao excluir a conta. Ela pode ter registros vinculados.' };
    }

    revalidatePath('/admin/dashboard/super-admins');
    return { success: true };
}

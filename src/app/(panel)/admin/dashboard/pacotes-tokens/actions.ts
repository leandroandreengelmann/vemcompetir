'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin_geral') return null;
    return user;
}

export async function createTokenPackageAction(formData: FormData) {
    const user = await requireAdmin();
    if (!user) return { error: 'Sem permissão.' };

    const name = (formData.get('name') as string)?.trim();
    const token_count = parseInt(formData.get('token_count') as string, 10);
    const price_cents = Math.round(parseFloat(formData.get('price_reais') as string) * 100);
    const description = (formData.get('description') as string)?.trim() || null;

    if (!name || !token_count || token_count < 1 || isNaN(price_cents)) {
        return { error: 'Preencha todos os campos obrigatórios.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('token_packages')
        .insert({ name, token_count, price_cents, description });

    if (error) return { error: error.message };

    revalidatePath('/admin/dashboard/pacotes-tokens');
    return { success: true };
}

export async function updateTokenPackageAction(formData: FormData) {
    const user = await requireAdmin();
    if (!user) return { error: 'Sem permissão.' };

    const id = formData.get('id') as string;
    const name = (formData.get('name') as string)?.trim();
    const token_count = parseInt(formData.get('token_count') as string, 10);
    const price_cents = Math.round(parseFloat(formData.get('price_reais') as string) * 100);
    const description = (formData.get('description') as string)?.trim() || null;
    const is_active = formData.get('is_active') === 'true';

    if (!id || !name || !token_count || token_count < 1) {
        return { error: 'Dados inválidos.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('token_packages')
        .update({ name, token_count, price_cents, description, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/admin/dashboard/pacotes-tokens');
    return { success: true };
}

export async function deleteTokenPackageAction(id: string) {
    const user = await requireAdmin();
    if (!user) return { error: 'Sem permissão.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('token_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/admin/dashboard/pacotes-tokens');
    return { success: true };
}

export async function getTokenPackagesAction() {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('token_packages')
        .select('*')
        .order('created_at', { ascending: false });
    return data ?? [];
}

export async function getAcademiesTokenSummaryAction() {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('tenants')
        .select('id, name, inscription_token_balance, token_management_enabled, token_alert_sent_at')
        .eq('token_management_enabled', true)
        .order('inscription_token_balance', { ascending: true });
    return data ?? [];
}

export async function sellTokensToAcademyAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin_geral') return { error: 'Sem permissão.' };

    const tenant_id = formData.get('tenant_id') as string;
    const token_package_id = formData.get('token_package_id') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!tenant_id || !token_package_id) return { error: 'Dados inválidos.' };

    const adminClient = createAdminClient();

    const { data: pkg } = await adminClient
        .from('token_packages')
        .select('token_count, name, price_cents')
        .eq('id', token_package_id)
        .eq('is_active', true)
        .single();

    if (!pkg) return { error: 'Pacote não encontrado.' };

    const { grantTokens } = await import('@/lib/token-utils');
    const result = await grantTokens(tenant_id, pkg.token_count, {
        tokenPackageId: token_package_id,
        notes: notes ?? `Venda: ${pkg.name}`,
        createdBy: user.id,
    });

    if (!result.success) return { error: result.error };

    revalidatePath('/admin/dashboard/pacotes-tokens');
    return { success: true, newBalance: result.newBalance, tokensAdded: pkg.token_count };
}

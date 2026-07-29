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

/**
 * Lista TODAS as academias (tenants com uma conta academia/equipe), inclusive as
 * que estão com a gestão por token desligada — a tela deixa ativar o módulo ali
 * mesmo. Ordena por nome; os filtros e a ordenação por saldo ficam no client.
 */
export async function getAcademiesTokenSummaryAction() {
    const adminClient = createAdminClient();

    const { data: academyProfiles } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('role', 'academia/equipe')
        .not('tenant_id', 'is', null);

    const academyTenantIds = new Set((academyProfiles ?? []).map(p => p.tenant_id as string));

    const { data } = await adminClient
        .from('tenants')
        .select('id, name, inscription_token_balance, token_management_enabled, token_alert_sent_at')
        .order('name', { ascending: true });

    // Um tenant já sob gestão de token nunca some da lista, mesmo que o perfil
    // dono dele esteja com outro papel.
    return (data ?? []).filter(t => academyTenantIds.has(t.id) || t.token_management_enabled);
}

/**
 * Crédito/débito avulso, sem pacote. Aceita valor negativo para corrigir um
 * lançamento errado. Como não recebe tokenPackageId, grantTokens registra a
 * transação como 'adjusted' no extrato da academia.
 */
export async function adjustAcademyTokensAction(formData: FormData) {
    const user = await requireAdmin();
    if (!user) return { error: 'Sem permissão.' };

    const tenant_id = formData.get('tenant_id') as string;
    const amount = parseInt(formData.get('amount') as string, 10);
    const notes = (formData.get('notes') as string)?.trim();

    if (!tenant_id) return { error: 'Academia inválida.' };
    if (!Number.isInteger(amount) || amount === 0) {
        return { error: 'Informe uma quantidade diferente de zero.' };
    }
    if (!notes) return { error: 'Descreva o motivo do ajuste.' };

    const { grantTokens } = await import('@/lib/token-utils');
    const result = await grantTokens(tenant_id, amount, {
        notes,
        createdBy: user.id,
    });

    if (!result.success) return { error: result.error };

    revalidatePath('/admin/dashboard/pacotes-tokens');
    return { success: true, newBalance: result.newBalance, tokensAdded: amount };
}

/**
 * Liga/desliga a gestão por token de uma academia. Com o módulo desligado, o
 * tenant não consome nem estorna tokens (ver token-utils.ts).
 */
export async function toggleTokenManagementAction(tenantId: string, enabled: boolean) {
    const user = await requireAdmin();
    if (!user) return { error: 'Sem permissão.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('tenants')
        .update({ token_management_enabled: enabled })
        .eq('id', tenantId);

    if (error) {
        console.error('toggleTokenManagementAction error:', error);
        return { error: 'Erro ao alterar a gestão por token.' };
    }

    revalidatePath('/admin/dashboard/pacotes-tokens');
    revalidatePath(`/admin/dashboard/equipes-academias/${tenantId}`);
    return { success: true };
}

/**
 * Últimos lançamentos de uma academia, exibidos dentro do diálogo de saldo.
 * A ordenação secundária por balance_after evita o extrato "pular" quando
 * vários lançamentos compartilham o mesmo created_at.
 */
export async function getAcademyTokenHistoryAction(tenantId: string) {
    const user = await requireAdmin();
    if (!user) return [];

    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('token_transactions')
        .select('id, type, amount, balance_after, notes, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .order('balance_after', { ascending: true })
        .limit(8);

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

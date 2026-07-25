'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit-log';
import {
    IMP_ACTIVE,
    IMP_LABEL,
    IMP_ADMIN_RETURN,
    IMP_ADMIN_ID,
    IMP_MAX_AGE,
} from '@/lib/impersonation-constants';

/**
 * Impersonação de contas ("acessar como") — exclusivo para admin_geral.
 *
 * Estratégia: em vez de reabrir o RLS para o admin (que hoje NÃO libera
 * admin_geral nas tabelas centrais do painel, ex.: event_registrations,
 * cart_items, token_ledger), o admin recebe temporariamente uma sessão REAL
 * da conta alvo. Assim o RLS continua funcionando normalmente, pois o
 * `auth.uid()` passa a ser o da conta impersonada. Ao sair, restauramos a
 * sessão original do admin a partir do refresh token guardado num cookie
 * httpOnly.
 */

type ImpersonationResult =
    | { ok: true; redirectTo: string }
    | { ok: false; error: string };

function cookieBase() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    };
}

/**
 * Inicia a impersonação de uma conta (academia/equipe ou atleta).
 * @param targetUserId auth user id da conta alvo.
 */
export async function impersonateUser(targetUserId: string): Promise<ImpersonationResult> {
    const cookieStore = await cookies();

    // Impede impersonação aninhada.
    if (cookieStore.get(IMP_ACTIVE)?.value) {
        return { ok: false, error: 'Já existe uma impersonação ativa. Saia dela antes de iniciar outra.' };
    }

    const supabase = await createClient();

    // 1. Confirma que quem chama é admin_geral (com a sessão real, antes de trocar).
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) return { ok: false, error: 'Sessão não encontrada. Faça login novamente.' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', admin.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') {
        auditLog('IMPERSONATION_ERROR', { reason: 'not_admin', caller_id: admin.id }, 'warn');
        return { ok: false, error: 'Apenas administradores podem acessar como outra conta.' };
    }

    // 2. Guarda o refresh token do admin para poder restaurar a sessão depois.
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    const adminRefresh = adminSession?.refresh_token;
    if (!adminRefresh) {
        return { ok: false, error: 'Não foi possível preservar sua sessão de admin. Tente novamente.' };
    }

    // 3. Resolve a conta alvo.
    const adminClient = createAdminClient();
    const { data: targetAuth, error: targetErr } = await adminClient.auth.admin.getUserById(targetUserId);
    const target = targetAuth?.user;
    if (targetErr || !target?.email) {
        auditLog('IMPERSONATION_ERROR', { reason: 'target_not_found', admin_id: admin.id, target_id: targetUserId }, 'warn');
        return { ok: false, error: 'Conta alvo não encontrada ou sem e-mail de acesso.' };
    }

    const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('role, full_name')
        .eq('id', targetUserId)
        .single();

    const targetRole = (targetProfile?.role ?? target.user_metadata?.role) as string | undefined;
    const label = targetProfile?.full_name || target.user_metadata?.full_name || target.email;
    const redirectTo = targetRole === 'atleta'
        ? '/atleta/dashboard'
        : '/academia-equipe/dashboard';

    // 4. Gera um token de acesso para a conta alvo e estabelece a sessão.
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: target.email,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
        auditLog('IMPERSONATION_ERROR', { reason: 'generate_link_failed', admin_id: admin.id, target_id: targetUserId }, 'error');
        return { ok: false, error: 'Falha ao gerar a sessão da conta alvo.' };
    }

    // Isto SOBRESCREVE os cookies de sessão do admin pelos da conta alvo.
    const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (verifyErr) {
        auditLog('IMPERSONATION_ERROR', { reason: 'verify_failed', admin_id: admin.id, target_id: targetUserId }, 'error');
        return { ok: false, error: 'Falha ao estabelecer a sessão da conta alvo.' };
    }

    // 5. Grava cookies de controle (para banner + restauração da sessão).
    const base = cookieBase();
    cookieStore.set(IMP_ADMIN_RETURN, adminRefresh, { ...base, maxAge: IMP_MAX_AGE });
    cookieStore.set(IMP_ADMIN_ID, admin.id, { ...base, maxAge: IMP_MAX_AGE });
    cookieStore.set(IMP_LABEL, label, { ...base, maxAge: IMP_MAX_AGE });
    cookieStore.set(IMP_ACTIVE, '1', { ...base, maxAge: IMP_MAX_AGE });

    auditLog('IMPERSONATION_START', {
        admin_id: admin.id,
        admin_email: admin.email,
        target_id: targetUserId,
        target_email: target.email,
        target_role: targetRole,
    });

    return { ok: true, redirectTo };
}

/**
 * Encerra a impersonação e restaura a sessão original do admin.
 */
export async function stopImpersonation(): Promise<ImpersonationResult> {
    const cookieStore = await cookies();
    const adminRefresh = cookieStore.get(IMP_ADMIN_RETURN)?.value;
    const adminId = cookieStore.get(IMP_ADMIN_ID)?.value;

    const supabase = await createClient();

    let restored = false;
    if (adminRefresh) {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: adminRefresh });
        if (!error && data?.session) restored = true;
    }

    // Limpa cookies de controle.
    for (const name of [IMP_ACTIVE, IMP_LABEL, IMP_ADMIN_RETURN, IMP_ADMIN_ID]) {
        cookieStore.delete(name);
    }

    auditLog('IMPERSONATION_STOP', { admin_id: adminId, restored });

    if (!restored) {
        // Não conseguimos restaurar o admin: encerra tudo com segurança.
        await supabase.auth.signOut();
        return { ok: true, redirectTo: '/login' };
    }

    return { ok: true, redirectTo: '/admin/dashboard/equipes-academias' };
}

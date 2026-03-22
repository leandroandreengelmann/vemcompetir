'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type LegalDocument = {
    id: string;
    version: number;
    content: string;
    is_active: boolean;
    created_at: string;
};

// ── Política de Privacidade ──────────────────────────────────────────────────

export async function getActivePrivacyPolicyAction(): Promise<LegalDocument | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('privacy_policies')
        .select('id, version, content, is_active, created_at')
        .eq('is_active', true)
        .single();
    return data ?? null;
}

export async function getAllPrivacyPoliciesAction(): Promise<LegalDocument[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('privacy_policies')
        .select('id, version, content, is_active, created_at')
        .order('version', { ascending: false });
    return data ?? [];
}

export async function savePrivacyPolicyAction(content: string): Promise<{ error?: string }> {
    if (!content.trim()) return { error: 'O conteúdo não pode estar vazio.' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    const { data: latest } = await supabase
        .from('privacy_policies')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const nextVersion = (latest?.version ?? 0) + 1;

    await supabase.from('privacy_policies').update({ is_active: false }).eq('is_active', true);

    const { error } = await supabase
        .from('privacy_policies')
        .insert({ version: nextVersion, content: content.trim(), is_active: true, created_by: user.id });

    if (error) return { error: 'Erro ao salvar.' };

    revalidatePath('/admin/dashboard/juridico');
    revalidatePath('/privacidade');
    return {};
}

export async function activatePrivacyPolicyAction(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    await supabase.from('privacy_policies').update({ is_active: false }).eq('is_active', true);
    const { error } = await supabase.from('privacy_policies').update({ is_active: true }).eq('id', id);

    if (error) return { error: 'Erro ao ativar versão.' };

    revalidatePath('/admin/dashboard/juridico');
    revalidatePath('/privacidade');
    return {};
}

// ── Termos de Uso ────────────────────────────────────────────────────────────

export async function getActiveTermsOfUseAction(): Promise<LegalDocument | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('terms_of_use')
        .select('id, version, content, is_active, created_at')
        .eq('is_active', true)
        .single();
    return data ?? null;
}

export async function getAllTermsOfUseAction(): Promise<LegalDocument[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('terms_of_use')
        .select('id, version, content, is_active, created_at')
        .order('version', { ascending: false });
    return data ?? [];
}

export async function saveTermsOfUseAction(content: string): Promise<{ error?: string }> {
    if (!content.trim()) return { error: 'O conteúdo não pode estar vazio.' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    const { data: latest } = await supabase
        .from('terms_of_use')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const nextVersion = (latest?.version ?? 0) + 1;

    await supabase.from('terms_of_use').update({ is_active: false }).eq('is_active', true);

    const { error } = await supabase
        .from('terms_of_use')
        .insert({ version: nextVersion, content: content.trim(), is_active: true, created_by: user.id });

    if (error) return { error: 'Erro ao salvar.' };

    revalidatePath('/admin/dashboard/juridico');
    revalidatePath('/termos-de-uso');
    return {};
}

export async function activateTermsOfUseAction(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    await supabase.from('terms_of_use').update({ is_active: false }).eq('is_active', true);
    const { error } = await supabase.from('terms_of_use').update({ is_active: true }).eq('id', id);

    if (error) return { error: 'Erro ao ativar versão.' };

    revalidatePath('/admin/dashboard/juridico');
    revalidatePath('/termos-de-uso');
    return {};
}

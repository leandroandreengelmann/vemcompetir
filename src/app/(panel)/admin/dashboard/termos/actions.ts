'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { GuardianDeclaration } from '@/types/guardian';

export type Term = {
    id: string;
    version: number;
    content: string;
    is_active: boolean;
    created_at: string;
};

export async function getActiveTermAction(): Promise<Term | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('terms_of_service')
        .select('id, version, content, is_active, created_at')
        .eq('is_active', true)
        .single();
    return data ?? null;
}

export async function getAllTermsAction(): Promise<Term[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('terms_of_service')
        .select('id, version, content, is_active, created_at')
        .order('version', { ascending: false });
    return data ?? [];
}

export async function saveNewTermVersionAction(content: string): Promise<{ error?: string }> {
    if (!content.trim()) return { error: 'O conteúdo do termo não pode estar vazio.' };

    const supabase = await createClient();

    // Verifica se é admin_geral
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    // Busca versão mais recente
    const { data: latest } = await supabase
        .from('terms_of_service')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const nextVersion = (latest?.version ?? 0) + 1;

    // Desativa todos os outros termos
    await supabase
        .from('terms_of_service')
        .update({ is_active: false })
        .eq('is_active', true);

    // Insere nova versão como ativa
    const { error } = await supabase
        .from('terms_of_service')
        .insert({ version: nextVersion, content: content.trim(), is_active: true, created_by: user.id });

    if (error) return { error: 'Erro ao salvar o termo.' };

    revalidatePath('/admin/dashboard/termos');
    return {};
}

export type TermAcceptance = {
    id: string;
    athlete_name_snapshot: string;
    event_title_snapshot: string;
    event_city_snapshot: string | null;
    event_start_date_snapshot: string | null;
    accepted_at: string;
    term_version: number;
    term_type: 'standard' | 'minor';
};

export async function getTermAcceptancesAction(
    page = 1,
    search = '',
    termType: 'all' | 'standard' | 'minor' = 'all',
    eventSearch = ''
): Promise<{ data: TermAcceptance[]; total: number }> {
    const supabase = await createClient();
    const pageSize = 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('athlete_term_acceptances')
        .select(`
            id,
            athlete_name_snapshot,
            event_title_snapshot,
            event_city_snapshot,
            event_start_date_snapshot,
            accepted_at,
            term_type,
            terms_of_service ( version ),
            guardian_term_templates ( version )
        `, { count: 'exact' })
        .order('accepted_at', { ascending: false })
        .range(from, to);

    if (search.trim()) {
        query = query.ilike('athlete_name_snapshot', `%${search.trim()}%`);
    }
    if (eventSearch.trim()) {
        query = query.ilike('event_title_snapshot', `%${eventSearch.trim()}%`);
    }
    if (termType !== 'all') {
        query = query.eq('term_type', termType);
    }

    const { data, count } = await query;

    const mapped: TermAcceptance[] = (data ?? []).map((row: any) => ({
        id: row.id,
        athlete_name_snapshot: row.athlete_name_snapshot,
        event_title_snapshot: row.event_title_snapshot,
        event_city_snapshot: row.event_city_snapshot,
        event_start_date_snapshot: row.event_start_date_snapshot,
        accepted_at: row.accepted_at,
        term_type: row.term_type ?? 'standard',
        term_version: row.terms_of_service?.version ?? row.guardian_term_templates?.version ?? 1,
    }));

    return { data: mapped, total: count ?? 0 };
}

export async function activateTermVersionAction(termId: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    await supabase
        .from('terms_of_service')
        .update({ is_active: false })
        .eq('is_active', true);

    const { error } = await supabase
        .from('terms_of_service')
        .update({ is_active: true })
        .eq('id', termId);

    if (error) return { error: 'Erro ao ativar versão.' };

    revalidatePath('/admin/dashboard/termos');
    return {};
}

// ──────────────────────────────────────────────────────────────
// Guardian term template actions
// ──────────────────────────────────────────────────────────────

export type GuardianTemplate = {
    id: string;
    version: number;
    content: string;
    is_active: boolean;
    created_at: string;
};

export async function getActiveGuardianTemplateAction(type: 'academy' | 'self_register' | 'minor_event' | 'academy_management' = 'academy'): Promise<GuardianTemplate | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('guardian_term_templates')
        .select('id, version, content, is_active, created_at')
        .eq('is_active', true)
        .eq('type', type)
        .single();
    return data ?? null;
}

export async function getAllGuardianTemplatesAction(type: 'academy' | 'self_register' | 'minor_event' | 'academy_management' = 'academy'): Promise<GuardianTemplate[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('guardian_term_templates')
        .select('id, version, content, is_active, created_at')
        .eq('type', type)
        .order('version', { ascending: false });
    return data ?? [];
}

export async function saveGuardianTemplateAction(content: string, type: 'academy' | 'self_register' | 'minor_event' | 'academy_management' = 'academy'): Promise<{ error?: string }> {
    if (!content.trim()) return { error: 'O conteúdo do termo não pode estar vazio.' };

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    const { data: latest } = await supabase
        .from('guardian_term_templates')
        .select('version')
        .eq('type', type)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const nextVersion = (latest?.version ?? 0) + 1;

    await supabase
        .from('guardian_term_templates')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('type', type);

    const { error } = await supabase
        .from('guardian_term_templates')
        .insert({ version: nextVersion, content: content.trim(), is_active: true, type, created_by: user.id });

    if (error) return { error: 'Erro ao salvar o modelo de termo.' };

    revalidatePath('/admin/dashboard/termos');
    return {};
}

export async function activateGuardianTemplateAction(templateId: string, type: 'academy' | 'self_register' | 'minor_event' | 'academy_management' = 'academy'): Promise<{ error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    await supabase
        .from('guardian_term_templates')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('type', type);

    const { error } = await supabase
        .from('guardian_term_templates')
        .update({ is_active: true })
        .eq('id', templateId);

    if (error) return { error: 'Erro ao ativar versão.' };

    revalidatePath('/admin/dashboard/termos');
    return {};
}

// ──────────────────────────────────────────────────────────────
// Guardian declarations list
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// Academy management authorization list (admin view)
// ──────────────────────────────────────────────────────────────

export type ManagementAuthorization = {
    id: string;
    athlete_name: string;
    academy_name: string;
    document_url: string;
    uploaded_at: string;
};

export async function getManagementAuthorizationsAction(page = 1, search = ''): Promise<{ data: ManagementAuthorization[]; total: number }> {
    const supabase = await createClient();
    const pageSize = 25;

    const { data } = await supabase
        .from('academy_management_authorizations')
        .select(`
            id,
            document_url,
            uploaded_at,
            athlete:profiles!academy_management_authorizations_athlete_id_fkey ( full_name ),
            academy:profiles!academy_management_authorizations_academy_id_fkey ( full_name, gym_name )
        `)
        .order('uploaded_at', { ascending: false });

    let rows = (data ?? []) as any[];
    if (search.trim()) {
        const s = search.trim().toLowerCase();
        rows = rows.filter(r =>
            (r.athlete?.full_name ?? '').toLowerCase().includes(s) ||
            (r.academy?.gym_name ?? r.academy?.full_name ?? '').toLowerCase().includes(s)
        );
    }

    const total = rows.length;
    const from = (page - 1) * pageSize;
    const mapped: ManagementAuthorization[] = rows.slice(from, from + pageSize).map((r: any) => ({
        id: r.id,
        athlete_name: r.athlete?.full_name ?? 'Desconhecido',
        academy_name: r.academy?.gym_name || r.academy?.full_name || 'Desconhecida',
        document_url: r.document_url,
        uploaded_at: r.uploaded_at,
    }));

    return { data: mapped, total };
}

export async function getGuardianDeclarationsAction(
    page = 1,
    search = '',
    responsibleType: 'all' | 'guardian' | 'academy' = 'all'
): Promise<{ data: GuardianDeclaration[]; total: number }> {
    const supabase = await createClient();
    const pageSize = 25;
    const from = (page - 1) * pageSize;

    let query = supabase
        .from('athlete_guardian_declarations')
        .select(`
            id,
            athlete_id,
            responsible_type,
            responsible_name,
            responsible_relationship,
            content,
            generated_at,
            profiles!athlete_guardian_declarations_athlete_id_fkey ( full_name )
        `)
        .order('generated_at', { ascending: false });

    if (responsibleType !== 'all') {
        query = query.eq('responsible_type', responsibleType);
    }

    const { data } = await query;

    let filtered = data ?? [];
    if (search.trim()) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter((row: any) =>
            (row.profiles?.full_name ?? '').toLowerCase().includes(s) ||
            (row.responsible_name ?? '').toLowerCase().includes(s)
        );
    }

    const total = filtered.length;
    const sliced = filtered.slice(from, from + pageSize);

    const mapped: GuardianDeclaration[] = sliced.map((row: any) => ({
        id: row.id,
        athlete_id: row.athlete_id,
        athlete_name: row.profiles?.full_name ?? 'Desconhecido',
        responsible_type: row.responsible_type,
        responsible_name: row.responsible_name,
        responsible_relationship: row.responsible_relationship,
        content: row.content,
        generated_at: row.generated_at,
    }));

    return { data: mapped, total };
}

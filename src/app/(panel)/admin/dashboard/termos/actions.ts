'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
};

export async function getTermAcceptancesAction(page = 1, search = ''): Promise<{ data: TermAcceptance[]; total: number }> {
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
            terms_of_service!inner ( version )
        `, { count: 'exact' })
        .order('accepted_at', { ascending: false })
        .range(from, to);

    if (search.trim()) {
        query = query.ilike('athlete_name_snapshot', `%${search.trim()}%`);
    }

    const { data, count } = await query;

    const mapped: TermAcceptance[] = (data ?? []).map((row: any) => ({
        id: row.id,
        athlete_name_snapshot: row.athlete_name_snapshot,
        event_title_snapshot: row.event_title_snapshot,
        event_city_snapshot: row.event_city_snapshot,
        event_start_date_snapshot: row.event_start_date_snapshot,
        accepted_at: row.accepted_at,
        term_version: row.terms_of_service?.version ?? 1,
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

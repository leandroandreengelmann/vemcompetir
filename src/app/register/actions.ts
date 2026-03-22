'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getGuardianTemplateContentAction(): Promise<string> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('guardian_term_templates')
        .select('content')
        .eq('is_active', true)
        .eq('type', 'self_register')
        .single();
    return data?.content ?? '';
}

export async function submitSignedTermAction(formData: FormData): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const filePath = formData.get('file_path') as string;
    if (!filePath) return { error: 'Arquivo não enviado.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('athlete_guardian_declarations')
        .update({
            signed_term_url: filePath,
            signed_term_status: 'under_review',
            signed_term_at: new Date().toISOString(),
        })
        .eq('athlete_id', user.id);

    if (error) return { error: 'Erro ao registrar envio.' };

    revalidatePath('/atleta/dashboard');
    return {};
}

export async function approveSignedTermAction(athleteId: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') return { error: 'Acesso negado.' };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('athlete_guardian_declarations')
        .update({ signed_term_status: 'approved' })
        .eq('athlete_id', athleteId);

    if (error) return { error: 'Erro ao aprovar termo.' };

    revalidatePath('/admin/dashboard/termos');
    return {};
}

export async function getPendingSignedTermsAction(
    status: 'under_review' | 'approved' | 'all' = 'under_review',
    search = ''
): Promise<{
    data: {
        id: string;
        athlete_id: string;
        athlete_name: string;
        responsible_name: string | null;
        responsible_relationship: string | null;
        signed_term_url: string | null;
        signed_term_at: string | null;
        signed_term_status: string;
    }[];
    total: number;
}> {
    const adminClient = createAdminClient();

    let query = adminClient
        .from('athlete_guardian_declarations')
        .select(`
            id,
            athlete_id,
            responsible_name,
            responsible_relationship,
            signed_term_url,
            signed_term_at,
            signed_term_status,
            profiles!athlete_guardian_declarations_athlete_id_fkey ( full_name )
        `, { count: 'exact' })
        .not('signed_term_status', 'is', null)
        .order('signed_term_at', { ascending: false });

    if (status !== 'all') {
        query = query.eq('signed_term_status', status);
    }

    const { data } = await query;

    let rows = (data ?? []).map((row: any) => ({
        id: row.id,
        athlete_id: row.athlete_id,
        athlete_name: row.profiles?.full_name ?? 'Desconhecido',
        responsible_name: row.responsible_name,
        responsible_relationship: row.responsible_relationship,
        signed_term_url: row.signed_term_url,
        signed_term_at: row.signed_term_at,
        signed_term_status: row.signed_term_status,
    }));

    if (search.trim()) {
        const s = search.trim().toLowerCase();
        rows = rows.filter(r => r.athlete_name.toLowerCase().includes(s));
    }

    return { data: rows, total: rows.length };
}

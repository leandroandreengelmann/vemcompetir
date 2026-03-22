'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ManagementAuthorizationStatus = {
    id: string;
    document_url: string;
    uploaded_at: string;
} | null;

/** Gets template content for academy_management type (for download). */
export async function getAcademyManagementTemplateAction(): Promise<{ content: string } | { error: string }> {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('guardian_term_templates')
        .select('content')
        .eq('type', 'academy_management')
        .eq('is_active', true)
        .single();
    if (!data) return { error: 'Modelo de termo não encontrado.' };
    return { content: data.content };
}

/** Gets current management authorization for a given athlete under the logged-in academy. */
export async function getManagementAuthorizationStatusAction(athleteId: string): Promise<ManagementAuthorizationStatus> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('academy_management_authorizations')
        .select('id, document_url, uploaded_at')
        .eq('athlete_id', athleteId)
        .eq('academy_id', user.id)
        .maybeSingle();

    return data ?? null;
}

/** Uploads the signed management authorization document to storage and upserts the record. */
export async function uploadManagementAuthorizationAction(
    athleteId: string,
    formData: FormData
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const file = formData.get('file') as File | null;
    if (!file) return { error: 'Nenhum arquivo enviado.' };

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext)) return { error: 'Formato não suportado. Use PDF, JPG ou PNG.' };
    if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. Máximo 10MB.' };

    const path = `management-auth/${user.id}/${athleteId}/authorization-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
        .from('signed-terms')
        .upload(path, file, { upsert: true });

    if (uploadError) return { error: 'Erro ao enviar o arquivo.' };

    const { data: urlData } = supabase.storage.from('signed-terms').getPublicUrl(path);
    const document_url = urlData?.publicUrl ?? path;

    const { error: dbError } = await supabase
        .from('academy_management_authorizations')
        .upsert(
            { athlete_id: athleteId, academy_id: user.id, document_url, status: 'uploaded', uploaded_at: new Date().toISOString() },
            { onConflict: 'athlete_id,academy_id' }
        );

    if (dbError) return { error: 'Erro ao registrar a autorização.' };
    return {};
}

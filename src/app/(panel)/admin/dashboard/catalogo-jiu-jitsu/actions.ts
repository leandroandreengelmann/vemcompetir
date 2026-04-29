'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export type JjLabImport = {
    id: string;
    name: string;
    description: string | null;
    filename: string | null;
    separator: string | null;
    headers: string[];
    total_rows: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

export type JjLabRawRow = {
    id: string;
    import_id: string;
    row_index: number;
    data: Record<string, string>;
    created_at: string;
};

export type JjLabNote = {
    id: string;
    import_id: string | null;
    author_id: string | null;
    content: string;
    created_at: string;
};

export async function listImports(): Promise<JjLabImport[]> {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('jj_lab_imports')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('listImports error', error);
        return [];
    }
    return data as JjLabImport[];
}

export async function getImport(id: string): Promise<JjLabImport | null> {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('jj_lab_imports')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) return null;
    return data as JjLabImport | null;
}

export async function getImportRows(importId: string, limit = 500, offset = 0): Promise<JjLabRawRow[]> {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('jj_lab_raw_rows')
        .select('*')
        .eq('import_id', importId)
        .order('row_index', { ascending: true })
        .range(offset, offset + limit - 1);
    if (error) {
        console.error('getImportRows error', error);
        return [];
    }
    return data as JjLabRawRow[];
}

export async function createImport(payload: {
    name: string;
    description?: string;
    filename?: string;
    separator?: string;
    headers: string[];
    rows: Record<string, string>[];
}) {
    const { user } = await requireRole('admin_geral');

    if (!payload.name?.trim()) return { error: 'Nome é obrigatório.' };
    if (!payload.headers?.length) return { error: 'CSV sem cabeçalhos.' };
    if (!payload.rows?.length) return { error: 'CSV sem linhas.' };

    const supabase = await createClient();

    const { data: imp, error: impErr } = await supabase
        .from('jj_lab_imports')
        .insert({
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            filename: payload.filename || null,
            separator: payload.separator || null,
            headers: payload.headers,
            total_rows: payload.rows.length,
            created_by: user.id,
        })
        .select()
        .single();

    if (impErr || !imp) {
        console.error('createImport (parent) error', impErr);
        return { error: 'Erro ao criar import: ' + (impErr?.message ?? 'desconhecido') };
    }

    const batchSize = 500;
    for (let i = 0; i < payload.rows.length; i += batchSize) {
        const slice = payload.rows.slice(i, i + batchSize).map((row, idx) => ({
            import_id: imp.id,
            row_index: i + idx,
            data: row,
        }));
        const { error: rowsErr } = await supabase.from('jj_lab_raw_rows').insert(slice);
        if (rowsErr) {
            console.error('createImport (rows) error', rowsErr);
            await supabase.from('jj_lab_imports').delete().eq('id', imp.id);
            return { error: 'Erro ao salvar linhas: ' + rowsErr.message };
        }
    }

    revalidatePath('/admin/dashboard/catalogo-jiu-jitsu');
    return { success: true, id: imp.id };
}

export async function deleteImport(id: string) {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { error } = await supabase.from('jj_lab_imports').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir.' };
    revalidatePath('/admin/dashboard/catalogo-jiu-jitsu');
    return { success: true };
}

export async function listNotes(importId: string): Promise<JjLabNote[]> {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('jj_lab_notes')
        .select('*')
        .eq('import_id', importId)
        .order('created_at', { ascending: false });
    if (error) return [];
    return data as JjLabNote[];
}

export async function addNote(importId: string, content: string) {
    const { user } = await requireRole('admin_geral');
    if (!content?.trim()) return { error: 'Conteúdo vazio.' };
    const supabase = await createClient();
    const { error } = await supabase.from('jj_lab_notes').insert({
        import_id: importId,
        author_id: user.id,
        content: content.trim(),
    });
    if (error) return { error: 'Erro ao salvar nota.' };
    revalidatePath(`/admin/dashboard/catalogo-jiu-jitsu/${importId}`);
    return { success: true };
}

export async function deleteNote(id: string, importId: string) {
    await requireRole('admin_geral');
    const supabase = await createClient();
    const { error } = await supabase.from('jj_lab_notes').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir nota.' };
    revalidatePath(`/admin/dashboard/catalogo-jiu-jitsu/${importId}`);
    return { success: true };
}

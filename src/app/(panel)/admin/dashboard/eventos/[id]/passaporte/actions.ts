'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    return profile?.role === 'admin_geral';
}

export async function updatePassportColorAction(
    eventId: string,
    from: string | null,
    via: string | null,
): Promise<{ success?: boolean; error?: string }> {
    if (!(await checkAdmin())) return { error: 'Não autorizado.' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('events')
        .update({ passport_bg_from: from, passport_bg_via: via })
        .eq('id', eventId);

    if (error) return { error: 'Erro ao salvar cor do passaporte.' };

    revalidatePath(`/admin/dashboard/eventos/${eventId}/passaporte`);
    return { success: true };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function registerMasterAction(formData: FormData) {
    const { user } = await requireRole('atleta');
    const supabase = await createClient();

    const masterName = formData.get('master_name') as string;
    const tenantId = formData.get('tenant_id') as string | null;
    const gymName = formData.get('gym_name') as string | null;

    if (!masterName || masterName.trim().length < 2) {
        return { error: 'O nome do mestre deve ter pelo menos 2 caracteres.' };
    }

    const updatePayload: any = {
        master_name: masterName.trim(),
        master_id: null
    };

    if (gymName) updatePayload.gym_name = gymName;

    const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

    if (error) {
        console.error('registerMasterAction error:', error);
        return { error: 'Erro ao cadastrar mestre. Tente novamente.' };
    }

    revalidatePath('/atleta/dashboard/perfil');
    redirect('/atleta/dashboard/perfil?step=2');
}

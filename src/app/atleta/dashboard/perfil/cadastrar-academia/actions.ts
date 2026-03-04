'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function registerGymAction(formData: FormData) {
    const { user } = await requireRole('atleta');
    const supabase = await createClient();

    const gymName = formData.get('gym_name') as string;
    const masterName = formData.get('master_name') as string;

    if (!gymName || gymName.trim().length < 2) {
        return { error: 'O nome da academia deve ter pelo menos 2 caracteres.' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            gym_name: gymName.trim(),
            master_name: masterName?.trim() || null,
            // Reset IDs if they were set to something else
            tenant_id: null,
            master_id: null
        })
        .eq('id', user.id);

    if (error) {
        console.error('registerGymAction error:', error);
        return { error: 'Erro ao cadastrar academia. Tente novamente.' };
    }

    revalidatePath('/atleta/dashboard/perfil');
    redirect('/atleta/dashboard/perfil?step=2');
}

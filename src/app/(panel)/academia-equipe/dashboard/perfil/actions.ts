'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function updateAcademiaProfile(formData: FormData) {
    try {
        const { user } = await requireRole(['academia/equipe', 'admin_geral']);
        const admin = createAdminClient();

        const fullName = formData.get('fullName') as string;
        const cpf = formData.get('cpf') as string;

        if (!fullName) {
            return { error: 'O nome é obrigatório.' };
        }

        // Clean CPF/CNPJ (remove non-digits) before saving
        const rawCpf = cpf ? cpf.replace(/\D/g, '') : null;

        const { error } = await admin
            .from('profiles')
            .update({
                full_name: fullName,
                cpf: rawCpf,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating academia profile:', error);
            if (error.code === '23505') return { error: 'Este CPF/CNPJ já está cadastrado em outra conta.' };
            return { error: 'Ocorreu um erro ao atualizar o perfil: ' + error.message };
        }

        revalidatePath('/academia-equipe/dashboard/perfil');
        return { success: true };
    } catch (error) {
        console.error('Failed to update academia profile:', error);
        return { error: 'Não autorizado.' };
    }
}

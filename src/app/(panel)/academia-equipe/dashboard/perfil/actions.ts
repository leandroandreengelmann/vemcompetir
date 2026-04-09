'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function updateAcademiaProfile(formData: FormData) {
    try {
        const { user } = await requireRole(['academia/equipe', 'admin_geral']);
        const admin = createAdminClient();

        const gymName = formData.get('gymName') as string;
        const email = formData.get('email') as string | null;
        const cpf = formData.get('cpf') as string;
        const phone = formData.get('phone') as string;

        const rawCpf = cpf ? cpf.replace(/\D/g, '') : null;
        const rawPhone = phone ? phone.replace(/\D/g, '') : null;

        const { error } = await admin
            .from('profiles')
            .update({
                gym_name: gymName || null,
                cpf: rawCpf,
                phone: rawPhone,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating academia profile:', error);
            if (error.code === '23505') return { error: 'Este CPF/CNPJ já está cadastrado em outra conta.' };
            return { error: 'Ocorreu um erro ao atualizar o perfil: ' + error.message };
        }

        let emailChanged = false;
        if (email && email !== user.email) {
            const supabase = await createClient();
            const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
            if (authError) {
                console.error('Update email error:', authError);
                return { error: 'Erro ao tentar atualizar o e-mail. Verifique se ele já não está em uso por outra conta.' };
            }
            emailChanged = true;
        }

        revalidatePath('/academia-equipe/dashboard/perfil');
        return { success: true, emailChanged };
    } catch (error) {
        console.error('Failed to update academia profile:', error);
        return { error: 'Não autorizado.' };
    }
}


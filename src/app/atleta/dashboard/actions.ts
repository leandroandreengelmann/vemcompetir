'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

export async function updateAthleteProfile(formData: FormData) {
    const user = await requireAuth();
    const supabase = await createClient();
    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string | null;
    const weight = formData.get('weight') ? Number(formData.get('weight')) : null;
    const birthDate = formData.get('birth_date') as string;
    const beltColor = formData.get('belt_color') as string;
    const cpf = formData.get('cpf') as string ? (formData.get('cpf') as string).replace(/\D/g, '') : null;
    const phone = formData.get('phone') as string ? (formData.get('phone') as string).replace(/\D/g, '') : null;
    const sexo = formData.get('sexo') as string | null;

    // These fields are optionally filled if the user is a "community suggestion"
    // but we MUST NOT update tenant_id or master_id here for regular users.
    const gymName = formData.get('gym_name') as string | null;
    const masterName = formData.get('master_name') as string | null;

    if (!fullName || fullName.trim().length < 3) {
        return { error: 'O nome deve ter pelo menos 3 caracteres.' };
    }

    // CPF validation if provided
    if (cpf && cpf.length > 0) {
        // Simple length check, full validation on frontend
        if (cpf.length !== 11) {
            return { error: 'CPF inválido.' };
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName.trim(),
            weight,
            birth_date: birthDate || null,
            belt_color: beltColor,
            gym_name: gymName || null,
            master_name: masterName || null,
            cpf,
            phone,
            sexo,
        })
        .eq('id', user.id);

    if (error) {
        console.error('Update profile error:', error);
        if (error.code === '23505') return { error: 'Este CPF já está cadastrado em outra conta.' };
        return { error: 'Ocorreu um erro ao atualizar o perfil.' };
    }

    if (email && email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
        if (authError) {
            console.error('Update email error:', authError);
            return { error: 'Erro ao tentar atualizar o e-mail. Verifique se ele já não está em uso por outra conta.' };
        }
    }

    revalidatePath('/atleta/dashboard');
    revalidatePath('/atleta/dashboard/perfil');
    return { success: true };
}

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/');
    return { success: true };
}

export async function searchGyms(query: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('search_gyms_optimized', {
        search_term: query
    });

    if (error) {
        console.error('Error in searchGyms:', error);
        return { official: [], community: [] };
    }

    return data as {
        official: { id: string, name: string }[],
        community: string[]
    };
}

export async function searchMasters(query: string, tenantId?: string, gymName?: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('search_masters_optimized', {
        search_term: query,
        p_tenant_id: tenantId || null,
        p_gym_name: gymName || null
    });

    if (error) {
        console.error('Error in searchMasters:', error);
        return { official: [], community: [] };
    }

    return data as {
        official: { id: string, full_name: string }[],
        community: string[]
    };
}

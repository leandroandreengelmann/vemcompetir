'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createOrganizerAction(formData: FormData) {
    await requireRole('admin_geral');

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;

    if (!email || !password || !full_name) return;

    const adminClient = createAdminClient();

    await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'organizador',
            full_name,
        },
        email_confirm: true,
    });

    revalidatePath('/admin/dashboard/users');
}

export async function createGymAction(formData: FormData) {
    await requireRole('admin_geral');

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const gym_name = formData.get('gym_name') as string;

    if (!email || !password || !gym_name) return;

    const adminClient = createAdminClient();

    await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'academia',
            gym_name,
            full_name: gym_name,
        },
        email_confirm: true,
    });

    revalidatePath('/admin/dashboard/users');
}

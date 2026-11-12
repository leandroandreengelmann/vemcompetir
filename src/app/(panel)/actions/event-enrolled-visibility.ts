'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Liga/desliga a exibição dos atletas inscritos em cada categoria do evento.
 * Permitido ao admin geral e à equipe organizadora (tenant dono do evento).
 */
export async function setShowEnrolledAthletesAction(eventId: string, show: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    const adminClient = createAdminClient();
    const { data: event } = await adminClient
        .from('events')
        .select('id, tenant_id')
        .eq('id', eventId)
        .single();

    if (!event) return { error: 'Evento não encontrado.' };

    const isAdmin = profile?.role === 'admin_geral';
    const isOrganizer = !!profile?.tenant_id && profile.role !== 'atleta' && profile.tenant_id === event.tenant_id;
    if (!isAdmin && !isOrganizer) return { error: 'Não autorizado.' };

    const { error } = await adminClient
        .from('events')
        .update({ show_enrolled_athletes: show })
        .eq('id', eventId);

    if (error) {
        console.error('Erro ao alterar exibição de inscritos:', error);
        return { error: 'Erro ao salvar a configuração.' };
    }

    revalidatePath(`/academia-equipe/dashboard/eventos/${eventId}`, 'page');
    revalidatePath('/admin/dashboard/eventos/[id]/editar', 'page');
    return { success: true };
}

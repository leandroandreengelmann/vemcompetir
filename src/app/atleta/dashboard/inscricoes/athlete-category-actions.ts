'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function athleteChangeCategoryAction(
    registrationId: string,
    newCategoryId: string,
) {
    const { user } = await requireRole('atleta');
    const adminClient = createAdminClient();

    // Load registration
    const { data: reg, error: regError } = await adminClient
        .from('event_registrations')
        .select(`
            id,
            status,
            athlete_id,
            category_id,
            event_id,
            event:events!event_id (
                event_date,
                category_change_deadline_days
            )
        `)
        .eq('id', registrationId)
        .single();

    if (regError || !reg) return { error: 'Inscrição não encontrada.' };

    // Security: must be the athlete's own registration
    if (reg.athlete_id !== user.id) {
        return { error: 'Sem permissão para alterar esta inscrição.' };
    }

    const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;

    // Only paid registrations
    const paidStatuses = ['pago', 'paga', 'confirmado', 'isento'];
    if (!paidStatuses.includes(reg.status)) {
        return { error: 'Só é possível trocar categoria de inscrições pagas ou confirmadas.' };
    }

    // Check deadline
    const deadlineDays = event?.category_change_deadline_days ?? 0;
    if (deadlineDays === 0) {
        return { error: 'Este evento não permite troca de categoria.' };
    }

    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);

    if (today > deadlineDate) {
        return { error: `Prazo para troca de categoria encerrado em ${deadlineDate.toLocaleDateString('pt-BR')}.` };
    }

    // Cannot change to same category
    if (reg.category_id === newCategoryId) {
        return { error: 'A categoria selecionada é a mesma da inscrição atual.' };
    }

    // Update registration
    const { error: updateError } = await adminClient
        .from('event_registrations')
        .update({ category_id: newCategoryId })
        .eq('id', registrationId);

    if (updateError) return { error: 'Erro ao atualizar categoria.' };

    // Insert audit record
    await adminClient
        .from('registration_category_changes')
        .insert({
            registration_id: registrationId,
            changed_by: user.id,
            old_category_id: reg.category_id,
            new_category_id: newCategoryId,
        });

    revalidatePath('/atleta/dashboard/inscricoes');
    return { success: true };
}

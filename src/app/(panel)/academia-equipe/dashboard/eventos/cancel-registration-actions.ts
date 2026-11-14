'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantScope } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatFullCategoryName } from '@/lib/category-utils';
import { CANCELLED_STATUSES_LIST, getCancellationInfoMap, type CancellationInfo } from '@/lib/registration-cancellation';

// Cancelamento de inscrição pelo ORGANIZADOR do evento.
// - Motivo obrigatório; grava em registration_status_history (quem, quando, por quê).
// - Usa o status 'cancelado' (o índice uq_event_registrations_active libera o atleta
//   para se inscrever de novo na mesma categoria).
// - Só inscrições confirmadas: pendentes expiram sozinhas e um Pix pago depois
//   reativaria a inscrição pelo webhook.
// - Cancela junto a "2ª categoria grátis" vinculada (promo_source_id).
// - Não devolve dinheiro: estorno é feito por fora.

const CANCELLABLE_STATUSES = ['pago', 'paga', 'confirmado', 'agendado', 'isento', 'isento_evento_proprio', 'pago_em_mao', 'pix_direto'];
const MIN_REASON_LENGTH = 5;

export async function cancelRegistrationByOrganizerAction(input: { registrationId: string; reason: string }) {
    try {
        const { user, tenant_id } = await requireTenantScope();
        const reason = (input.reason ?? '').trim();
        if (reason.length < MIN_REASON_LENGTH) {
            return { error: 'Informe o motivo do cancelamento.' };
        }

        const admin = createAdminClient();
        const { data: reg } = await admin
            .from('event_registrations')
            .select('id, event_id, status, price, manual_amount, event:events!event_id(tenant_id)')
            .eq('id', input.registrationId)
            .single();

        if (!reg) return { error: 'Inscrição não encontrada.' };
        if ((reg as any).event?.tenant_id !== tenant_id) {
            return { error: 'Só o organizador do evento pode cancelar esta inscrição.' };
        }
        if (CANCELLED_STATUSES_LIST.includes(reg.status)) {
            return { error: 'Esta inscrição já está cancelada.' };
        }
        if (!CANCELLABLE_STATUSES.includes(reg.status)) {
            return { error: 'Só é possível cancelar inscrições confirmadas. Inscrições pendentes expiram sozinhas.' };
        }

        // Inscrição principal + 2ª categoria grátis ligada a ela
        const { data: companions } = await admin
            .from('event_registrations')
            .select('id, status, price')
            .eq('promo_source_id', reg.id)
            .in('status', CANCELLABLE_STATUSES);

        const targets = [
            { id: reg.id, status: reg.status, price: Number(reg.price ?? 0) },
            ...((companions ?? []) as any[]).map(c => ({ id: c.id, status: c.status, price: Number(c.price ?? 0) })),
        ];

        const now = new Date().toISOString();
        const { error: updErr } = await admin
            .from('event_registrations')
            .update({ status: 'cancelado', updated_at: now })
            .in('id', targets.map(t => t.id));

        if (updErr) return { error: 'Falha ao cancelar: ' + updErr.message };

        await admin.from('registration_status_history').insert(
            targets.map(t => ({
                registration_id: t.id,
                from_status: t.status,
                to_status: 'cancelado',
                from_price: t.price,
                to_price: t.price,
                reason: t.id === reg.id ? reason : `${reason} (categoria grátis vinculada)`,
                changed_by: user.id,
                tenant_id,
            })),
        );

        revalidatePath(`/academia-equipe/dashboard/eventos/${reg.event_id}/relatorios/inscricoes`);
        revalidatePath('/academia-equipe/dashboard');
        revalidatePath('/academia-equipe/dashboard/financeiro/status');
        return { success: true, cancelledCount: targets.length };
    } catch (err: any) {
        return { error: err?.message ?? 'Erro inesperado.' };
    }
}

export interface CancellationProofData {
    issuedAt: string;
    tenantName: string | null;
    registrationNumber: number | null;
    event: { title: string; date: string | null; location: string | null };
    athlete: { name: string; cpf: string | null; beltColor: string | null; gymName: string | null };
    categoryTitle: string;
    amount: number;
    cancellation: CancellationInfo;
}

export async function getCancellationProofDataAction(registrationId: string): Promise<{ data: CancellationProofData } | { error: string }> {
    const { tenant_id } = await requireTenantScope();
    const admin = createAdminClient();

    const { data: r } = await admin
        .from('event_registrations')
        .select(`
            id, status, price, manual_amount, registration_number, tenant_id,
            event:events!event_id (tenant_id, title, event_date, location, address_city, address_state),
            category:category_rows!category_id (categoria_completa, faixa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            athlete:profiles!athlete_id (full_name, cpf, belt_color, gym_name)
        `)
        .eq('id', registrationId)
        .single();

    if (!r) return { error: 'Inscrição não encontrada.' };
    const reg = r as any;
    if (reg.event?.tenant_id !== tenant_id && reg.tenant_id !== tenant_id) {
        return { error: 'Sem permissão para emitir este comprovante.' };
    }
    if (!CANCELLED_STATUSES_LIST.includes(reg.status)) {
        return { error: 'Esta inscrição não está cancelada.' };
    }

    const info = (await getCancellationInfoMap(admin, [registrationId]))[registrationId];
    if (!info) return { error: 'Não há registro de quem cancelou esta inscrição.' };

    const { data: tenant } = await admin.from('tenants').select('name').eq('id', reg.event?.tenant_id).maybeSingle();
    const location = [reg.event?.address_city, reg.event?.address_state].filter(Boolean).join(' - ') || reg.event?.location || null;

    return {
        data: {
            issuedAt: new Date().toISOString(),
            tenantName: tenant?.name ?? null,
            registrationNumber: reg.registration_number ?? null,
            event: { title: reg.event?.title ?? 'Evento', date: reg.event?.event_date ?? null, location },
            athlete: {
                name: reg.athlete?.full_name ?? 'Atleta',
                cpf: reg.athlete?.cpf ?? null,
                beltColor: reg.athlete?.belt_color ?? null,
                gymName: reg.athlete?.gym_name ?? null,
            },
            categoryTitle: formatFullCategoryName({
                categoria_completa: reg.category?.categoria_completa,
                faixa: reg.category?.faixa,
                divisao: reg.category?.divisao_idade,
                categoria_peso: reg.category?.categoria_peso,
                peso_min_kg: reg.category?.peso_min_kg,
                peso_max_kg: reg.category?.peso_max_kg,
            }),
            amount: Number(reg.manual_amount ?? reg.price ?? 0),
            cancellation: info,
        },
    };
}

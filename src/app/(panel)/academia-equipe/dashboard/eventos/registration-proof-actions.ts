'use server';

import { requireTenantScope } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatFullCategoryName } from '@/lib/category-utils';

// Comprovante de inscrição — documento que prova que o atleta está inscrito.
// Diferente do recibo (financeiro/recibos), que só existe quando entrou dinheiro.
// Serve tanto para PIX direto na conta quanto para cortesia.

export interface RegistrationProofItem {
    registrationId: string;
    registrationNumber: number | null;
    registrationCode: string | null;
    categoryTitle: string;
    amount: number;
    status: string;
}

export interface RegistrationProofData {
    issuedAt: string;
    tenantName: string | null;
    event: {
        title: string;
        date: string | null;
        location: string | null;
    };
    athlete: {
        name: string;
        cpf: string | null;
        beltColor: string | null;
        gymName: string | null;
        masterName: string | null;
    };
    payment: {
        methodLabel: string;
        isCourtesy: boolean;
        notes: string | null;
        total: number;
        donatedTotal: number;
    };
    items: RegistrationProofItem[];
}

type ProofResult = { data: RegistrationProofData } | { error: string };

function paymentMethodLabel(reg: any): string {
    if (reg.is_courtesy || reg.status === 'isento') return 'Cortesia — inscrição doada';
    if (reg.manual_payment_method === 'pix_direto') return 'PIX direto na conta da academia';
    if (reg.status === 'pago' || reg.status === 'confirmado') return 'PIX';
    if (reg.status === 'aguardando_pagamento') return 'Aguardando pagamento';
    return 'A definir';
}

export async function getRegistrationProofDataAction(
    registrationIds: string[],
): Promise<ProofResult> {
    const { tenant_id } = await requireTenantScope();

    if (!registrationIds.length) return { error: 'Nenhuma inscrição informada.' };

    const admin = createAdminClient();

    const { data: regs, error } = await admin
        .from('event_registrations')
        .select(`
            id,
            status,
            price,
            manual_amount,
            manual_payment_method,
            manual_payment_notes,
            is_courtesy,
            registration_number,
            registration_code,
            tenant_id,
            athlete_id,
            event_id,
            event:events!event_id (
                tenant_id, title, event_date, location, address_city, address_state
            ),
            category:category_rows!category_id (
                categoria_completa, faixa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg
            ),
            athlete:profiles!athlete_id (full_name, cpf, belt_color, gym_name, master_name)
        `)
        .in('id', registrationIds);

    if (error || !regs || regs.length === 0) {
        console.error('getRegistrationProofDataAction error:', error);
        return { error: 'Inscrição não encontrada.' };
    }

    // Só a academia organizadora do evento (ou a que inscreveu) pode emitir o comprovante.
    const authorized = regs.every((r: any) =>
        r.event?.tenant_id === tenant_id || r.tenant_id === tenant_id
    );
    if (!authorized) return { error: 'Sem permissão para emitir este comprovante.' };

    // Um comprovante cobre um atleta em um evento.
    const first = regs[0] as any;
    const sameAthlete = regs.every((r: any) => r.athlete_id === first.athlete_id);
    const sameEvent = regs.every((r: any) => r.event_id === first.event_id);
    if (!sameAthlete || !sameEvent) {
        return { error: 'O comprovante deve ser de um único atleta em um único evento.' };
    }

    const { data: tenant } = await admin
        .from('tenants')
        .select('name')
        .eq('id', first.event?.tenant_id ?? tenant_id)
        .maybeSingle();

    const event = first.event ?? {};
    const athlete = first.athlete ?? {};

    const location = [event.address_city, event.address_state]
        .filter(Boolean).join(' - ') || event.location || null;

    const items: RegistrationProofItem[] = regs.map((r: any) => ({
        registrationId: r.id,
        registrationNumber: r.registration_number ?? null,
        registrationCode: r.registration_code ?? null,
        categoryTitle: formatFullCategoryName({
            categoria_completa: r.category?.categoria_completa,
            faixa: r.category?.faixa,
            divisao: r.category?.divisao_idade,
            categoria_peso: r.category?.categoria_peso,
            peso_min_kg: r.category?.peso_min_kg,
            peso_max_kg: r.category?.peso_max_kg,
        }),
        amount: Number(r.manual_amount ?? r.price ?? 0),
        status: r.status,
    }));

    const isCourtesy = !!first.is_courtesy || first.status === 'isento';

    // Na cortesia o `price` fica preservado para medir quanto foi doado.
    const donatedTotal = isCourtesy
        ? regs.reduce((sum: number, r: any) => sum + Number(r.price ?? 0), 0)
        : 0;

    const total = isCourtesy ? 0 : items.reduce((sum, i) => sum + i.amount, 0);

    return {
        data: {
            issuedAt: new Date().toISOString(),
            tenantName: tenant?.name ?? null,
            event: {
                title: event.title ?? 'Evento',
                date: event.event_date ?? null,
                location,
            },
            athlete: {
                name: athlete.full_name ?? 'Atleta',
                cpf: athlete.cpf ?? null,
                beltColor: athlete.belt_color ?? null,
                gymName: athlete.gym_name ?? null,
                masterName: athlete.master_name ?? null,
            },
            payment: {
                methodLabel: paymentMethodLabel(first),
                isCourtesy,
                notes: first.manual_payment_notes ?? null,
                total,
                donatedTotal,
            },
            items,
        },
    };
}

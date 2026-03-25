'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type RegistrationDetail = {
    id: string;
    created_at: string;
    athlete_id: string;
    athlete_name: string;
    athlete_cpf: string;
    athlete_email: string;
    athlete_gym: string;
    category: string;
    status: string;
    price: number;
    payment_method: string | null;
    asaas_payment_id: string | null;
    fee_unit: number;
    organizer_value: number;
    exemption_reason: string | null;
    is_no_split: boolean;
};

export type EventFinanceiroDetail = {
    event: {
        id: string;
        title: string;
        event_date: string;
        organizer_name: string;
        status: string;
        fee_per_registration: number;
    };
    kpis: {
        paid_count: number;
        paid_amount: number;
        pending_count: number;
        pending_amount: number;
        cart_count: number;
        cart_amount: number;
        isento_count: number;
        platform_commission: number;
        organizer_revenue: number;
    };
    registrations: RegistrationDetail[];
};

function formatCPF(cpf: string): string {
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export async function getEventFinanceiroDetail(eventId: string): Promise<EventFinanceiroDetail | null> {
    const admin = createAdminClient();

    // Evento
    const { data: event } = await admin
        .from('events')
        .select('id, title, event_date, tenant_id, status')
        .eq('id', eventId)
        .single();

    if (!event) return null;

    // Taxa do evento
    const { data: eventFeeRow } = await admin
        .from('system_settings')
        .select('value')
        .eq('key', `event_tax_${eventId}`)
        .maybeSingle();

    const { data: defaultFeeRow } = !eventFeeRow
        ? await admin
            .from('system_settings')
            .select('value')
            .eq('key', 'own_event_registration_tax')
            .maybeSingle()
        : { data: null };

    const fee_per_registration = Number(eventFeeRow?.value ?? defaultFeeRow?.value ?? 5);

    // Organizador
    const { data: organizer } = await admin
        .from('profiles')
        .select('full_name, gym_name')
        .eq('tenant_id', event.tenant_id)
        .eq('is_master', true)
        .maybeSingle();

    // Inscrições com joins
    const { data: rawRegs } = await admin
        .from('event_registrations')
        .select(`
            id,
            created_at,
            status,
            price,
            payment_id,
            promo_type_applied,
            athlete:profiles!athlete_id(id, full_name, cpf, gym_name),
            category:category_rows!category_id(categoria_completa),
            payment:payments!payment_id(id, fee_unit_snapshot, fee_saas_gross_snapshot, payment_method, asaas_payment_id, status, is_authorized_free, is_no_split)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    // Emails via auth admin
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(authUsers.map(u => [u.id, u.email || '-']));

    const registrations: RegistrationDetail[] = (rawRegs || []).map((reg: any) => {
        const payment = reg.payment || null;
        const athlete = reg.athlete || null;

        // Motivo da isenção
        let exemption_reason: string | null = null;
        if (reg.promo_type_applied === 'free_second_registration') {
            exemption_reason = 'Promoção: 2ª categoria grátis';
        } else if (payment?.is_authorized_free && !reg.promo_type_applied) {
            exemption_reason = 'Categoria com taxa zero';
        } else if (reg.status === 'isento' && !reg.payment_id) {
            exemption_reason = 'Isenção manual';
        } else if (reg.status === 'isento' && reg.payment_id) {
            exemption_reason = 'Isenção via pagamento';
        }

        const price = Number(reg.price || 0);
        const fee_unit = Number(payment?.fee_unit_snapshot || 0);
        const rawAsaasId = payment?.asaas_payment_id || null;
        // Pagamentos gratuitos têm ID "free_xxx" — não é um ID real do Asaas
        const asaas_payment_id = rawAsaasId?.startsWith('free_') ? null : rawAsaasId;

        return {
            id: reg.id,
            created_at: reg.created_at,
            athlete_id: athlete?.id || '',
            athlete_name: athlete?.full_name || 'Desconhecido',
            athlete_cpf: athlete?.cpf ? formatCPF(athlete.cpf) : '-',
            athlete_email: athlete?.id ? (emailMap.get(athlete.id) || '-') : '-',
            athlete_gym: athlete?.gym_name || '-',
            category: reg.category?.categoria_completa || '-',
            status: reg.status,
            price,
            payment_method: payment?.payment_method || null,
            asaas_payment_id,
            fee_unit,
            organizer_value: price - fee_unit,
            exemption_reason,
            is_no_split: payment?.is_no_split || false,
        };
    });

    // KPIs — comissão a partir de pagamentos únicos confirmados
    const paid = registrations.filter(r => ['pago', 'confirmado'].includes(r.status));
    const pending = registrations.filter(r => ['aguardando_pagamento', 'pendente'].includes(r.status));
    const cart = registrations.filter(r => r.status === 'carrinho');
    const isento = registrations.filter(r => r.status === 'isento');

    // Soma fee_saas_gross_snapshot por payment único (evita dupla contagem quando há várias inscrições no mesmo pagamento)
    const seenPaymentIds = new Set<string>();
    let platform_commission = 0;
    for (const reg of rawRegs || []) {
        const p = (reg as any).payment;
        if (p?.id && p.status === 'PAID' && !seenPaymentIds.has(p.id)) {
            seenPaymentIds.add(p.id);
            platform_commission += Number(p.fee_saas_gross_snapshot || 0);
        }
    }

    const paid_amount = paid.reduce((s, r) => s + r.price, 0);

    return {
        event: {
            id: event.id,
            title: event.title,
            event_date: event.event_date,
            organizer_name: organizer?.gym_name || organizer?.full_name || 'Desconhecido',
            status: event.status,
            fee_per_registration,
        },
        kpis: {
            paid_count: paid.length,
            paid_amount,
            pending_count: pending.length,
            pending_amount: pending.reduce((s, r) => s + r.price, 0),
            cart_count: cart.length,
            cart_amount: cart.reduce((s, r) => s + r.price, 0),
            isento_count: isento.length,
            platform_commission,
            organizer_revenue: paid_amount - platform_commission,
        },
        registrations,
    };
}

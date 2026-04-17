'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireFinancialModule } from '@/lib/auth-guards';
import { classifyRegistration, fetchPaymentsMap } from '../actions/registration-classifier';
import { revalidatePath } from 'next/cache';

export type TransactionRow = {
    registration_id: string;
    event_id: string;
    event_title: string;
    event_date: string | null;
    athlete_id: string;
    athlete_name: string;
    athlete_cpf: string | null;
    athlete_gym: string | null;
    status: string;
    tipo: string;
    payer_type: string | null;
    manual_method: string | null;
    price: number;
    created_at: string;
    registration_number: number | null;
    has_receipt: boolean;
};

export async function listFinancialTransactions(filters: {
    search?: string;
    tipo?: string;
    eventId?: string;
    page?: number;
    from?: string | null;
    to?: string | null;
}) {
    const { tenant_id } = await requireFinancialModule();
    const adminSupabase = createAdminClient();

    const pageSize = 20;
    const page = filters.page || 1;

    const { data: ownedEvents } = await adminSupabase
        .from('events')
        .select('id, title, event_date')
        .eq('tenant_id', tenant_id);

    const eventMap = new Map<string, { title: string; event_date: string | null }>();
    (ownedEvents ?? []).forEach((e: any) => eventMap.set(e.id, { title: e.title, event_date: e.event_date }));
    const eventIds = Array.from(eventMap.keys());

    if (eventIds.length === 0) {
        return { data: [], count: 0, pageSize };
    }

    const hasSearch = !!filters.search;
    const needsPostFilter = filters.tipo && ['cortesia', 'pacote', 'evento_proprio', 'receita'].includes(filters.tipo);

    const EXCLUDED_STATUSES = ['carrinho', 'pendente', 'aguardando_pagamento'];

    let query = adminSupabase
        .from('event_registrations')
        .select(`
            id, event_id, athlete_id, status, price, payment_id, created_at, registration_number,
            manual_payment_method, is_courtesy, promo_type_applied,
            athlete:profiles!athlete_id${hasSearch ? '!inner' : ''}(full_name, cpf, gym_name)
        `, { count: needsPostFilter ? undefined : 'exact' })
        .in('event_id', filters.eventId ? [filters.eventId] : eventIds)
        .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`);

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    if (filters.tipo && filters.tipo !== 'todas' && !needsPostFilter) {
        if (filters.tipo === 'pago') {
            query = query.in('status', ['pago', 'paga', 'confirmado', 'pago_em_mao', 'pix_direto']);
        } else if (filters.tipo === 'agendado') {
            query = query.eq('status', 'agendado');
        }
    }

    if (needsPostFilter) {
        if (filters.tipo === 'receita') {
            query = query.in('status', ['pago', 'paga', 'confirmado', 'pago_em_mao', 'pix_direto', 'agendado']);
        } else {
            query = query.in('status', ['isento', 'isento_evento_proprio', 'pago_em_mao', 'pix_direto']);
        }
    }

    if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`, { referencedTable: 'athlete' });
    }

    if (needsPostFilter) {
        const { data: allData } = await query.order('created_at', { ascending: false });
        const allItems = allData || [];

        const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
        const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

        const filtered = allItems.filter((item: any) => {
            const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
            const { tipo } = classifyRegistration(item.status, payment, item.manual_payment_method, item.is_courtesy);
            if (filters.tipo === 'receita') {
                return ['pago', 'agendado', 'pago_em_mao', 'pix_direto'].includes(tipo);
            }
            if (filters.tipo === 'evento_proprio') {
                return tipo === 'evento_proprio' || tipo === 'isento_evento_proprio' || tipo === 'pago_em_mao' || tipo === 'pix_direto';
            }
            return tipo === filters.tipo;
        });

        const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);
        const rows = await enrichTransactions(adminSupabase, paginatedData, eventMap, paymentsMap);

        return { data: rows, count: filtered.length, pageSize };
    }

    const { data, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    const allItems = data || [];
    const paymentIds = [...new Set(allItems.filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
    const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);
    const rows = await enrichTransactions(adminSupabase, allItems, eventMap, paymentsMap);

    return { data: rows, count: count ?? 0, pageSize };
}

async function enrichTransactions(
    adminSupabase: any,
    items: any[],
    eventMap: Map<string, { title: string; event_date: string | null }>,
    paymentsMap: Record<string, any>,
): Promise<TransactionRow[]> {
    if (items.length === 0) return [];

    const registrationIds = items.map((r: any) => r.id);
    const { data: existingReceipts } = await adminSupabase
        .from('receipts')
        .select('source_id')
        .eq('source_type', 'event_registration')
        .in('source_id', registrationIds);

    const receiptSet = new Set((existingReceipts ?? []).map((r: any) => r.source_id));

    return items.map((item: any) => {
        const payment = item.payment_id ? paymentsMap[item.payment_id] : null;
        const { tipo, payer_type, manual_method } = classifyRegistration(
            item.status, payment, item.manual_payment_method, item.is_courtesy,
        );
        const ev = eventMap.get(item.event_id);
        return {
            registration_id: item.id,
            event_id: item.event_id,
            event_title: ev?.title ?? '—',
            event_date: ev?.event_date ?? null,
            athlete_id: item.athlete_id,
            athlete_name: item.athlete?.full_name ?? '—',
            athlete_cpf: item.athlete?.cpf ?? null,
            athlete_gym: item.athlete?.gym_name ?? null,
            status: item.status,
            tipo,
            payer_type,
            manual_method,
            price: Number(item.price || 0),
            created_at: item.created_at,
            registration_number: item.registration_number ?? null,
            has_receipt: receiptSet.has(item.id),
        };
    });
}

export async function getFinanceiroHubKpis(filters: { from?: string | null; to?: string | null }) {
    const { tenant_id } = await requireFinancialModule();
    const adminSupabase = createAdminClient();

    const { data: ownedEvents } = await adminSupabase
        .from('events')
        .select('id')
        .eq('tenant_id', tenant_id);

    const eventIds = (ownedEvents ?? []).map((e: any) => e.id);

    let totalRevenue = 0;
    let agendadoAmount = 0;
    let paidCount = 0;
    let agendadoCount = 0;

    if (eventIds.length > 0) {
        let regQuery = adminSupabase
            .from('event_registrations')
            .select('price, status, payment_id, manual_payment_method, is_courtesy, created_at')
            .in('event_id', eventIds)
            .not('status', 'in', '(carrinho,pendente,aguardando_pagamento)');

        if (filters.from) regQuery = regQuery.gte('created_at', filters.from);
        if (filters.to) regQuery = regQuery.lte('created_at', filters.to);

        const { data: regs } = await regQuery;
        const paymentIds = [...new Set((regs ?? []).filter((r: any) => r.payment_id).map((r: any) => r.payment_id))];
        const paymentsMap = await fetchPaymentsMap(adminSupabase, paymentIds);

        for (const reg of regs ?? []) {
            const price = Number(reg.price || 0);
            const payment = reg.payment_id ? paymentsMap[reg.payment_id] : null;
            const { tipo } = classifyRegistration(reg.status, payment, (reg as any).manual_payment_method, (reg as any).is_courtesy);

            if (tipo === 'pago' || tipo === 'pago_em_mao' || tipo === 'pix_direto') {
                paidCount++;
                totalRevenue += price;
            } else if (tipo === 'agendado') {
                agendadoCount++;
                agendadoAmount += price;
            }
        }
    }

    let receiptsQuery = adminSupabase
        .from('receipts')
        .select('id, amount', { count: 'exact' })
        .eq('tenant_id', tenant_id);

    if (filters.from) receiptsQuery = receiptsQuery.gte('issued_at', filters.from);
    if (filters.to) receiptsQuery = receiptsQuery.lte('issued_at', filters.to);

    const { data: receipts, count: receiptCount } = await receiptsQuery;
    const receiptsAmount = (receipts ?? []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    return {
        totalRevenue,
        agendadoAmount,
        paidCount,
        agendadoCount,
        receiptCount: receiptCount ?? 0,
        receiptsAmount,
    };
}

export async function listTenantEventsForFinanceiro() {
    const { tenant_id } = await requireFinancialModule();
    const supabase = await createClient();
    const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('tenant_id', tenant_id)
        .order('event_date', { ascending: false });
    return data ?? [];
}

export async function changeRegistrationStatusAction(input: {
    registrationId: string;
    newStatus: string;
    newPrice?: number;
    reason?: string;
}) {
    try {
        const { user, tenant_id } = await requireFinancialModule();
        const adminSupabase = createAdminClient();

        const { data: registration, error: regErr } = await adminSupabase
            .from('event_registrations')
            .select('id, event_id, status, price, tenant_id, athlete_id, events!inner(tenant_id)')
            .eq('id', input.registrationId)
            .single();

        if (regErr || !registration) {
            return { error: 'Inscrição não encontrada.' };
        }

        const eventTenantId = (registration as any).events?.tenant_id;
        if (eventTenantId !== tenant_id && registration.tenant_id !== tenant_id) {
            return { error: 'Inscrição fora do escopo da sua academia.' };
        }

        const fromStatus = registration.status;
        const fromPrice = Number(registration.price || 0);
        const toStatus = input.newStatus;
        const toPrice = typeof input.newPrice === 'number' ? input.newPrice : fromPrice;

        const allowed = ['pago', 'paga', 'confirmado', 'agendado', 'pendente', 'aguardando_pagamento',
            'pago_em_mao', 'pix_direto', 'isento', 'isento_evento_proprio', 'cancelada'];
        if (!allowed.includes(toStatus)) {
            return { error: 'Status inválido.' };
        }

        const { error: updateErr } = await adminSupabase
            .from('event_registrations')
            .update({ status: toStatus, price: toPrice, updated_at: new Date().toISOString() })
            .eq('id', input.registrationId);

        if (updateErr) {
            return { error: 'Falha ao alterar o status: ' + updateErr.message };
        }

        await adminSupabase.from('registration_status_history').insert({
            registration_id: input.registrationId,
            from_status: fromStatus,
            to_status: toStatus,
            from_price: fromPrice,
            to_price: toPrice,
            reason: input.reason ?? null,
            changed_by: user.id,
            tenant_id,
        });

        revalidatePath('/academia-equipe/dashboard/financeiro');
        revalidatePath('/academia-equipe/dashboard/financeiro/transacoes');
        revalidatePath('/academia-equipe/dashboard/financeiro/status');
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? 'Erro inesperado.' };
    }
}

export async function listRegistrationStatusHistory(filters: {
    page?: number;
    from?: string | null;
    to?: string | null;
}) {
    const { tenant_id } = await requireFinancialModule();
    const adminSupabase = createAdminClient();

    const pageSize = 30;
    const page = filters.page || 1;

    let query = adminSupabase
        .from('registration_status_history')
        .select(`
            id, registration_id, from_status, to_status, from_price, to_price, reason, created_at, changed_by,
            registration:event_registrations!registration_id(
                id, event_id,
                athlete:profiles!athlete_id(full_name, cpf),
                event:events!event_id(title)
            ),
            actor:profiles!changed_by(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenant_id);

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    return { data: data ?? [], count: count ?? 0, pageSize };
}

export type ReceiptPayload = {
    id: string;
    receipt_number: string;
    receipt_year: number;
    amount: number;
    description: string | null;
    payment_method: string | null;
    paid_at: string | null;
    issued_at: string;
    payer_name: string | null;
    payer_document: string | null;
    source_type: string;
    source_id: string;
    tenant_name: string | null;
    tenant_document: string | null;
    event_title: string | null;
    event_date: string | null;
};

export async function issueReceiptForRegistrationAction(input: {
    registrationId: string;
    payerName?: string;
    payerDocument?: string;
    paymentMethod?: string;
    paidAt?: string;
    description?: string;
    amountOverride?: number;
}): Promise<{ receipt?: ReceiptPayload; error?: string }> {
    try {
        const { user, tenant_id } = await requireFinancialModule();
        const adminSupabase = createAdminClient();

        const { data: registration } = await adminSupabase
            .from('event_registrations')
            .select(`
                id, event_id, price, athlete_id, tenant_id, status,
                athlete:profiles!athlete_id(full_name, cpf),
                event:events!event_id(title, tenant_id, event_date)
            `)
            .eq('id', input.registrationId)
            .single();

        if (!registration) return { error: 'Inscrição não encontrada.' };

        const eventTenant = (registration as any).event?.tenant_id;
        if (eventTenant !== tenant_id && registration.tenant_id !== tenant_id) {
            return { error: 'Inscrição fora do escopo da sua academia.' };
        }

        const amount = typeof input.amountOverride === 'number' ? input.amountOverride : Number(registration.price || 0);
        if (!(amount > 0)) {
            return { error: 'Não é possível emitir recibo para valor zero.' };
        }

        const { data: existing } = await adminSupabase
            .from('receipts')
            .select('id')
            .eq('source_type', 'event_registration')
            .eq('source_id', input.registrationId)
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        if (existing) {
            return { error: 'Já existe um recibo emitido para esta inscrição.' };
        }

        const year = new Date().getFullYear();
        const { data: numberData, error: numberErr } = await adminSupabase.rpc('next_receipt_number', {
            p_tenant_id: tenant_id,
            p_year: year,
        });
        if (numberErr || !numberData) {
            return { error: 'Não foi possível gerar o número do recibo.' };
        }

        const athlete = (registration as any).athlete;
        const event = (registration as any).event;
        const description = input.description ?? `Inscrição em ${event?.title ?? 'evento'}`;

        const { data: inserted, error: insertErr } = await adminSupabase
            .from('receipts')
            .insert({
                tenant_id,
                receipt_number: numberData,
                receipt_year: year,
                source_type: 'event_registration',
                source_id: input.registrationId,
                payer_name: input.payerName || athlete?.full_name || null,
                payer_document: input.payerDocument || athlete?.cpf || null,
                description,
                amount,
                payment_method: input.paymentMethod || null,
                paid_at: input.paidAt ?? null,
                issued_by: user.id,
                metadata: { event_id: registration.event_id, athlete_id: registration.athlete_id },
            })
            .select()
            .single();

        if (insertErr || !inserted) {
            return { error: 'Falha ao registrar o recibo: ' + (insertErr?.message ?? 'erro desconhecido') };
        }

        const { data: tenant } = await adminSupabase
            .from('tenants')
            .select('name')
            .eq('id', tenant_id)
            .single();

        revalidatePath('/academia-equipe/dashboard/financeiro');
        revalidatePath('/academia-equipe/dashboard/financeiro/recibos');
        revalidatePath('/academia-equipe/dashboard/financeiro/transacoes');

        return {
            receipt: {
                id: inserted.id,
                receipt_number: inserted.receipt_number,
                receipt_year: inserted.receipt_year,
                amount: Number(inserted.amount),
                description: inserted.description,
                payment_method: inserted.payment_method,
                paid_at: inserted.paid_at,
                issued_at: inserted.issued_at,
                payer_name: inserted.payer_name,
                payer_document: inserted.payer_document,
                source_type: inserted.source_type,
                source_id: inserted.source_id,
                tenant_name: tenant?.name ?? null,
                tenant_document: null,
                event_title: event?.title ?? null,
                event_date: event?.event_date ?? null,
            },
        };
    } catch (err: any) {
        return { error: err?.message ?? 'Erro inesperado.' };
    }
}

export async function listReceipts(filters: {
    search?: string;
    page?: number;
    from?: string | null;
    to?: string | null;
}) {
    const { tenant_id } = await requireFinancialModule();
    const adminSupabase = createAdminClient();

    const pageSize = 20;
    const page = filters.page || 1;

    let query = adminSupabase
        .from('receipts')
        .select(`
            id, receipt_number, receipt_year, amount, description, payment_method,
            paid_at, issued_at, payer_name, payer_document, source_type, source_id
        `, { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .order('issued_at', { ascending: false });

    if (filters.from) query = query.gte('issued_at', filters.from);
    if (filters.to) query = query.lte('issued_at', filters.to);

    if (filters.search) {
        query = query.or(`payer_name.ilike.%${filters.search}%,receipt_number.ilike.%${filters.search}%`);
    }

    const { data, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);

    return { data: data ?? [], count: count ?? 0, pageSize };
}

export async function getReceiptForDownload(receiptId: string): Promise<{ receipt?: ReceiptPayload; error?: string }> {
    try {
        const { tenant_id } = await requireFinancialModule();
        const adminSupabase = createAdminClient();

        const { data: receipt } = await adminSupabase
            .from('receipts')
            .select('*')
            .eq('id', receiptId)
            .eq('tenant_id', tenant_id)
            .single();

        if (!receipt) return { error: 'Recibo não encontrado.' };

        const { data: tenant } = await adminSupabase
            .from('tenants')
            .select('name')
            .eq('id', tenant_id)
            .single();

        let event_title: string | null = null;
        let event_date: string | null = null;
        if (receipt.source_type === 'event_registration') {
            const { data: reg } = await adminSupabase
                .from('event_registrations')
                .select('event:events!event_id(title, event_date)')
                .eq('id', receipt.source_id)
                .single();
            event_title = (reg as any)?.event?.title ?? null;
            event_date = (reg as any)?.event?.event_date ?? null;
        }

        return {
            receipt: {
                id: receipt.id,
                receipt_number: receipt.receipt_number,
                receipt_year: receipt.receipt_year,
                amount: Number(receipt.amount),
                description: receipt.description,
                payment_method: receipt.payment_method,
                paid_at: receipt.paid_at,
                issued_at: receipt.issued_at,
                payer_name: receipt.payer_name,
                payer_document: receipt.payer_document,
                source_type: receipt.source_type,
                source_id: receipt.source_id,
                tenant_name: tenant?.name ?? null,
                tenant_document: null,
                event_title,
                event_date,
            },
        };
    } catch (err: any) {
        return { error: err?.message ?? 'Erro inesperado.' };
    }
}

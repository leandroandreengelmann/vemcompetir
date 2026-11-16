'use server';

import { requireFinancialModule } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { classifyOrigin, splitCents, toCents } from '../../actions/registration-origin';
import type { AsaasPaymentRow } from './types';

const PAGE = 1000;
const ALLOWED = ['academia', 'organizador', 'academia/equipe', 'admin_geral'];

async function requireOwner() {
    const ctx = await requireFinancialModule();
    if (!ALLOWED.includes(ctx.profile.role)) throw new Error('Acesso restrito ao dono da academia.');
    return ctx;
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await build(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        out.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
    }
    return out;
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** Lista os pagamentos Asaas (1 linha por pagamento) com bruto, taxa e líquido. Mesmos filtros do detalhamento. */
export async function listAsaasPayments(filters: {
    eventId?: string | null;
    from?: string | null;
    to?: string | null;
}): Promise<AsaasPaymentRow[]> {
    const { tenant_id } = await requireOwner();
    const admin = createAdminClient();

    const { data: events } = await admin.from('events').select('id, title').eq('tenant_id', tenant_id);
    const titles = new Map((events ?? []).map((e: any) => [e.id as string, e.title as string]));
    const eventIds = filters.eventId ? [...titles.keys()].filter((id) => id === filters.eventId) : [...titles.keys()];
    if (eventIds.length === 0) return [];

    const regs = await fetchAll<any>((a, b) => {
        let q = admin
            .from('event_registrations')
            .select(
                'id, event_id, status, price, manual_amount, payment_id, is_courtesy, manual_payment_method, promo_type_applied, created_at, ' +
                'athlete:profiles!athlete_id(full_name), category:category_rows!category_id(categoria_completa)',
            )
            .in('event_id', eventIds)
            .not('payment_id', 'is', null)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(a, b);
        if (filters.from) q = q.gte('created_at', filters.from);
        if (filters.to) q = q.lte('created_at', filters.to);
        return q;
    });

    const paymentIds = [...new Set(regs.map((r) => r.payment_id as string))];
    const payments = new Map<string, any>();
    for (let i = 0; i < paymentIds.length; i += 200) {
        const { data } = await admin
            .from('payments')
            .select('id, asaas_payment_id, fee_pix_snapshot, qtd_inscricoes, payer_type, updated_at')
            .in('id', paymentIds.slice(i, i + 200));
        (data ?? []).forEach((p: any) => payments.set(p.id, p));
    }

    const groups = new Map<string, any[]>();
    for (const r of regs) {
        const payment = payments.get(r.payment_id) ?? null;
        const amountCents = toCents(r.manual_amount ?? r.price);
        if (classifyOrigin({ ...r, amountCents }, payment) !== 'asaas') continue;
        const list = groups.get(r.payment_id) ?? [];
        list.push({ r, amountCents });
        groups.set(r.payment_id, list);
    }

    const rows: AsaasPaymentRow[] = [];
    for (const [paymentId, list] of groups) {
        const p = payments.get(paymentId);
        const feeCents = p?.fee_pix_snapshot == null ? null : toCents(p.fee_pix_snapshot);
        const n = Math.max(Number(p?.qtd_inscricoes) || 0, list.length);
        const shares = feeCents == null ? [] : splitCents(feeCents, n);
        const grossCents = list.reduce((s, x) => s + x.amountCents, 0);
        rows.push({
            paymentId,
            asaasPaymentId: p?.asaas_payment_id ?? '—',
            date: p?.updated_at ?? list[0].r.created_at,
            grossCents,
            feeCents,
            netCents: feeCents == null ? null : grossCents - feeCents,
            situation: list.every((x) => x.r.status === 'agendado') ? 'Agendado' : 'Recebido',
            payerType: p?.payer_type === 'ACADEMY' ? 'Academia' : 'Atleta',
            eventTitle: titles.get(list[0].r.event_id) ?? '—',
            items: list.map((x, i) => ({
                registrationId: x.r.id,
                athleteName: one<any>(x.r.athlete)?.full_name ?? '—',
                category: one<any>(x.r.category)?.categoria_completa ?? '—',
                amountCents: x.amountCents,
                feeShareCents: feeCents == null ? null : shares[i] ?? 0,
            })),
        });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type PaymentReceiptResult =
    | {
          ok: true;
          asaasPaymentId: string;
          status: string | null;
          billingType: string | null;
          valueCents: number;
          netCents: number | null;
          feeCents: number | null;
          paymentDate: string | null;
          receiptUrl: string | null;
      }
    | { ok: false; error: string };

/** Comprovante de UM pagamento Asaas (sob demanda). Também devolve a taxa real (valor − netValue) direto do Asaas. */
export async function getAsaasPaymentReceiptAction(paymentId: string): Promise<PaymentReceiptResult> {
    try {
        const { tenant_id } = await requireOwner();
        const admin = createAdminClient();

        const { data: payment } = await admin
            .from('payments')
            .select('id, asaas_payment_id, tenant_id_organizer, event_id, event:events!event_id(tenant_id)')
            .eq('id', paymentId)
            .maybeSingle();
        if (!payment?.asaas_payment_id || payment.asaas_payment_id.startsWith('own_event_')) {
            return { ok: false, error: 'Este pagamento não tem cobrança no Asaas.' };
        }
        const eventTenant = one<any>((payment as any).event)?.tenant_id;
        if (eventTenant !== tenant_id && payment.tenant_id_organizer !== tenant_id) {
            return { ok: false, error: 'Pagamento fora do escopo da sua academia.' };
        }

        const organizer = payment.tenant_id_organizer ?? eventTenant;
        const { data: settings } = await admin
            .from('asaas_settings')
            .select('environment, api_key_encrypted, api_key_iv')
            .eq('is_enabled', true)
            .single();
        if (!settings) return { ok: false, error: 'Configuração do Asaas não encontrada.' };
        const baseUrl = settings.environment === 'production' ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';

        let apiKey = decrypt(settings.api_key_encrypted, settings.api_key_iv);
        if (organizer) {
            const { data: t } = await admin
                .from('tenants')
                .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
                .eq('id', organizer)
                .single();
            if (t?.use_own_asaas_api && t.asaas_api_key_encrypted && t.asaas_api_key_iv) {
                apiKey = decrypt(t.asaas_api_key_encrypted, t.asaas_api_key_iv);
            }
        }

        const res = await fetch(`${baseUrl}/v3/payments/${payment.asaas_payment_id}`, {
            headers: { access_token: apiKey },
            cache: 'no-store',
        });
        if (!res.ok) return { ok: false, error: 'Não foi possível consultar o Asaas agora. Tente novamente em instantes.' };
        const d = await res.json();

        const valueCents = toCents(d.value);
        const netCents = typeof d.netValue === 'number' ? toCents(d.netValue) : null;
        return {
            ok: true,
            asaasPaymentId: payment.asaas_payment_id,
            status: d.status ?? null,
            billingType: d.billingType ?? null,
            valueCents,
            netCents,
            feeCents: netCents == null ? null : valueCents - netCents,
            paymentDate: d.paymentDate ?? d.confirmedDate ?? null,
            receiptUrl: d.transactionReceiptUrl ?? null,
        };
    } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Erro inesperado.' };
    }
}

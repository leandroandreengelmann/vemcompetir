'use server';

import { requireFinancialModule } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/crypto';
import { classifyOrigin, splitCents, toCents, type Origin } from '../../actions/registration-origin';
import type { Detalhamento, OriginRow } from './types';

const ORIGINS: Origin[] = ['asaas', 'pix_academia', 'dinheiro', 'por_fora', 'cortesia', 'gratis', 'pacote', 'pendente'];
const ZERO_VALUE: Origin[] = ['cortesia', 'gratis', 'pacote'];
const PAGE = 1000; // limite padrão do PostgREST: paginamos para não truncar silenciosamente

async function requireOwner() {
    const ctx = await requireFinancialModule();
    // Somente o dono da academia/organizador (não a equipe). Ajustar aqui se o papel mudar.
    if (!['academia', 'organizador'].includes(ctx.profile.role)) {
        throw new Error('Acesso restrito ao dono da academia.');
    }
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

async function computeDetalhamento(
    tenantId: string,
    filters: { eventId?: string | null; from?: string | null; to?: string | null },
): Promise<Detalhamento> {
    const admin = createAdminClient();

    const { data: events } = await admin.from('events').select('id').eq('tenant_id', tenantId);
    const owned = (events ?? []).map((e: any) => e.id as string);
    const eventIds = filters.eventId ? owned.filter((id) => id === filters.eventId) : owned;

    const rows = new Map<Origin, OriginRow>(
        ORIGINS.map((o) => [o, { origin: o, count: 0, amountCents: 0, feeCents: 0, feeMissingCount: 0 }]),
    );

    const regs = eventIds.length === 0 ? [] : await fetchAll<any>((a, b) => {
        let q = admin
            .from('event_registrations')
            .select('id, status, price, manual_amount, payment_id, is_courtesy, manual_payment_method, promo_type_applied, created_at')
            .in('event_id', eventIds)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(a, b);
        if (filters.from) q = q.gte('created_at', filters.from);
        if (filters.to) q = q.lte('created_at', filters.to);
        return q;
    });

    const paymentIds = [...new Set(regs.filter((r) => r.payment_id).map((r) => r.payment_id as string))];
    const payments = new Map<string, any>();
    for (let i = 0; i < paymentIds.length; i += 200) {
        const { data } = await admin
            .from('payments')
            .select('id, asaas_payment_id, fee_pix_snapshot, qtd_inscricoes')
            .in('id', paymentIds.slice(i, i + 200));
        (data ?? []).forEach((p: any) => payments.set(p.id, p));
    }

    // Taxa do Asaas é por pagamento: rateia entre as inscrições do mesmo pagamento.
    const feeByReg = new Map<string, number | null>();
    const asaasByPayment = new Map<string, any[]>();
    const classified = regs.map((r) => {
        const payment = r.payment_id ? payments.get(r.payment_id) ?? null : null;
        const amountCents = toCents(r.manual_amount ?? r.price);
        const origin = classifyOrigin({ ...r, amountCents }, payment);
        if (origin === 'asaas' && r.payment_id) {
            const list = asaasByPayment.get(r.payment_id) ?? [];
            list.push(r);
            asaasByPayment.set(r.payment_id, list);
        }
        return { r, origin, amountCents };
    });
    for (const [paymentId, list] of asaasByPayment) {
        const p = payments.get(paymentId);
        if (p?.fee_pix_snapshot == null) {
            list.forEach((r) => feeByReg.set(r.id, null));
            continue;
        }
        const n = Math.max(Number(p.qtd_inscricoes) || 0, list.length);
        const parts = splitCents(toCents(p.fee_pix_snapshot), n);
        list.forEach((r, i) => feeByReg.set(r.id, parts[i] ?? 0));
    }

    for (const { r, origin, amountCents } of classified) {
        if (!origin) continue;
        const row = rows.get(origin)!;
        row.count++;
        row.amountCents += ZERO_VALUE.includes(origin) ? 0 : amountCents;
        if (origin === 'asaas') {
            const fee = feeByReg.get(r.id);
            if (fee == null) row.feeMissingCount++;
            else row.feeCents += fee;
        }
    }

    const asaas = rows.get('asaas')!;
    const outsideCents = (['pix_academia', 'dinheiro', 'por_fora'] as Origin[]).reduce(
        (s, o) => s + rows.get(o)!.amountCents,
        0,
    );
    const asaasNetCents = asaas.amountCents - asaas.feeCents;
    const netCents = asaasNetCents + outsideCents;

    // Tokens (só para academias com gestão por token)
    const { data: tenant } = await admin
        .from('tenants')
        .select('token_management_enabled')
        .eq('id', tenantId)
        .single();
    const enabled = !!tenant?.token_management_enabled;
    let consumed = 0;
    let unitPriceCents: number | null = null;
    if (enabled) {
        const tx = await fetchAll<any>((a, b) => {
            let q = admin
                .from('token_transactions')
                .select('amount, type, created_at')
                .eq('tenant_id', tenantId)
                .in('type', ['consumed', 'refunded'])
                .order('created_at', { ascending: true })
                .range(a, b);
            if (filters.eventId) q = q.eq('event_id', filters.eventId);
            if (filters.from) q = q.gte('created_at', filters.from);
            if (filters.to) q = q.lte('created_at', filters.to);
            return q;
        });
        // consumed tem amount negativo e refunded positivo: o líquido consumido é -Σ amount
        consumed = tx.reduce((s, t) => s - Number(t.amount), 0);

        // preço médio dos pacotes comprados pela academia (até existir preço configurado no admin)
        const { data: grants } = await admin
            .from('token_transactions')
            .select('token_packages(price_cents, token_count)')
            .eq('tenant_id', tenantId)
            .eq('type', 'granted')
            .not('token_package_id', 'is', null);
        let price = 0;
        let count = 0;
        (grants ?? []).forEach((g: any) => {
            const p = Array.isArray(g.token_packages) ? g.token_packages[0] : g.token_packages;
            if (p) {
                price += p.price_cents;
                count += p.token_count;
            }
        });
        if (count > 0) unitPriceCents = Math.round(price / count);
    }
    const costCents = enabled && unitPriceCents != null ? consumed * unitPriceCents : null;

    return {
        rows: ORIGINS.map((o) => rows.get(o)!),
        asaasGrossCents: asaas.amountCents,
        asaasFeeCents: asaas.feeCents,
        asaasNetCents,
        outsideCents,
        netCents,
        feeMissingCount: asaas.feeMissingCount,
        tokens: { enabled, consumed, unitPriceCents, costCents },
        resultAfterTokensCents: costCents != null ? netCents - costCents : null,
    };
}

export async function getFinanceiroDetalhamento(filters: { eventId?: string | null; from?: string | null; to?: string | null }) {
    const { tenant_id } = await requireOwner();
    return computeDetalhamento(tenant_id, filters);
}

export type AsaasBalanceResult =
    | { ok: true; scope: 'own'; balanceCents: number; expectedNetCents: number; consultedAt: string }
    | { ok: true; scope: 'platform'; expectedNetCents: number; consultedAt: string }
    | { ok: false; error: string };

/** Consulta o saldo do Asaas SOB DEMANDA (clique do dono). Somente leitura; a chave nunca sai do servidor. */
export async function getAsaasBalanceAction(): Promise<AsaasBalanceResult> {
    try {
        const { tenant_id } = await requireOwner();
        const admin = createAdminClient();

        // líquido Asaas de todo o histórico da academia (o saldo é cumulativo)
        const all = await computeDetalhamento(tenant_id, {});
        const consultedAt = new Date().toISOString();

        const { data: tenant } = await admin
            .from('tenants')
            .select('use_own_asaas_api, asaas_api_key_encrypted, asaas_api_key_iv')
            .eq('id', tenant_id)
            .single();

        // Conta da plataforma: o saldo mistura todas as academias, então não é consultado nem exibido.
        if (!tenant?.use_own_asaas_api || !tenant.asaas_api_key_encrypted || !tenant.asaas_api_key_iv) {
            return { ok: true, scope: 'platform', expectedNetCents: all.asaasNetCents, consultedAt };
        }

        const { data: settings } = await admin
            .from('asaas_settings')
            .select('environment')
            .eq('is_enabled', true)
            .single();
        const baseUrl = settings?.environment === 'production' ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
        const apiKey = decrypt(tenant.asaas_api_key_encrypted, tenant.asaas_api_key_iv);

        const res = await fetch(`${baseUrl}/v3/finance/balance`, {
            headers: { access_token: apiKey },
            cache: 'no-store',
        });
        if (!res.ok) return { ok: false, error: 'Não foi possível consultar o saldo no Asaas agora. Tente novamente em instantes.' };
        const json = await res.json();
        if (typeof json?.balance !== 'number') return { ok: false, error: 'Resposta inesperada do Asaas.' };

        return { ok: true, scope: 'own', balanceCents: toCents(json.balance), expectedNetCents: all.asaasNetCents, consultedAt };
    } catch (e: any) {
        return { ok: false, error: e?.message ?? 'Erro inesperado.' };
    }
}

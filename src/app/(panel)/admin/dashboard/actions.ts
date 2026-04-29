'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type AcademyRankingItem = {
    id: string;
    name: string;
    currentBalance: number;
    consumedThisMonth: number;
    grantedThisMonth: number;
    status: 'ok' | 'low' | 'negative';
};

export type PaymentFailureItem = {
    id: string;
    error_type: string | null;
    error_details: any;
    created_at: string;
    total_inscricoes_snapshot: number;
    athlete_name: string;
    event_title: string;
};

export type DashboardData = {
    tokens: {
        grantedThisMonth: number;
        consumedThisMonth: number;
        academiesLowBalance: number;
        academiesNegative: number;
    };
    academyRanking: AcademyRankingItem[];
    operational: {
        pendingEvents: number;
        pendingSuggestions: number;
    };
    paymentFailures: {
        last24h: number;
        items: PaymentFailureItem[];
    };
};

function getStartOfMonth(): string {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
}

function resolveStatus(balance: number): 'ok' | 'low' | 'negative' {
    if (balance < 0) return 'negative';
    if (balance <= 20) return 'low';
    return 'ok';
}

export async function getDashboardData(): Promise<DashboardData> {
    const adminClient = createAdminClient();
    const startOfMonth = getStartOfMonth();

    // ── Tokens este mês ──────────────────────────────────────────────────────
    const { data: txThisMonth } = await adminClient
        .from('token_transactions')
        .select('type, amount')
        .gte('created_at', startOfMonth);

    let grantedThisMonth = 0;
    let consumedThisMonth = 0;

    for (const tx of txThisMonth ?? []) {
        if (tx.type === 'granted') {
            grantedThisMonth += tx.amount ?? 0;
        } else if (tx.type === 'consumed') {
            consumedThisMonth += Math.abs(tx.amount ?? 0);
        }
    }

    // ── Academias com saldo baixo / negativo ─────────────────────────────────
    const { data: allManagedTenants } = await adminClient
        .from('tenants')
        .select('id, name, inscription_token_balance')
        .eq('token_management_enabled', true);

    const managedTenants = allManagedTenants ?? [];

    const academiesLowBalance = managedTenants.filter(
        t => t.inscription_token_balance >= 0 && t.inscription_token_balance <= 20
    ).length;

    const academiesNegative = managedTenants.filter(
        t => t.inscription_token_balance < 0
    ).length;

    // ── Ranking de academias (consumo do mês) ────────────────────────────────
    const { data: txByTenant } = await adminClient
        .from('token_transactions')
        .select('tenant_id, type, amount')
        .gte('created_at', startOfMonth)
        .in('type', ['granted', 'consumed']);

    // Agrupa por tenant_id
    const tenantTxMap = new Map<string, { consumed: number; granted: number }>();
    for (const tx of txByTenant ?? []) {
        if (!tx.tenant_id) continue;
        const entry = tenantTxMap.get(tx.tenant_id) ?? { consumed: 0, granted: 0 };
        if (tx.type === 'consumed') {
            entry.consumed += Math.abs(tx.amount ?? 0);
        } else if (tx.type === 'granted') {
            entry.granted += tx.amount ?? 0;
        }
        tenantTxMap.set(tx.tenant_id, entry);
    }

    const academyRanking: AcademyRankingItem[] = managedTenants
        .map(tenant => {
            const txData = tenantTxMap.get(tenant.id) ?? { consumed: 0, granted: 0 };
            const balance = tenant.inscription_token_balance ?? 0;
            return {
                id: tenant.id,
                name: tenant.name ?? '(sem nome)',
                currentBalance: balance,
                consumedThisMonth: txData.consumed,
                grantedThisMonth: txData.granted,
                status: resolveStatus(balance),
            };
        })
        .sort((a, b) => b.consumedThisMonth - a.consumedThisMonth)
        .slice(0, 20);

    // ── Operacional ──────────────────────────────────────────────────────────
    const { count: pendingEvents } = await adminClient
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente');

    // Sugestões pendentes = atletas com gym_name preenchido mas sem tenant_id (comunidade)
    const { count: pendingSuggestions } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'atleta')
        .is('tenant_id', null)
        .not('gym_name', 'is', null);

    // ── Falhas de pagamento (últimas 24h) ────────────────────────────────────
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rawFailures } = await adminClient
        .from('payments')
        .select('id, payer_ref, total_inscricoes_snapshot, error_type, error_details, created_at, event:events(title)')
        .eq('status', 'FAILED')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(20);

    // Busca nomes dos atletas pelos payer_ref
    const payerRefs = [...new Set((rawFailures ?? []).map(f => f.payer_ref).filter(Boolean))];
    const payerMap = new Map<string, string>();
    if (payerRefs.length > 0) {
        const { data: payerProfiles } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .in('id', payerRefs);
        for (const p of payerProfiles ?? []) {
            payerMap.set(p.id, p.full_name ?? '(sem nome)');
        }
    }

    const failedPayments: PaymentFailureItem[] = (rawFailures ?? []).map(f => ({
        id: f.id,
        error_type: f.error_type,
        error_details: f.error_details,
        created_at: f.created_at,
        total_inscricoes_snapshot: Number(f.total_inscricoes_snapshot ?? 0),
        athlete_name: payerMap.get(f.payer_ref) ?? '(desconhecido)',
        event_title: (f.event as any)?.title ?? '(evento desconhecido)',
    }));

    return {
        tokens: {
            grantedThisMonth,
            consumedThisMonth,
            academiesLowBalance,
            academiesNegative,
        },
        academyRanking,
        operational: {
            pendingEvents: pendingEvents ?? 0,
            pendingSuggestions: pendingSuggestions ?? 0,
        },
        paymentFailures: {
            last24h: failedPayments?.length ?? 0,
            items: failedPayments ?? [],
        },
    };
}

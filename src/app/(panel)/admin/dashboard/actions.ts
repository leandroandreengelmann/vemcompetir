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

export type DashboardData = {
    tokens: {
        grantedThisMonth: number;
        consumedThisMonth: number;
        academiesLowBalance: number;
        academiesNegative: number;
    };
    academyRanking: AcademyRankingItem[];
    whatsapp: {
        openConversations: number;
        unreadConversations: number;
        humanMode: number;
        aiMode: number;
    };
    operational: {
        pendingEvents: number;
        pendingSuggestions: number;
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

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    let openConversations = 0;
    let unreadConversations = 0;
    let humanMode = 0;
    let aiMode = 0;

    try {
        const { data: convData } = await adminClient
            .from('whatsapp_conversations')
            .select('status, unread_count, handler_mode');

        for (const conv of convData ?? []) {
            if (conv.status === 'aberta') openConversations++;
            if ((conv.unread_count ?? 0) > 0) unreadConversations++;
            if (conv.handler_mode === 'human') humanMode++;
            if (conv.handler_mode === 'ai') aiMode++;
        }
    } catch {
        // tabela pode não existir em todos os ambientes
    }

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

    return {
        tokens: {
            grantedThisMonth,
            consumedThisMonth,
            academiesLowBalance,
            academiesNegative,
        },
        academyRanking,
        whatsapp: {
            openConversations,
            unreadConversations,
            humanMode,
            aiMode,
        },
        operational: {
            pendingEvents: pendingEvents ?? 0,
            pendingSuggestions: pendingSuggestions ?? 0,
        },
    };
}

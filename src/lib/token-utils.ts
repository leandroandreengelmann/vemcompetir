import { createAdminClient } from '@/lib/supabase/admin';

const LOW_BALANCE_THRESHOLD = 20;
export const MIN_TOKEN_BALANCE = -20;

interface TokenContext {
    registrationId?: string;
    eventId?: string;
    inscriptionPackageId?: string;
    tokenPackageId?: string;
    notes?: string;
    createdBy?: string;
}

/**
 * Consome tokens do tenant organizador do evento.
 * Só age se token_management_enabled = true no tenant.
 * Bloqueia se o saldo resultante for menor que MIN_TOKEN_BALANCE (-20).
 */
export async function consumeTokens(
    tenantId: string,
    amount: number,
    context: TokenContext = {}
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
    const adminClient = createAdminClient();

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('inscription_token_balance, token_management_enabled, token_alert_sent_at')
        .eq('id', tenantId)
        .single();

    if (!tenant) return { success: false, error: 'Tenant não encontrado.' };
    if (!tenant.token_management_enabled) return { success: true };

    const currentBalance: number = tenant.inscription_token_balance;
    const newBalance = currentBalance - amount;

    if (newBalance < MIN_TOKEN_BALANCE) {
        return {
            success: false,
            error: `Saldo de tokens insuficiente. Saldo atual: ${currentBalance} token${currentBalance !== 1 ? 's' : ''}.`,
        };
    }

    const { error: updateError } = await adminClient
        .from('tenants')
        .update({ inscription_token_balance: newBalance })
        .eq('id', tenantId);

    if (updateError) return { success: false, error: 'Erro ao atualizar saldo de tokens.' };

    await adminClient.from('token_transactions').insert({
        tenant_id: tenantId,
        type: 'consumed',
        amount: -amount,
        balance_after: newBalance,
        registration_id: context.registrationId ?? null,
        event_id: context.eventId ?? null,
        inscription_package_id: context.inscriptionPackageId ?? null,
        token_package_id: context.tokenPackageId ?? null,
        notes: context.notes ?? null,
        created_by: context.createdBy ?? null,
    });

    // Dispara alerta ao cruzar o threshold (sem bloquear o fluxo)
    const crossedThreshold =
        currentBalance > LOW_BALANCE_THRESHOLD && newBalance <= LOW_BALANCE_THRESHOLD;
    if (crossedThreshold) {
        triggerLowBalanceAlert(tenantId, newBalance).catch(console.error);
    }

    const warning = newBalance < 0
        ? `Seu saldo ficou negativo (${newBalance} tokens). Ao comprar um novo pacote de tokens, esse valor será descontado automaticamente.`
        : undefined;

    return { success: true, newBalance, warning };
}

/**
 * Estorna tokens para o tenant (ex: inscrição cancelada).
 * Só age se token_management_enabled = true no tenant.
 */
export async function refundTokens(
    tenantId: string,
    amount: number,
    context: TokenContext = {}
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const adminClient = createAdminClient();

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('inscription_token_balance, token_management_enabled')
        .eq('id', tenantId)
        .single();

    if (!tenant) return { success: false, error: 'Tenant não encontrado.' };
    if (!tenant.token_management_enabled) return { success: true };

    const newBalance = tenant.inscription_token_balance + amount;

    await adminClient
        .from('tenants')
        .update({ inscription_token_balance: newBalance })
        .eq('id', tenantId);

    await adminClient.from('token_transactions').insert({
        tenant_id: tenantId,
        type: 'refunded',
        amount: amount,
        balance_after: newBalance,
        registration_id: context.registrationId ?? null,
        event_id: context.eventId ?? null,
        inscription_package_id: context.inscriptionPackageId ?? null,
        notes: context.notes ?? null,
        created_by: context.createdBy ?? null,
    });

    return { success: true, newBalance };
}

/**
 * Concede tokens a um tenant (compra/ajuste manual pelo admin).
 */
export async function grantTokens(
    tenantId: string,
    amount: number,
    context: TokenContext = {}
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const adminClient = createAdminClient();

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('inscription_token_balance')
        .eq('id', tenantId)
        .single();

    if (!tenant) return { success: false, error: 'Tenant não encontrado.' };

    const newBalance = tenant.inscription_token_balance + amount;

    const { error: updateError } = await adminClient
        .from('tenants')
        .update({ inscription_token_balance: newBalance })
        .eq('id', tenantId);

    if (updateError) return { success: false, error: 'Erro ao conceder tokens.' };

    await adminClient.from('token_transactions').insert({
        tenant_id: tenantId,
        type: context.tokenPackageId ? 'granted' : 'adjusted',
        amount: amount,
        balance_after: newBalance,
        token_package_id: context.tokenPackageId ?? null,
        notes: context.notes ?? null,
        created_by: context.createdBy ?? null,
    });

    return { success: true, newBalance };
}

/**
 * Retorna o tenant_id do organizador de um evento.
 */
export async function getEventTenantId(eventId: string): Promise<string | null> {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('events')
        .select('tenant_id')
        .eq('id', eventId)
        .single();
    return data?.tenant_id ?? null;
}

async function triggerLowBalanceAlert(tenantId: string, balance: number) {
    const adminClient = createAdminClient();

    // Registra data do alerta para evitar spam
    await adminClient
        .from('tenants')
        .update({ token_alert_sent_at: new Date().toISOString() })
        .eq('id', tenantId);

    // TODO: enviar email para a academia e para o admin quando serviço de email estiver configurado
    console.warn(`[TOKEN ALERT] Tenant ${tenantId} cruzou o threshold de tokens. Saldo: ${balance}`);
}

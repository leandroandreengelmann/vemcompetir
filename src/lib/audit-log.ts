/**
 * Structured audit logger for financial operations.
 * Outputs JSON to stdout — compatible with Vercel logs, Datadog, Axiom, etc.
 *
 * Usage:
 *   auditLog('PAYMENT_CREATED', { user_id, event_id, amount })
 *   auditLog('PAYMENT_CONFIRMED', { payment_id, asaas_payment_id })
 *   auditLog('PAYMENT_FAILED', { user_id, reason }, 'error')
 */

type AuditLevel = 'info' | 'warn' | 'error';

type AuditEvent =
    | 'PAYMENT_CREATED'
    | 'PAYMENT_FREE_CONFIRMED'
    | 'PAYMENT_OWN_EVENT_CONFIRMED'
    | 'PAYMENT_FAILED'
    | 'PAYMENT_ROLLBACK'
    | 'WEBHOOK_PAYMENT_CONFIRMED'
    | 'WEBHOOK_PAYMENT_SCHEDULED'
    | 'WEBHOOK_PAYMENT_EXPIRED'
    | 'WEBHOOK_PAYMENT_CANCELLED'
    | 'WEBHOOK_INVALID_TOKEN'
    | 'WEBHOOK_PAYMENT_NOT_FOUND'
    | 'WEBHOOK_PARTIALLY_RECEIVED'
    | 'WEBHOOK_AMOUNT_MISMATCH'
    | 'GUARDIAN_DECLARATION_FAILED'
    | 'CUSTOMER_CREATED'
    | 'CUSTOMER_INVALID_RETRIED';

export function auditLog(
    event: AuditEvent,
    data: Record<string, unknown>,
    level: AuditLevel = 'info'
): void {
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...data,
    };

    const line = JSON.stringify(entry);

    if (level === 'error') {
        console.error(line);
    } else if (level === 'warn') {
        console.warn(line);
    } else {
        console.log(line);
    }
}

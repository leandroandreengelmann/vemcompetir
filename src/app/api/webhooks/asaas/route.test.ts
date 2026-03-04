import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt, hashToken } from '@/lib/crypto'; // Import hashToken

// Mocks
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
    decrypt: vi.fn(),
    hashToken: vi.fn(), // Mock hashToken
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Asaas Webhook Route', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => ({ data: null })),
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
        };

        (createAdminClient as any).mockReturnValue(mockSupabase);
        (decrypt as any).mockReturnValue('fake-api-key');
        (hashToken as any).mockReturnValue('expected-hash'); // Simulate hashed token
    });

    const createMockRequest = (body: any, token: string | null = 'valid-token') => {
        const headers = new Headers();
        if (token !== null) {
            headers.set('asaas-access-token', token);
        }
        return new NextRequest('http://localhost/api/webhooks/asaas', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    };

    it('should reject requests without the asaas-access-token header', async () => {
        // Setup DB valid hash token state
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' }
        });

        const req = createMockRequest({ event: 'PAYMENT_RECEIVED' }, null); // No token
        const res = await POST(req);

        expect(res.status).toBe(401); // Unauthorized
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('should reject requests with an invalid asaas-access-token', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' }
        });

        // Let's pretend the mock returns a DIFFERENT hash for this invalid token
        (hashToken as any).mockReturnValueOnce('wrong-hash');

        const req = createMockRequest({ event: 'PAYMENT_RECEIVED' }, 'invalid-token-123');
        const res = await POST(req);

        expect(res.status).toBe(401);
    });

    it('should reject if database has no webhook_token_hash configured', async () => {
        // DB says no token configured
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: null }
        });

        const req = createMockRequest({ event: 'PAYMENT_RECEIVED' }, 'any-token');
        const res = await POST(req);

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Webhook not configured securely');
    });

    it('should ignore non-payment events with a valid token', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' } // pass token check
        });

        const req = createMockRequest({ event: 'SOME_OTHER_EVENT' });
        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    it('should confirm payment when event is RECEIVED and Asaas verification passes', async () => {
        const asaasPaymentId = 'pay_123';
        const paymentRecordId = 'local_pay_123';

        // 1. Token Check DB Config
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' }
        });

        // 2. Mock Asaas Payment fetch
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: paymentRecordId, status: 'PENDING' }
        });

        // 3. Mock Asaas Environment fetch
        mockSupabase.single.mockResolvedValueOnce({
            data: { environment: 'sandbox', api_key_encrypted: 'abc', api_key_iv: 'def', is_enabled: true }
        });

        // Mock Asaas API verification
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: asaasPaymentId, status: 'RECEIVED', value: 100, netValue: 95 }),
        });

        // Create the webhook payload
        const payload = {
            event: 'PAYMENT_RECEIVED',
            payment: {
                id: asaasPaymentId,
            }
        };

        const req = createMockRequest(payload);
        const res = await POST(req);

        expect(res.status).toBe(200);

        // Verify payment record update
        expect(mockSupabase.from).toHaveBeenCalledWith('payments');
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'PAID',
            fee_pix_snapshot: 5 // 100 - 95
        }));

        // Verify registration update
        expect(mockSupabase.from).toHaveBeenCalledWith('event_registrations');
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'pago' });
    });

    it('should handle OVERDUE payments by reverting registrations to cart', async () => {
        const asaasPaymentId = 'pay_expired';
        const paymentRecordId = 'local_pay_expired';

        // 1. Token Check
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' }
        });

        // 2. Mock local payment record
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: paymentRecordId, status: 'PENDING' }
        });

        // 3. Mock Asaas Config
        mockSupabase.single.mockResolvedValueOnce({
            data: { environment: 'sandbox', is_enabled: true }
        });

        // Mock Asaas API verification
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: asaasPaymentId, status: 'OVERDUE' }),
        });

        const payload = {
            event: 'PAYMENT_OVERDUE',
            payment: { id: asaasPaymentId }
        };

        const req = createMockRequest(payload);
        const res = await POST(req);

        expect(res.status).toBe(200);

        // Verify payment marked as EXPIRED
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'EXPIRED'
        }));

        // Verify registrations reverted to cart
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'carrinho', payment_id: null });
    });

    it('should fail if Asaas verification fails (Security check)', async () => {
        const asaasPaymentId = 'pay_hack';

        // 1. Token check
        mockSupabase.single.mockResolvedValueOnce({
            data: { webhook_token_hash: 'expected-hash' }
        });

        // 2. Mock local payment record
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'some_id', status: 'PENDING' }
        });

        // 3. Mock Asaas Config
        mockSupabase.single.mockResolvedValueOnce({
            data: { environment: 'sandbox', is_enabled: true }
        });

        // Simulate Asaas API down or invalid response
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        const req = createMockRequest({ event: 'PAYMENT_RECEIVED', payment: { id: asaasPaymentId } });
        const res = await POST(req);

        expect(res.status).toBe(400); // Bad request because verification failed
    });
});

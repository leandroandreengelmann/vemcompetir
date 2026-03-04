import { test, expect } from '@playwright/test';

test.describe('Asaas Webhook E2E Security', () => {

    test('Webhook receiver should REJECT payloads without token', async ({ request }) => {
        const response = await request.post('/api/webhooks/asaas', {
            data: {
                event: 'PAYMENT_RECEIVED',
                payment: { id: 'pay_123', status: 'RECEIVED' }
            }
        });

        // Unauthenticated access attempt should be rejected outright with 401
        expect(response.status()).toBe(401);
    });

    test('Webhook receiver should REJECT payloads with INVALID token', async ({ request }) => {
        const response = await request.post('/api/webhooks/asaas', {
            headers: {
                'asaas-access-token': 'invalid-hacker-token-12345'
            },
            data: {
                event: 'PAYMENT_RECEIVED',
                payment: { id: 'pay_321', status: 'RECEIVED' }
            }
        });

        // Invalid token should also throw 401
        expect(response.status()).toBe(401);
    });

    // We do not test the "Success" path in the Playwright file without having
    // a valid token from the database, because our tokens are hashed with a server
    // secret. That behavior is fully tested in the Jest/Vitest unit tests.
});

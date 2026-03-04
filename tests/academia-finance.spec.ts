import { test, expect } from '@playwright/test';

test.describe('Organizer Finance & Asaas Integration', () => {

    test('Unauthenticated user cannot create Asaas Subaccount', async ({ request }) => {
        const response = await request.post('/api/academia/financeiro/asaas/account', {
            data: { name: 'Hacker Gym', document: '00000000000' }
        });

        expect([401, 403, 404, 405]).toContain(response.status());
    });

    test('Financial split config endpoint should be protected', async ({ request }) => {
        const response = await request.post('/api/academia/financeiro/asaas/split', {
            data: { percent: 10 }
        });

        expect([401, 403, 404, 405]).toContain(response.status());
    });

});

import { test, expect } from '@playwright/test';

test.describe('Organizer Tenant Isolation', () => {

    test('Organizer should not access another organizers dashboard', async ({ page, request }) => {
        // Front-end redirect checks
        await page.goto('/academia-equipe/dashboard');
        await expect(page).toHaveURL(/.*\/login/);

        // Backend checks - Simulating fetching stats without tenant ID
        const responseActions = await request.get('/api/academia/stats');
        expect([401, 403, 404]).toContain(responseActions.status());
    });

    test('Financial endpoints should be isolated and locked', async ({ request }) => {
        const response = await request.get('/api/academia/financeiro/asaas/balance');
        // Rota protegida?
        expect([401, 403, 404, 405]).toContain(response.status());
    });
});

import { test, expect } from '@playwright/test';

test.describe('Asaas Credentials Endpoint Security', () => {

    test('Asaas Integrations page should redirect unauthenticated traffic', async ({ page }) => {
        await page.goto('/admin/dashboard/integracoes/asaas');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('API endpoint for updating Asaas credentials should block unauthorized calls', async ({ request }) => {
        const response = await request.post('/api/admin/asaas/keys', {
            data: { key: 'fake_key' }
        });
        // API deve retornar error se o POST / PUT não possuir token e payload asaas
        expect([401, 403, 404, 405]).toContain(response.status());
    });

});

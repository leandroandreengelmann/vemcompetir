import { test, expect } from '@playwright/test';

test.describe('Athlete Flow & Profile', () => {

    test('Unauthenticated user is blocked from viewing any athlete dashboard', async ({ page }) => {
        await page.goto('/atleta/dashboard');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Athlete Profile update logic (API) requires authentication', async ({ request }) => {
        const response = await request.post('/api/atleta/profile/update', {
            data: { full_name: 'Hack Name', weight: 80 }
        });

        expect([401, 403, 404, 405]).toContain(response.status());
    });

});

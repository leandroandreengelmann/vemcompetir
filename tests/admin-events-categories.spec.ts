import { test, expect } from '@playwright/test';

test.describe('Global Admin Event & Categories Management', () => {

    test('Global events page should be inaccessible to unauthenticated users', async ({ page }) => {
        await page.goto('/admin/dashboard/eventos');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Category endpoints should prevent unauthorized modifications', async ({ request }) => {
        const response = await request.post('/api/admin/categories', {
            data: { name: 'Hacker Category', type: 'global' }
        });
        // RLS prevents modification from unauthenticated request
        expect([401, 403, 404, 405]).toContain(response.status());
    });

    test('Global Categories page should redirect to login', async ({ page }) => {
        await page.goto('/admin/dashboard/categorias');
        await expect(page).toHaveURL(/.*\/login/);
    });

});

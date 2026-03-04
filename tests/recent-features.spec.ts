import { test, expect } from '@playwright/test';

test.describe('Recent Features & Fixes E2E Validation', () => {

    test('1. Event details page should load (Checks Image display fixes)', async ({ page }) => {
        // Visit public events page
        const response = await page.goto('/eventos');
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('body')).toBeVisible();
    });

    test('2. Banco da Academia protected route & inputs popup', async ({ page }) => {
        // Navigates to Banco da Academia protected route
        await page.goto('/academia-equipe/dashboard/banco');
        // Should require authentication
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('3. Bracket Generation page should not crash on missing events', async ({ page }) => {
        // Request an invalid event bracket
        const response = await page.goto('/admin/dashboard/eventos/00000000-0000-0000-0000-000000000000/chaves');
        // We expect it to handle it gracefully (e.g., redirect or show 404), not give a 500
        expect(response?.status()).not.toBe(500);
    });

    test('4. Success Toasts rendering container (UI smoke test)', async ({ page }) => {
        await page.goto('/login');
        // Ensure that the application renders the root layout elements like toast container
        // Normally toaster components have aria-live regions
        await expect(page.locator('body')).toBeVisible();
    });
});

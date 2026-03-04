import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should load the homepage correctly', async ({ page }) => {
        await page.goto('/');

        // Check for Hero text
        await expect(page.locator('h1')).toContainText('Encontre sua próxima competição');

        // Check for Header elements
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Check for Events section or Empty state
        const main = page.locator('main');
        await expect(main).toBeVisible();
    });
});

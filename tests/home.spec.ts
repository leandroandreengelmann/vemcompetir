import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should load the homepage correctly', async ({ page }) => {
        await page.goto('/');

        // Check for Hero: either the default hero text or the banner carousel
        const fallbackHero = page.locator('h1', { hasText: 'Encontre sua próxima competição' });
        const bannerHero = page.getByTestId('hero-banners');
        await expect(fallbackHero.or(bannerHero).first()).toBeVisible();

        // Check for Header elements
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Check for Events section or Empty state
        const main = page.locator('main');
        await expect(main).toBeVisible();
    });
});

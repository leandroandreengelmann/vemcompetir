import { test, expect } from '@playwright/test';

test.describe('Bracket Simulator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/chaveamento');
    });

    test('should generate a bracket for 10 athletes', async ({ page }) => {
        // Find input and set to 10
        const input = page.locator('input[type="number"]').first();
        await input.fill('10');

        // Click generate
        await page.click('button:has-text("Gerar")');

        // Verify rounds are rendered
        // Give it a moment to render the animation if any
        const round1 = page.locator('span:has-text("Round 1")').first();
        await expect(round1).toBeVisible({ timeout: 5000 });

        // Check for specific UI elements (Atleta 1, etc.)
        // Atleast one athlete should be visible
        await expect(page.locator('text=Atleta 1').first()).toBeVisible();
    });

    test('should allow selecting a winner and propagating', async ({ page }) => {
        await page.locator('input[type="number"]').first().fill('4');
        await page.click('button:has-text("Gerar")');

        // Round 1 matches
        // Click the first athlete button in the first match
        const firstAthleteBtn = page.locator('button:has-text("Atleta 1")').first();
        await firstAthleteBtn.click();

        // Check if Atleta 1 appears in the next round
        // We look for Atleta 1 in the second round container
        const secondRound = page.locator('.flex.flex-col.relative.w-\\[220px\\]').nth(1);
        await expect(secondRound.locator('text=Atleta 1')).toBeVisible();
    });

    test('should have a working PDF export button', async ({ page }) => {
        await page.locator('input[type="number"]').first().fill('8');
        await page.click('button:has-text("Gerar")');

        const exportBtn = page.locator('button:has-text("Baixar PDF")');
        await expect(exportBtn).toBeVisible();
        await expect(exportBtn).toBeEnabled();
    });
});

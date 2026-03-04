import { test, expect } from '@playwright/test';

test.describe('Organizer Event Management', () => {

    test('Unauthenticated user cannot create an event via API', async ({ request }) => {
        const response = await request.post('/api/academia/events', {
            data: { name: 'Fake Event', date: '2026-05-01' }
        });

        expect([401, 403, 404, 405]).toContain(response.status());
    });

    test('UI should redirect anonymous users from event creation page', async ({ page }) => {
        await page.goto('/academia-equipe/dashboard/eventos/novo');
        await expect(page).toHaveURL(/.*\/login/);
    });

});

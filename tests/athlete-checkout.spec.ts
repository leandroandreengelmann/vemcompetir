import { test, expect } from '@playwright/test';

test.describe('Athlete Checkout & Registration', () => {

    test('Checkout endpoint validates authenticated session before creating Pix', async ({ request }) => {
        const response = await request.post('/api/checkout', {
            data: { eventId: '123', category: 'Absoluto', amount: 100.00 }
        });
        // Tem que bloquear se não tiver um ID de Auth. Caso retorne 200, falha crítica
        expect([401, 403, 404, 405]).toContain(response.status());
    });

    test('Cart Add/Remove actions should be authenticated', async ({ request }) => {
        const response = await request.post('/api/cart/add', {
            data: { athleteId: 'user1', eventId: 'event1' }
        });
        expect([401, 403, 404, 405]).toContain(response.status());
    });

});

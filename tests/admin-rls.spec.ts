import { test, expect } from '@playwright/test';

test.describe('Admin Authentication & RLS Bypass', () => {

    test('Unauthenticated user is redirected from /admin/dashboard', async ({ page }) => {
        // Tenta acessar a rota do admin diretamente sem estar logado
        await page.goto('/admin/dashboard');

        // Deve ser redirecionado para a página de login
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Unauthenticated user cannot access /admin/dashboard/configuracoes', async ({ page }) => {
        // Tenta acessar rotas profundas do admin
        await page.goto('/admin/dashboard/configuracoes');

        // Deve ser interceptado pelo middleware e redirecionado para o login
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Unauthenticated user cannot call Admin API directly (Categories)', async ({ request }) => {
        // Tenta buscar as categorias como um admin faria pela API
        const response = await request.get('/api/admin/categories');

        // Como o RLS está protegendo ou a rota verifica auth, deve retornar 401 ou 403 (ou 404 se a rota não existir dessa forma, mas importante é não retornar 200 com dados)
        expect([401, 403, 404]).toContain(response.status());
    });

});

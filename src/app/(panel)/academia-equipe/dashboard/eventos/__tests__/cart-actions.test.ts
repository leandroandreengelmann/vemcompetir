import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    addToCartAction,
    removeFromCartAction,
    getCartItemsAction,
    checkoutCartAction,
    reactivateCartItemAction,
    cancelPendingCartItemAction,
} from '../cart-actions';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth-guards', () => ({ requireTenantScope: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase-like chainable mock where:
 * - All builder methods return `this` so chaining works.
 * - Terminal resolution is controlled per-test by assigning `mock._resolve`.
 * - `single` resolves via its own mockFn (overrideable per-test).
 * - delete/update/insert chains: the last `.eq()` / `.in()` call resolves via
 *   `mock._resolve`, which tests set before calling the action.
 */
function makeMock(defaultResolve = { error: null, count: null as number | null, data: null as any }) {
    let resolveValue = { ...defaultResolve };

    const self: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        // delete returns 'this' so .eq can be chained after it
        delete: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        // eq and in are both chainable AND terminal — they return a thenable mock
        // so tests can choose to chain or await
        eq: vi.fn(),
        in: vi.fn(),
        // Helper: set the resolved value for terminal calls
        _setResolve(v: typeof defaultResolve) { resolveValue = v; },
        _resolve: resolveValue,
    };

    // eq/in return `this` by default (for chaining) but the mock instance is
    // also thenable, so `await chain.eq(...)` works by resolving with `resolveValue`.
    // We achieve this by making eq/in return a chainable thenable.
    const makeThenable = () => {
        const t: any = Object.create(self);
        t.then = (resolve: (v: any) => void) => Promise.resolve(resolveValue).then(resolve);
        t.catch = (reject: (v: any) => void) => Promise.resolve(resolveValue).catch(reject);
        return t;
    };

    self.eq.mockImplementation(() => makeThenable());
    self.in.mockImplementation(() => makeThenable());

    return self;
}

const defaultProfile = { id: 'user-academia-1', role: 'academia/equipe', tenant_id: 'tenant-1' };

// ---------------------------------------------------------------------------
// addToCartAction
// ---------------------------------------------------------------------------

describe('addToCartAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should add new item to cart when no existing registration', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });
        supabaseMock.insert.mockResolvedValue({ error: null });

        const result = await addToCartAction({
            eventId: 'event-1', athleteId: 'athlete-1', categoryId: 'cat-1', price: 100,
        });

        expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
            event_id: 'event-1',
            athlete_id: 'athlete-1',
            category_id: 'cat-1',
            status: 'carrinho',
            price: 100,
            tenant_id: 'tenant-1',
            registered_by: 'user-academia-1',
        }));
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/eventos');
    });

    it('should update price when item already exists in cart', async () => {
        supabaseMock.maybeSingle.mockResolvedValue({ data: { id: 'existing-reg', status: 'carrinho' }, error: null });
        // The update().eq() chain resolves via thenable mock (default: { error: null })
        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await addToCartAction({
            eventId: 'event-1', athleteId: 'athlete-1', categoryId: 'cat-1', price: 120,
        });

        expect(supabaseMock.update).toHaveBeenCalledWith({ price: 120 });
        expect(result).toEqual({ success: true, message: 'Item atualizado no carrinho.' });
    });

    it('should return error when athlete has a non-cart active registration', async () => {
        supabaseMock.maybeSingle.mockResolvedValue({ data: { id: 'reg-1', status: 'pago' }, error: null });

        const result = await addToCartAction({
            eventId: 'event-1', athleteId: 'athlete-1', categoryId: 'cat-1', price: 100,
        });

        expect(result).toEqual({ error: 'Atleta já inscrito nesta categoria.' });
    });

    it('should return error when database insert fails', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });
        supabaseMock.insert.mockResolvedValue({ error: { message: 'DB insert error' } });

        const result = await addToCartAction({
            eventId: 'event-1', athleteId: 'athlete-1', categoryId: 'cat-1', price: 100,
        });

        expect(result).toEqual({ error: 'Erro ao adicionar ao carrinho.' });
    });
});

// ---------------------------------------------------------------------------
// removeFromCartAction
// ---------------------------------------------------------------------------

describe('removeFromCartAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (createAdminClient as any).mockReturnValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should remove cart item successfully when it exists', async () => {
        // delete().eq().eq().eq() → last eq resolves { error: null, count: 1 }
        supabaseMock._setResolve({ error: null, count: 1, data: null });

        const result = await removeFromCartAction('reg-1');

        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/eventos');
    });

    it('should return error when no rows were deleted', async () => {
        supabaseMock._setResolve({ error: null, count: 0, data: null });

        const result = await removeFromCartAction('reg-nonexistent');

        expect(result).toEqual({ error: 'Item não encontrado ou não pode ser removido.' });
    });

    it('should return error when database delete operation fails', async () => {
        supabaseMock._setResolve({ error: { message: 'Delete failed' }, count: null, data: null });

        const result = await removeFromCartAction('reg-error');

        expect(result).toEqual({ error: 'Erro ao remover do carrinho.' });
    });

    it('should scope delete to current user and carrinho status', async () => {
        supabaseMock._setResolve({ error: null, count: 1, data: null });

        await removeFromCartAction('reg-1');

        // eq was called with registered_by
        const eqCalls = supabaseMock.eq.mock.calls;
        const registeredByCall = eqCalls.find((c: any[]) => c[0] === 'registered_by');
        expect(registeredByCall![1]).toBe('user-academia-1');
        const statusCall = eqCalls.find((c: any[]) => c[0] === 'status');
        expect(statusCall![1]).toBe('carrinho');
    });
});

// ---------------------------------------------------------------------------
// getCartItemsAction
// ---------------------------------------------------------------------------

describe('getCartItemsAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should return cart items for the current user', async () => {
        const mockItems = [{
            id: 'reg-1', event_id: 'event-1', status: 'carrinho', price: 100,
            athlete: { full_name: 'João Silva' },
            category: { categoria_completa: 'Adulto Azul Médio' },
            event: { title: 'Campeonato 2025', event_date: '2025-06-01' },
        }];
        supabaseMock.order.mockResolvedValue({ data: mockItems, error: null });

        const result = await getCartItemsAction();

        expect(result).toEqual(mockItems);
    });

    it('should return empty array when fetch fails', async () => {
        supabaseMock.order.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });

        const result = await getCartItemsAction();

        expect(result).toEqual([]);
    });

    it('should query only registrations belonging to the current user', async () => {
        supabaseMock.order.mockResolvedValue({ data: [], error: null });

        await getCartItemsAction();

        const eqCalls = supabaseMock.eq.mock.calls;
        const registeredByCall = eqCalls.find((c: any[]) => c[0] === 'registered_by');
        expect(registeredByCall![1]).toBe('user-academia-1');
    });

    it('should include both carrinho and aguardando_pagamento in status filter', async () => {
        supabaseMock.order.mockResolvedValue({ data: [], error: null });

        await getCartItemsAction();

        const inCalls = supabaseMock.in.mock.calls;
        const statusCall = inCalls.find((c: any[]) => c[0] === 'status');
        expect(statusCall![1]).toContain('carrinho');
        expect(statusCall![1]).toContain('aguardando_pagamento');
    });
});

// ---------------------------------------------------------------------------
// checkoutCartAction
// ---------------------------------------------------------------------------

describe('checkoutCartAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should checkout all cart items when no event filter is provided', async () => {
        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await checkoutCartAction();

        expect(supabaseMock.update).toHaveBeenCalledWith({ status: 'pendente' });
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/eventos');
    });

    it('should filter by event ids when provided', async () => {
        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await checkoutCartAction(['event-1', 'event-2']);

        expect(supabaseMock.in).toHaveBeenCalledWith('event_id', ['event-1', 'event-2']);
        expect(result).toEqual({ success: true });
    });

    it('should return error when checkout update fails', async () => {
        supabaseMock._setResolve({ error: { message: 'Update failed' }, count: null, data: null });

        const result = await checkoutCartAction();

        expect(result).toEqual({ error: 'Erro ao finalizar inscrições.' });
    });

    it('should scope checkout to current user registered_by with status carrinho', async () => {
        supabaseMock._setResolve({ error: null, count: null, data: null });

        await checkoutCartAction();

        const eqCalls = supabaseMock.eq.mock.calls;
        const registeredByCall = eqCalls.find((c: any[]) => c[0] === 'registered_by');
        expect(registeredByCall![1]).toBe('user-academia-1');
        const statusCall = eqCalls.find((c: any[]) => c[0] === 'status');
        expect(statusCall![1]).toBe('carrinho');
    });
});

// ---------------------------------------------------------------------------
// reactivateCartItemAction
// ---------------------------------------------------------------------------

describe('reactivateCartItemAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (createAdminClient as any).mockReturnValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should reactivate a pending payment item back to cart', async () => {
        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await reactivateCartItemAction('reg-1');

        expect(supabaseMock.update).toHaveBeenCalledWith({ status: 'carrinho', payment_id: null });
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/eventos');
    });

    it('should return error when reactivation update fails', async () => {
        supabaseMock._setResolve({ error: { message: 'Update failed' }, count: null, data: null });

        const result = await reactivateCartItemAction('reg-error');

        expect(result).toEqual({ error: 'Erro ao reativar item na cesta.' });
    });
});

// ---------------------------------------------------------------------------
// cancelPendingCartItemAction
// ---------------------------------------------------------------------------

describe('cancelPendingCartItemAction', () => {
    let adminMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should cancel a pending registration successfully', async () => {
        adminMock.select.mockResolvedValue({ data: [{ id: 'reg-1' }], error: null });

        const result = await cancelPendingCartItemAction('reg-1');

        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/eventos');
    });

    it('should throw when no rows were deleted', async () => {
        adminMock.select.mockResolvedValue({ data: [], error: null });

        await expect(cancelPendingCartItemAction('reg-ghost')).rejects.toThrow(
            'Nenhuma inscrição foi removida'
        );
    });

    it('should throw when database delete fails', async () => {
        adminMock.select.mockResolvedValue({ data: null, error: { message: 'Delete constraint' } });

        await expect(cancelPendingCartItemAction('reg-error')).rejects.toThrow(
            'Erro ao cancelar inscrição pendente.'
        );
    });

    it('should scope cancellation to current user with correct statuses', async () => {
        adminMock.select.mockResolvedValue({ data: [{ id: 'reg-1' }], error: null });

        await cancelPendingCartItemAction('reg-1');

        const eqCalls = adminMock.eq.mock.calls;
        const registeredByCall = eqCalls.find((c: any[]) => c[0] === 'registered_by');
        expect(registeredByCall![1]).toBe('user-academia-1');

        const inCalls = adminMock.in.mock.calls;
        const statusCall = inCalls.find((c: any[]) => c[0] === 'status');
        expect(statusCall![1]).toContain('aguardando_pagamento');
        expect(statusCall![1]).toContain('pendente');
    });
});

// ---------------------------------------------------------------------------
// Cart total calculation (pure business logic)
// ---------------------------------------------------------------------------

describe('Cart total calculation logic', () => {
    it('should sum prices of all cart items', () => {
        const cartItems = [{ price: 100 }, { price: 75.5 }, { price: 50 }];
        const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
        expect(total).toBe(225.5);
    });

    it('should treat null price as 0', () => {
        const cartItems = [{ price: 100 }, { price: null as any }];
        const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
        expect(total).toBe(100);
    });

    it('should return 0 for empty cart', () => {
        const cartItems: { price: number }[] = [];
        const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
        expect(total).toBe(0);
    });
});

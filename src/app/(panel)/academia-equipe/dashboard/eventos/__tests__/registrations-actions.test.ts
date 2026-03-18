import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    registerAthleteAction,
    removeRegistrationAction,
    registerBatchAction,
} from '../registrations-actions';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth-guards', () => ({ requireTenantScope: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/registration-logic', () => ({
    checkEligibility: vi.fn(),
    parseAgeRangeFromText: vi.fn(),
    isMasterLivre: vi.fn(),
    normalizeText: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase-like chainable mock.
 *
 * Design goals:
 * - All builder methods (from, select, insert, update, delete, neq, order, range)
 *   return `this` for chaining.
 * - `single` is a vi.fn() with its own resolved value (overrideable per-test).
 * - `eq` and `in` return a "thenable" so chains can be `await`ed as terminals,
 *   while still supporting further chaining. The resolved value is controlled
 *   by calling `mock._setResolve(...)` before running the action.
 */
function makeMock(defaultResolve = { error: null as any, count: null as number | null, data: null as any }) {
    let resolveValue = { ...defaultResolve };

    const self: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn(),
        in: vi.fn(),
        _setResolve(v: typeof defaultResolve) { resolveValue = v; },
    };

    // Make a thenable proxy so `await chain.eq(...)` resolves, yet `.eq().eq()` still chains.
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

const defaultProfile = { id: 'user-1', role: 'academia/equipe', tenant_id: 'tenant-1' };

// ---------------------------------------------------------------------------
// registerAthleteAction
// ---------------------------------------------------------------------------

describe('registerAthleteAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should return error when profile is missing', async () => {
        (requireTenantScope as any).mockResolvedValue({ profile: null, tenant_id: 'tenant-1' });

        const result = await registerAthleteAction('event-1', 'athlete-1', 'cat-1');

        expect(result).toEqual({ error: 'Não autorizado.' });
    });

    it('should return error when athlete is already registered in the category', async () => {
        // First eq chain (duplicate check) resolves with existing data
        supabaseMock.single.mockResolvedValue({ data: { id: 'existing-reg' }, error: null });

        const result = await registerAthleteAction('event-1', 'athlete-1', 'cat-1');

        expect(result).toEqual({ error: 'Atleta já inscrito nesta categoria.' });
    });

    it('should register athlete successfully when no duplicate exists', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });
        supabaseMock.insert.mockResolvedValue({ error: null });

        const result = await registerAthleteAction('event-1', 'athlete-1', 'cat-1');

        expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
            event_id: 'event-1',
            athlete_id: 'athlete-1',
            category_id: 'cat-1',
            status: 'pendente',
            tenant_id: 'tenant-1',
            registered_by: 'user-1',
        }));
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith(
            '/academia-equipe/dashboard/eventos/event-1/inscricoes'
        );
        expect(revalidatePath).toHaveBeenCalledWith(
            '/academia-equipe/dashboard/eventos/disponiveis'
        );
    });

    it('should return error when database insert fails', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });
        supabaseMock.insert.mockResolvedValue({ error: { message: 'DB insert failed' } });

        const result = await registerAthleteAction('event-1', 'athlete-1', 'cat-1');

        expect(result).toEqual({ error: 'Erro ao realizar inscrição.' });
    });

    it('should set registered_by to the current user profile id', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });
        supabaseMock.insert.mockResolvedValue({ error: null });

        await registerAthleteAction('event-1', 'athlete-2', 'cat-2');

        expect(supabaseMock.insert).toHaveBeenCalledWith(
            expect.objectContaining({ registered_by: 'user-1' })
        );
    });
});

// ---------------------------------------------------------------------------
// removeRegistrationAction
// ---------------------------------------------------------------------------

describe('removeRegistrationAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should return error when registration is not found', async () => {
        supabaseMock.single.mockResolvedValue({ data: null, error: null });

        const result = await removeRegistrationAction('nonexistent-reg');

        expect(result).toEqual({ error: 'Inscrição não encontrada.' });
    });

    it('should allow registration owner to remove their own registration', async () => {
        // First single call: registration lookup → owned by current user
        supabaseMock.single
            .mockResolvedValueOnce({
                data: { registered_by: 'user-1', event_id: 'event-1', tenant_id: 'tenant-1' },
                error: null,
            })
            // Second single call: event lookup → different tenant (so isOrganizer = false)
            .mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });

        // delete chain terminal resolves OK
        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await removeRegistrationAction('reg-1');

        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith(
            '/academia-equipe/dashboard/eventos/event-1/inscricoes'
        );
    });

    it('should allow event organizer to remove any registration in their event', async () => {
        // registration created by a different user
        supabaseMock.single
            .mockResolvedValueOnce({
                data: { registered_by: 'other-user', event_id: 'event-1', tenant_id: 'other-tenant' },
                error: null,
            })
            // event belongs to user's tenant → isOrganizer = true
            .mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });

        supabaseMock._setResolve({ error: null, count: null, data: null });

        const result = await removeRegistrationAction('reg-2');

        expect(result).toEqual({ success: true });
    });

    it('should return permission error when user is neither owner nor organizer', async () => {
        supabaseMock.single
            .mockResolvedValueOnce({
                data: { registered_by: 'other-user', event_id: 'event-1', tenant_id: 'other-tenant' },
                error: null,
            })
            // event belongs to yet another tenant
            .mockResolvedValueOnce({ data: { tenant_id: 'third-tenant' }, error: null });

        const result = await removeRegistrationAction('reg-foreign');

        expect(result).toEqual({ error: 'Sem permissão para remover esta inscrição.' });
    });

    it('should return error when delete query fails', async () => {
        supabaseMock.single
            .mockResolvedValueOnce({
                data: { registered_by: 'user-1', event_id: 'event-1', tenant_id: 'tenant-1' },
                error: null,
            })
            .mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });

        supabaseMock._setResolve({ error: { message: 'Delete failed' }, count: null, data: null });

        const result = await removeRegistrationAction('reg-error');

        expect(result).toEqual({ error: 'Erro ao remover inscrição.' });
    });
});

// ---------------------------------------------------------------------------
// registerBatchAction
// ---------------------------------------------------------------------------

describe('registerBatchAction', () => {
    let supabaseMock: ReturnType<typeof makeMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMock = makeMock();
        (createClient as any).mockResolvedValue(supabaseMock);
        (requireTenantScope as any).mockResolvedValue({ profile: defaultProfile, tenant_id: 'tenant-1' });
    });

    it('should return error when profile is missing', async () => {
        (requireTenantScope as any).mockResolvedValue({ profile: null, tenant_id: 'tenant-1' });

        const result = await registerBatchAction('event-1', [{ athleteId: 'a1', categoryId: 'c1' }]);

        expect(result).toEqual({ error: 'Não autorizado.' });
    });

    it('should return error when registrations list is empty', async () => {
        const result = await registerBatchAction('event-1', []);
        expect(result).toEqual({ error: 'Nenhuma inscrição válida enviada.' });
    });

    it('should deduplicate same athleteId+categoryId pairs within the batch', async () => {
        // In the action: uniqueRegistrations will have length 1 after dedup
        supabaseMock.in.mockImplementation(() => {
            // eq chain that returns existing registrations (empty — no DB conflicts)
            const t: any = {
                then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
                catch: (rej: any) => Promise.resolve({ data: [], error: null }).catch(rej),
            };
            return t;
        });
        supabaseMock.insert.mockResolvedValue({ error: null });

        const result = await registerBatchAction('event-1', [
            { athleteId: 'a1', categoryId: 'c1' },
            { athleteId: 'a1', categoryId: 'c1' }, // duplicate
        ]);

        expect(result).toMatchObject({ success: true, count: 1, skipped: 0 });
        const insertArg = supabaseMock.insert.mock.calls[0][0];
        expect(insertArg).toHaveLength(1);
    });

    it('should skip athletes already registered in DB for the same category', async () => {
        supabaseMock.in.mockImplementation(() => {
            const t: any = {
                then: (resolve: any) => Promise.resolve({
                    data: [{ athlete_id: 'a1', category_id: 'c1' }], error: null
                }).then(resolve),
                catch: (rej: any) => Promise.resolve({
                    data: [{ athlete_id: 'a1', category_id: 'c1' }], error: null
                }).catch(rej),
            };
            return t;
        });
        supabaseMock.insert.mockResolvedValue({ error: null });

        const result = await registerBatchAction('event-1', [
            { athleteId: 'a1', categoryId: 'c1' }, // already in DB
            { athleteId: 'a2', categoryId: 'c2' }, // new
        ]);

        expect(result).toMatchObject({ success: true, count: 1, skipped: 1 });
    });

    it('should return error when all athletes are already registered', async () => {
        supabaseMock.in.mockImplementation(() => {
            const t: any = {
                then: (resolve: any) => Promise.resolve({
                    data: [{ athlete_id: 'a1', category_id: 'c1' }], error: null
                }).then(resolve),
                catch: (rej: any) => Promise.resolve({
                    data: [{ athlete_id: 'a1', category_id: 'c1' }], error: null
                }).catch(rej),
            };
            return t;
        });

        const result = await registerBatchAction('event-1', [{ athleteId: 'a1', categoryId: 'c1' }]);

        expect(result).toEqual({
            error: 'Todos os atletas selecionados já estão inscritos nas categorias indicadas.',
        });
    });

    it('should insert with correct status, tenant and event fields', async () => {
        supabaseMock.in.mockImplementation(() => {
            const t: any = {
                then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
                catch: (rej: any) => Promise.resolve({ data: [], error: null }).catch(rej),
            };
            return t;
        });
        supabaseMock.insert.mockResolvedValue({ error: null });

        await registerBatchAction('event-1', [
            { athleteId: 'a1', categoryId: 'c1' },
            { athleteId: 'a2', categoryId: 'c2' },
        ]);

        const insertArg = supabaseMock.insert.mock.calls[0][0];
        expect(insertArg).toHaveLength(2);
        insertArg.forEach((reg: any) => {
            expect(reg.status).toBe('pendente');
            expect(reg.tenant_id).toBe('tenant-1');
            expect(reg.event_id).toBe('event-1');
        });
    });

    it('should return error when batch insert fails', async () => {
        supabaseMock.in.mockImplementation(() => {
            const t: any = {
                then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
                catch: (rej: any) => Promise.resolve({ data: [], error: null }).catch(rej),
            };
            return t;
        });
        supabaseMock.insert.mockResolvedValue({ error: { message: 'Batch insert failed' } });

        const result = await registerBatchAction('event-1', [{ athleteId: 'a1', categoryId: 'c1' }]);

        expect(result).toEqual({ error: 'Erro ao realizar inscrições em lote.' });
    });
});

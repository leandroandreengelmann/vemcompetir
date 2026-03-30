import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeCategoryAction } from '../registrations-actions';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth-guards', () => ({ requireTenantScope: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/token-utils', () => ({
    consumeTokens: vi.fn().mockResolvedValue({ success: true }),
    refundTokens: vi.fn().mockResolvedValue({ success: true }),
    getEventTenantId: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/registration-logic', () => ({
    checkEligibility: vi.fn(),
    parseAgeRangeFromText: vi.fn(),
    isMasterLivre: vi.fn(),
    normalizeText: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

/**
 * Builds an admin client mock that handles the three DB operations in
 * changeCategoryAction:
 *   1. event_registrations → .select(...).eq(...).single()   — load reg
 *   2. event_registrations → .update({...}).eq(...)          — update category
 *   3. registration_category_changes → .insert({...})        — audit log
 */
function makeAdminMock(opts: {
    regData?: object | null;
    regError?: object | null;
    updateError?: object | null;
} = {}) {
    const singleFn = vi.fn().mockResolvedValue({
        data: opts.regData ?? null,
        error: opts.regError ?? null,
    });

    const updateEqFn = vi.fn().mockResolvedValue({ error: opts.updateError ?? null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const adminMock: any = {
        from: vi.fn().mockImplementation((table: string) => {
            if (table === 'event_registrations') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({ single: singleFn }),
                    }),
                    update: updateFn,
                };
            }
            if (table === 'registration_category_changes') {
                return { insert: insertAuditFn };
            }
            return {};
        }),
        _singleFn: singleFn,
        _updateEqFn: updateEqFn,
        _insertAuditFn: insertAuditFn,
    };

    return adminMock;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const defaultProfile = { id: 'user-1', role: 'academia/equipe', tenant_id: 'tenant-1' };

// Event date far enough in the future so deadline is not exceeded.
// today = 2026-03-27, event = 2026-05-01, deadline_days = 7 → deadline = 2026-04-24 → OK
const validReg = {
    id: 'reg-1',
    status: 'pago',
    athlete_id: 'athlete-1',
    category_id: 'cat-old',
    event_id: 'event-1',
    tenant_id: 'tenant-1',
    event: {
        event_date: '2026-05-01T00:00:00Z',
        category_change_deadline_days: 7,
        tenant_id: 'event-tenant-1',
    },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('changeCategoryAction', () => {
    let adminMock: ReturnType<typeof makeAdminMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeAdminMock({ regData: validReg });
        (createAdminClient as any).mockReturnValue(adminMock);
        (requireTenantScope as any).mockResolvedValue({
            profile: defaultProfile,
            tenant_id: 'tenant-1',
        });
    });

    // -----------------------------------------------------------------------
    // Guard: registration not found
    // -----------------------------------------------------------------------

    it('returns error when registration is not found', async () => {
        adminMock = makeAdminMock({ regData: null, regError: { code: 'PGRST116' } });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('nonexistent', 'cat-new');

        expect(result).toEqual({ error: 'Inscrição não encontrada.' });
    });

    // -----------------------------------------------------------------------
    // Guard: permission
    // -----------------------------------------------------------------------

    it('returns permission error when caller is neither registration tenant nor organizer', async () => {
        const foreignReg = {
            ...validReg,
            tenant_id: 'other-tenant',           // not caller's tenant
            event: { ...validReg.event, tenant_id: 'yet-another-tenant' }, // not organizer either
        };
        adminMock = makeAdminMock({ regData: foreignReg });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ error: 'Sem permissão para alterar esta inscrição.' });
    });

    it('allows change when caller is event organizer (different registration tenant)', async () => {
        const orgReg = {
            ...validReg,
            tenant_id: 'other-tenant',           // NOT caller's tenant
            event: { ...validReg.event, tenant_id: 'tenant-1' }, // BUT caller IS organizer
        };
        adminMock = makeAdminMock({ regData: orgReg });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ success: true });
    });

    // -----------------------------------------------------------------------
    // Guard: status
    // -----------------------------------------------------------------------

    it('returns error when registration status is "pendente"', async () => {
        adminMock = makeAdminMock({ regData: { ...validReg, status: 'pendente' } });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({
            error: 'Só é possível trocar categoria de inscrições pagas ou confirmadas.',
        });
    });

    it('returns error when registration status is "aguardando_pagamento"', async () => {
        adminMock = makeAdminMock({ regData: { ...validReg, status: 'aguardando_pagamento' } });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({
            error: 'Só é possível trocar categoria de inscrições pagas ou confirmadas.',
        });
    });

    it('allows change when status is "confirmado"', async () => {
        adminMock = makeAdminMock({ regData: { ...validReg, status: 'confirmado' } });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ success: true });
    });

    it('allows change when status is "isento"', async () => {
        adminMock = makeAdminMock({ regData: { ...validReg, status: 'isento' } });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ success: true });
    });

    // -----------------------------------------------------------------------
    // Guard: deadline_days = 0 means "not allowed"
    // -----------------------------------------------------------------------

    it('returns error when event has category_change_deadline_days = 0', async () => {
        const regNoChange = {
            ...validReg,
            event: { ...validReg.event, category_change_deadline_days: 0 },
        };
        adminMock = makeAdminMock({ regData: regNoChange });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ error: 'Este evento não permite troca de categoria.' });
    });

    // -----------------------------------------------------------------------
    // Guard: past deadline
    // -----------------------------------------------------------------------

    it('returns error when deadline has already passed', async () => {
        // Event date 2026-04-01, deadline_days 7 → deadline 2026-03-25 → already past today 2026-03-27
        const regPastDeadline = {
            ...validReg,
            event: {
                ...validReg.event,
                event_date: '2026-04-01T00:00:00Z',
                category_change_deadline_days: 7,
            },
        };
        adminMock = makeAdminMock({ regData: regPastDeadline });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toMatchObject({ error: expect.stringContaining('Prazo para troca de categoria encerrado') });
    });

    // -----------------------------------------------------------------------
    // Guard: same category
    // -----------------------------------------------------------------------

    it('returns error when new category is the same as current', async () => {
        const result = await changeCategoryAction('reg-1', 'cat-old'); // same as validReg.category_id

        expect(result).toEqual({
            error: 'A categoria selecionada é a mesma da inscrição atual.',
        });
    });

    // -----------------------------------------------------------------------
    // Guard: update DB error
    // -----------------------------------------------------------------------

    it('returns error when DB update fails', async () => {
        adminMock = makeAdminMock({
            regData: validReg,
            updateError: { message: 'constraint violation' },
        });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ error: 'Erro ao atualizar categoria.' });
    });

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    it('updates category and inserts audit record on success', async () => {
        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ success: true });

        // Registration updated with new category
        expect(adminMock._updateEqFn).toHaveBeenCalledWith('id', 'reg-1');

        // Audit record inserted with correct fields
        expect(adminMock._insertAuditFn).toHaveBeenCalledWith(expect.objectContaining({
            registration_id: 'reg-1',
            changed_by: 'user-1',
            old_category_id: 'cat-old',
            new_category_id: 'cat-new',
        }));

        // Cache revalidated
        expect(revalidatePath).toHaveBeenCalledWith(
            '/academia-equipe/dashboard/eventos/event-1/inscricoes',
        );
    });

    it('handles event returned as array (Supabase join quirk)', async () => {
        const regWithArrayEvent = {
            ...validReg,
            event: [validReg.event], // Supabase sometimes returns array on joins
        };
        adminMock = makeAdminMock({ regData: regWithArrayEvent });
        (createAdminClient as any).mockReturnValue(adminMock);

        const result = await changeCategoryAction('reg-1', 'cat-new');

        expect(result).toEqual({ success: true });
    });
});

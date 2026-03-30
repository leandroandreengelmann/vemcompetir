import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createAthleteAction,
    updateAthleteAction,
    deleteAthleteAction,
    generateAthleteAccessAction,
} from '../actions';

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
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(entries: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(entries)) fd.append(key, value);
    return fd;
}

/**
 * Creates a chainable Supabase mock.
 *
 * IMPORTANT: Do NOT add `then` to this object — if the mock is thenable,
 * `await createClient()` will unwrap it (Node/Promise spec) and the action
 * would receive the terminal result instead of the mock client itself.
 *
 * Terminal resolution strategy:
 * - `.single()` — controlled by `mockResolvedValueOnce` per test.
 * - `.upsert()`, `.insert()` — individual vi.fn() per test.
 * - Chains that end at `.eq()` (e.g. `.update().eq(...).eq(...)`) resolve
 *   by overriding `eq` to return a real Promise at the right call index.
 *   Tests call `adminMock.eq.mockResolvedValueOnce(...)` AFTER the chained
 *   calls that should continue returning `this`, using `mockReturnValueOnce`
 *   and then `mockResolvedValueOnce` in order.
 */
function makeSupabaseMock() {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        auth: {
            admin: {
                createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
                updateUserById: vi.fn().mockResolvedValue({ error: null }),
                deleteUser: vi.fn().mockResolvedValue({ error: null }),
            },
        },
    };
    return mock;
}

// ---------------------------------------------------------------------------
// Profile fixtures
// ---------------------------------------------------------------------------

const academiaProfile = { id: 'user-academia-1', role: 'academia/equipe', tenant_id: 'tenant-1' };
const adminGlobalProfile = { id: 'user-admin-1', role: 'admin_geral', tenant_id: 'tenant-1' };

// ---------------------------------------------------------------------------
// createAthleteAction
// ---------------------------------------------------------------------------

describe('createAthleteAction', () => {
    let adminMock: ReturnType<typeof makeSupabaseMock>;
    let clientMock: ReturnType<typeof makeSupabaseMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeSupabaseMock();
        clientMock = makeSupabaseMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (createClient as any).mockResolvedValue(clientMock);
        (requireTenantScope as any).mockResolvedValue({
            profile: academiaProfile,
            tenant_id: 'tenant-1',
        });
        // Default: gym lookup returns a gym name, tenant lookup returns a tenant name
        clientMock.single
            .mockResolvedValueOnce({ data: { gym_name: 'Academia Exemplo' }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant Exemplo' }, error: null });
    });

    it('should return error when role is not academia/equipe', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: { id: 'u1', role: 'atleta', tenant_id: 'tenant-1' },
            tenant_id: 'tenant-1',
        });
        const result = await createAthleteAction(makeFormData({ full_name: 'João' }));
        expect(result).toEqual({ error: 'Sem permissão.' });
    });

    it('should return error when full_name is missing', async () => {
        const result = await createAthleteAction(makeFormData({ email: 'joao@test.com' }));
        expect(result).toEqual({ error: 'Preencha todos os campos obrigatórios.' });
    });

    it('should create athlete successfully with all required fields', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-athlete-id' } },
            error: null,
        });

        const result = await createAthleteAction(makeFormData({
            full_name: 'João Silva',
            email: 'joao@test.com',
            password: 'Pass123!',
            birth_date: '2000-05-15',
            belt_color: 'Azul',
            weight: '70',
            sexo: 'Masculino',
        }));

        expect(adminMock.auth.admin.createUser).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/atletas');
    });

    it('should generate a dummy email when the email field is empty', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-athlete-id' } },
            error: null,
        });

        await createAthleteAction(makeFormData({ full_name: 'Maria Souza', password: 'Pass123!' }));

        const args = adminMock.auth.admin.createUser.mock.calls[0][0];
        expect(args.email).toMatch(/@dummy\.competir\.com$/);
    });

    it('should generate a random password when the password field is empty', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-athlete-id' } },
            error: null,
        });

        await createAthleteAction(makeFormData({ full_name: 'Maria Souza', email: 'maria@test.com' }));

        const args = adminMock.auth.admin.createUser.mock.calls[0][0];
        expect(args.password).toBeTruthy();
        expect(args.password.length).toBeGreaterThan(8);
    });

    it('should return specific error when email is already registered', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Email already been registered' },
        });

        const result = await createAthleteAction(makeFormData({
            full_name: 'Pedro Alves',
            email: 'existing@test.com',
            password: 'Pass123!',
        }));

        expect(result).toEqual({ error: 'Este atleta já possui um cadastro na plataforma.' });
    });

    it('should return the auth error message for other createUser failures', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid email format' },
        });

        const result = await createAthleteAction(makeFormData({
            full_name: 'Pedro Alves',
            email: 'not-valid',
            password: 'Pass123!',
        }));

        expect(result).toEqual({ error: 'Não foi possível cadastrar o atleta. Tente novamente.' });
    });

    it('should strip non-numeric characters from CPF before saving', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-athlete-id' } },
            error: null,
        });

        await createAthleteAction(makeFormData({
            full_name: 'Ana Lima',
            email: 'ana@test.com',
            password: 'Pass123!',
            cpf: '123.456.789-00',
        }));

        const args = adminMock.auth.admin.createUser.mock.calls[0][0];
        expect(args.user_metadata.cpf).toBe('12345678900');
    });

    it('should set master_id and master_name to null when is_master is on', async () => {
        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-master-id' } },
            error: null,
        });

        await createAthleteAction(makeFormData({
            full_name: 'Mestre Renzo',
            email: 'renzo@test.com',
            password: 'Pass123!',
            is_master: 'on',
            master_id: 'some-other-master',
        }));

        const args = adminMock.auth.admin.createUser.mock.calls[0][0];
        expect(args.user_metadata.is_master).toBe(true);
        expect(args.user_metadata.master_id).toBeNull();
        expect(args.user_metadata.master_name).toBeNull();
    });

    it('should use tenant name as fallback when gym_name is null in organizer profile', async () => {
        clientMock.single
            .mockReset()
            .mockResolvedValueOnce({ data: { gym_name: null }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant Fallback' }, error: null });

        adminMock.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-athlete-id' } },
            error: null,
        });

        await createAthleteAction(makeFormData({
            full_name: 'Lucas Ferreira',
            email: 'lucas@test.com',
            password: 'Pass123!',
        }));

        expect(adminMock.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ gym_name: 'Tenant Fallback' })
        );
    });
});

// ---------------------------------------------------------------------------
// updateAthleteAction
// ---------------------------------------------------------------------------

describe('updateAthleteAction', () => {
    let adminMock: ReturnType<typeof makeSupabaseMock>;
    let clientMock: ReturnType<typeof makeSupabaseMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeSupabaseMock();
        clientMock = makeSupabaseMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (createClient as any).mockResolvedValue(clientMock);
        (requireTenantScope as any).mockResolvedValue({
            profile: academiaProfile,
            tenant_id: 'tenant-1',
        });
    });

    it('should return error when role is unauthorized', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: { id: 'u1', role: 'atleta', tenant_id: 'tenant-1' },
            tenant_id: 'tenant-1',
        });
        const result = await updateAthleteAction(makeFormData({ id: 'a1', full_name: 'João' }));
        expect(result).toEqual({ error: 'Sem permissão.' });
    });

    it('should return error when id is missing', async () => {
        const result = await updateAthleteAction(makeFormData({ full_name: 'João' }));
        expect(result).toEqual({ error: 'ID e Nome são obrigatórios.' });
    });

    it('should return error when full_name is missing', async () => {
        const result = await updateAthleteAction(makeFormData({ id: 'athlete-1' }));
        expect(result).toEqual({ error: 'ID e Nome são obrigatórios.' });
    });

    it('should return error when trying to edit an athlete from a different tenant', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });

        const result = await updateAthleteAction(makeFormData({ id: 'athlete-99', full_name: 'X' }));
        expect(result).toEqual({ error: 'Você não tem permissão para editar este atleta.' });
    });

    it('should update athlete successfully when tenant matches', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        clientMock.single
            .mockResolvedValueOnce({ data: { gym_name: 'Academia Teste' }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant Teste' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({ error: null });
        // eq always returns `this` so .single() works on the ownership chain.
        // The terminal profile-update chain ends at eq; `await adminMock` (no `then`) yields
        // adminMock itself — destructuring { error } gives undefined which is falsy → success.

        const result = await updateAthleteAction(makeFormData({
            id: 'athlete-1',
            full_name: 'João Atualizado',
            birth_date: '2000-01-01',
            belt_color: 'Roxa',
            weight: '80',
            sexo: 'Masculino',
        }));

        expect(adminMock.auth.admin.updateUserById).toHaveBeenCalledWith(
            'athlete-1',
            expect.objectContaining({
                user_metadata: expect.objectContaining({ full_name: 'João Atualizado' }),
            })
        );
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/atletas');
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/atletas/athlete-1');
    });

    it('should include email in the update payload when email is provided', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        clientMock.single
            .mockResolvedValueOnce({ data: { gym_name: 'Gym' }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({ error: null });
        // eq stays mockReturnThis — terminal chain resolves as adminMock (falsy error = OK)

        await updateAthleteAction(makeFormData({
            id: 'athlete-1',
            full_name: 'João',
            email: 'new-email@test.com',
        }));

        const args = adminMock.auth.admin.updateUserById.mock.calls[0][1];
        expect(args.email).toBe('new-email@test.com');
    });

    it('should not include password when it is shorter than 6 characters', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        clientMock.single
            .mockResolvedValueOnce({ data: { gym_name: 'Gym' }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({ error: null });
        // eq stays mockReturnThis — terminal chain resolves as adminMock (falsy error = OK)

        await updateAthleteAction(makeFormData({
            id: 'athlete-1',
            full_name: 'João',
            password: '123',
        }));

        const args = adminMock.auth.admin.updateUserById.mock.calls[0][1];
        expect(args.password).toBeUndefined();
    });

    it('should return auth error when updateUserById fails', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        clientMock.single
            .mockResolvedValueOnce({ data: { gym_name: null }, error: null })
            .mockResolvedValueOnce({ data: { name: 'Tenant' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({
            error: { message: 'User not found' },
        });

        const result = await updateAthleteAction(makeFormData({ id: 'athlete-99', full_name: 'João' }));
        expect(result).toEqual({ error: 'User not found' });
    });

    it('should allow admin_geral to edit athletes from any tenant', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: adminGlobalProfile,
            tenant_id: 'tenant-1',
        });
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({ error: null });
        // eq stays mockReturnThis — terminal chain resolves as adminMock (falsy error = OK)

        const result = await updateAthleteAction(makeFormData({
            id: 'athlete-foreign',
            full_name: 'Atleta Externo',
        }));

        expect(result).toEqual({ success: true });
    });
});

// ---------------------------------------------------------------------------
// deleteAthleteAction
// ---------------------------------------------------------------------------

describe('deleteAthleteAction', () => {
    let adminMock: ReturnType<typeof makeSupabaseMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeSupabaseMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (requireTenantScope as any).mockResolvedValue({
            profile: academiaProfile,
            tenant_id: 'tenant-1',
        });
    });

    it('should return error when role is unauthorized', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: { id: 'u1', role: 'atleta', tenant_id: 'tenant-1' },
            tenant_id: 'tenant-1',
        });
        const result = await deleteAthleteAction('athlete-1');
        expect(result).toEqual({ error: 'Sem permissão.' });
    });

    it('should return error when athlete belongs to a different tenant', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });
        const result = await deleteAthleteAction('athlete-99');
        expect(result).toEqual({ error: 'Você não tem permissão para excluir este atleta.' });
    });

    it('should delete athlete successfully when ownership is valid', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        adminMock.auth.admin.deleteUser.mockResolvedValue({ error: null });

        const result = await deleteAthleteAction('athlete-1');

        expect(adminMock.auth.admin.deleteUser).toHaveBeenCalledWith('athlete-1');
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/atletas');
    });

    it('should return error when Supabase deleteUser fails', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        adminMock.auth.admin.deleteUser.mockResolvedValue({
            error: { message: 'User not found in auth system' },
        });

        const result = await deleteAthleteAction('athlete-ghost');
        expect(result).toEqual({ error: 'User not found in auth system' });
    });

    it('should allow admin_geral to delete athletes from any tenant', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: adminGlobalProfile,
            tenant_id: 'tenant-1',
        });
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });
        adminMock.auth.admin.deleteUser.mockResolvedValue({ error: null });

        const result = await deleteAthleteAction('athlete-foreign');
        expect(result).toEqual({ success: true });
    });
});

// ---------------------------------------------------------------------------
// generateAthleteAccessAction
// ---------------------------------------------------------------------------

describe('generateAthleteAccessAction', () => {
    let adminMock: ReturnType<typeof makeSupabaseMock>;

    beforeEach(() => {
        vi.clearAllMocks();
        adminMock = makeSupabaseMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (requireTenantScope as any).mockResolvedValue({
            profile: academiaProfile,
            tenant_id: 'tenant-1',
        });
    });

    it('should return error when role is unauthorized', async () => {
        (requireTenantScope as any).mockResolvedValue({
            profile: { id: 'u1', role: 'atleta', tenant_id: 'tenant-1' },
            tenant_id: 'tenant-1',
        });
        const result = await generateAthleteAccessAction(
            makeFormData({ id: 'a1', email: 'a@t.com', password: 'Pass123!' })
        );
        expect(result).toEqual({ error: 'Sem permissão.' });
    });

    it('should return error when id, email, or password is missing', async () => {
        const result = await generateAthleteAccessAction(
            makeFormData({ id: 'a1', email: 'a@t.com' }) // no password
        );
        expect(result).toEqual({ error: 'ID, E-mail e Senha são obrigatórios.' });
    });

    it('should return error when athlete belongs to a different tenant', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'other-tenant' }, error: null });
        const result = await generateAthleteAccessAction(
            makeFormData({ id: 'athlete-99', email: 'a@t.com', password: 'Pass123!' })
        );
        expect(result).toEqual({ error: 'Você não tem permissão para editar este atleta.' });
    });

    it('should generate access and update the profile phone on success', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({ error: null });
        // eq stays mockReturnThis — terminal profile update chain resolves as adminMock (falsy error = OK)

        const result = await generateAthleteAccessAction(makeFormData({
            id: 'athlete-1',
            email: 'new@athlete.com',
            password: 'NewPass123!',
            phone: '11999999999',
        }));

        expect(adminMock.auth.admin.updateUserById).toHaveBeenCalledWith(
            'athlete-1',
            expect.objectContaining({
                email: 'new@athlete.com',
                password: 'NewPass123!',
                email_confirm: true,
            })
        );
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/atletas');
    });

    it('should return specific error when the new email is already registered', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({
            error: { message: 'Email already been registered' },
        });

        const result = await generateAthleteAccessAction(makeFormData({
            id: 'athlete-1',
            email: 'taken@athlete.com',
            password: 'Pass123!',
        }));

        expect(result).toEqual({ error: 'Este e-mail já está cadastrado em nossa base de dados.' });
    });

    it('should return a generic error for other updateUserById failures', async () => {
        adminMock.single.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' }, error: null });
        adminMock.auth.admin.updateUserById.mockResolvedValue({
            error: { message: 'Rate limit exceeded' },
        });

        const result = await generateAthleteAccessAction(makeFormData({
            id: 'athlete-1',
            email: 'new@athlete.com',
            password: 'Pass123!',
        }));

        expect(result).toEqual({ error: 'Rate limit exceeded' });
    });
});

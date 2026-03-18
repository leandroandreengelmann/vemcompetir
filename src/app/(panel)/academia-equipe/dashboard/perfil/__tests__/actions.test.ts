import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAcademiaProfile } from '../actions';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth-guards', () => ({
    requireRole: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocking
// ---------------------------------------------------------------------------

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(entries: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(entries)) {
        fd.append(key, value);
    }
    return fd;
}

function makeAdminMock() {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
    };
    return mock;
}

// ---------------------------------------------------------------------------
// updateAcademiaProfile
// ---------------------------------------------------------------------------

describe('updateAcademiaProfile', () => {
    let adminMock: ReturnType<typeof makeAdminMock>;

    beforeEach(() => {
        vi.clearAllMocks();

        adminMock = makeAdminMock();
        (createAdminClient as any).mockReturnValue(adminMock);
        (requireRole as any).mockResolvedValue({
            user: { id: 'user-academia-1' },
            profile: { id: 'user-academia-1', role: 'academia/equipe', tenant_id: 'tenant-1' },
        });
    });

    it('should update profile successfully with all valid fields', async () => {
        const fd = makeFormData({
            gymName: 'Academia Exemplo',
            cpf: '123.456.789-00',
            phone: '(11) 99999-9999',
        });

        const result = await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({
                gym_name: 'Academia Exemplo',
                cpf: '12345678900',
                phone: '11999999999',
            })
        );
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/academia-equipe/dashboard/perfil');
    });

    it('should strip non-numeric characters from CPF before saving', async () => {
        const fd = makeFormData({ gymName: 'Gym', cpf: '111.222.333-44' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ cpf: '11122233344' })
        );
    });

    it('should strip non-numeric characters from phone before saving', async () => {
        const fd = makeFormData({ gymName: 'Gym', phone: '+55 (11) 9 8765-4321' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ phone: '5511987654321' })
        );
    });

    it('should save null for gymName when the field is empty', async () => {
        const fd = makeFormData({ gymName: '' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ gym_name: null })
        );
    });

    it('should save null for CPF when the field is empty', async () => {
        const fd = makeFormData({ gymName: 'Gym', cpf: '' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ cpf: null })
        );
    });

    it('should save null for phone when the field is empty', async () => {
        const fd = makeFormData({ gymName: 'Gym', phone: '' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ phone: null })
        );
    });

    it('should scope update to current user id', async () => {
        const fd = makeFormData({ gymName: 'Gym' });

        await updateAcademiaProfile(fd);

        const eqCalls = adminMock.eq.mock.calls;
        const idCall = eqCalls.find((call: any[]) => call[0] === 'id');
        expect(idCall![1]).toBe('user-academia-1');
    });

    it('should return specific error when CPF/CNPJ is already in use (unique constraint violation)', async () => {
        adminMock.eq.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

        const fd = makeFormData({ cpf: '000.000.000-00' });

        const result = await updateAcademiaProfile(fd);

        expect(result).toEqual({ error: 'Este CPF/CNPJ já está cadastrado em outra conta.' });
    });

    it('should return generic error for other database errors', async () => {
        adminMock.eq.mockResolvedValue({ error: { code: '42P01', message: 'relation not found' } });

        const fd = makeFormData({ gymName: 'Gym' });

        const result = await updateAcademiaProfile(fd);

        expect(result).toEqual({
            error: 'Ocorreu um erro ao atualizar o perfil: relation not found',
        });
    });

    it('should return unauthorized error when requireRole throws', async () => {
        (requireRole as any).mockRejectedValue(new Error('Unauthorized'));

        const fd = makeFormData({ gymName: 'Gym' });

        const result = await updateAcademiaProfile(fd);

        expect(result).toEqual({ error: 'Não autorizado.' });
    });

    it('should include an updated_at timestamp in the update payload', async () => {
        const fd = makeFormData({ gymName: 'Gym' });

        await updateAcademiaProfile(fd);

        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ updated_at: expect.any(String) })
        );
    });

    it('should only allow academia/equipe and admin_geral roles', async () => {
        // requireRole is already called with the correct role list - verify
        const fd = makeFormData({ gymName: 'Gym' });

        await updateAcademiaProfile(fd);

        expect(requireRole).toHaveBeenCalledWith(['academia/equipe', 'admin_geral']);
    });

    it('should save an empty string for CPF when input contains only letters', async () => {
        const fd = makeFormData({ gymName: 'Gym', cpf: 'ABC-DEF-GHI' });

        await updateAcademiaProfile(fd);

        // 'ABC-DEF-GHI'.replace(/\D/g, '') === '' — the action saves rawCpf as-is without
        // a further falsy check, so the DB receives an empty string.
        expect(adminMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ cpf: '' })
        );
    });
});

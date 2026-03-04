import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEventFee } from './fee-calculator'
import { createAdminClient } from './supabase/admin'

// Mock the admin client
vi.mock('./supabase/admin', () => ({
    createAdminClient: vi.fn(),
}))

describe('getEventFee', () => {
    const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
            ; (createAdminClient as any).mockReturnValue(mockSupabase)
    })

    it('should return event-specific fee when it exists and is valid', async () => {
        mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: { value: '15.50' },
            error: null,
        })

        const result = await getEventFee('event-123')

        expect(result).toEqual({ fee: 15.5, source: 'EVENT_SPECIFIC' })
        expect(mockSupabase.eq).toHaveBeenCalledWith('key', 'event_tax_event-123')
    })

    it('should fallback to global default fee when event-specific is missing', async () => {
        // First call (specific) returns null
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
        // Second call (global) returns default value
        mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: { value: '10.00' },
            error: null,
        })

        const result = await getEventFee('event-456')

        expect(result).toEqual({ fee: 10, source: 'GLOBAL_DEFAULT' })
        expect(mockSupabase.eq).toHaveBeenCalledWith('key', 'own_event_registration_tax')
    })

    it('should return 0 fee if no fees are configured', async () => {
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })

        const result = await getEventFee('event-789')

        expect(result).toEqual({ fee: 0, source: 'NONE' })
    })
})

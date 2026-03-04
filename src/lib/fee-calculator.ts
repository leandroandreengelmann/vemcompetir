'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export interface EventFeeResult {
    fee: number;
    source: 'EVENT_SPECIFIC' | 'GLOBAL_DEFAULT' | 'NONE';
}

/**
 * Get the SaaS fee per inscription for a given event.
 * Priority: event_tax_{eventId} → own_event_registration_tax → 0
 */
export async function getEventFee(eventId: string): Promise<EventFeeResult> {
    const supabase = createAdminClient();

    // Try event-specific first
    const { data: specific } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `event_tax_${eventId}`)
        .maybeSingle();

    if (specific?.value) {
        const fee = parseFloat(specific.value);
        if (!isNaN(fee) && fee > 0) {
            return { fee, source: 'EVENT_SPECIFIC' };
        }
    }

    // Fallback to global default
    const { data: global } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'own_event_registration_tax')
        .maybeSingle();

    if (global?.value) {
        const fee = parseFloat(global.value);
        if (!isNaN(fee) && fee > 0) {
            return { fee, source: 'GLOBAL_DEFAULT' };
        }
    }

    return { fee: 0, source: 'NONE' };
}

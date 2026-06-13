'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Conta quantas pessoas estão na página de chaves do evento em TEMPO REAL via
// Realtime Presence (efêmero, sem banco).
// - `track=true`  → o cliente entra na presença (visitante público).
// - `track=false` → apenas observa a contagem (card do admin).
export function usePresence(eventId: string, track: boolean): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!eventId) return;
        const supabase = createClient();
        const channel = supabase.channel(`presence:chaves:${eventId}`, {
            config: { presence: { key: crypto.randomUUID() } },
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            setCount(Object.keys(state).length);
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && track) {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId, track]);

    return count;
}

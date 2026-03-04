import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

export interface PublicEvent {
    id: string;
    title: string;
    event_date: string;
    location?: string;
    address_city?: string;
    address_state?: string;
    image_path?: string;
    status: string;
    // Mapings for UI
    starts_at?: string;
    venue_name?: string;
    city?: string;
    state?: string;
    cover_image_path?: string;
}

/**
 * Busca todos os eventos com status 'publicado'
 */
export const getPublishedEvents = cache(async (): Promise<PublicEvent[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'publicado')
        .order('event_date', { ascending: true });

    if (error) {
        console.error('Error fetching published events:', error);
        return [];
    }

    // Map existing fields to suggested names for UI consistency
    return (data || []).map(event => ({
        ...event,
        starts_at: event.event_date,
        venue_name: event.location,
        city: event.address_city,
        state: event.address_state,
        cover_image_path: event.image_path
    }));
});

/**
 * Busca um evento específico pelo ID se estiver publicado
 */
export const getPublishedEventById = cache(async (id: string): Promise<PublicEvent | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('status', 'publicado')
        .single();

    if (error || !data) {
        return null;
    }

    return {
        ...data,
        starts_at: data.event_date,
        venue_name: data.location,
        city: data.address_city,
        state: data.address_state,
        cover_image_path: data.image_path
    };
});

/**
 * Busca um evento específico pelo ID (incluindo não-publicados)
 * Usado para prévia administrativa
 */
export const getEventByIdAdmin = cache(async (id: string): Promise<PublicEvent | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        ...data,
        starts_at: data.event_date,
        venue_name: data.location,
        city: data.address_city,
        state: data.address_state,
        cover_image_path: data.image_path
    };
});



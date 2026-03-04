-- Migration: Expand Events Table with Address and Image
-- Date: 2026-02-13

DO $$ 
BEGIN
    -- Add address fields
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_street') THEN
        ALTER TABLE public.events ADD COLUMN address_street text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_number') THEN
        ALTER TABLE public.events ADD COLUMN address_number text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_neighborhood') THEN
        ALTER TABLE public.events ADD COLUMN address_neighborhood text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_city') THEN
        ALTER TABLE public.events ADD COLUMN address_city text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_state') THEN
        ALTER TABLE public.events ADD COLUMN address_state text;
    END IF;

    -- Add image path field
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'image_path') THEN
        ALTER TABLE public.events ADD COLUMN image_path text;
    END IF;

END $$;

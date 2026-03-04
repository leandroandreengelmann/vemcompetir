-- Migration: Refine events table
-- Adds address_zip and removes description field

DO $$ 
BEGIN
    -- Add address_zip field
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'address_zip') THEN
        ALTER TABLE public.events ADD COLUMN address_zip text;
    END IF;

    -- Remove description field if it exists
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE public.events DROP COLUMN description;
    END IF;
END $$;

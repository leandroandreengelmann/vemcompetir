ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS secondary_image_1_path TEXT,
    ADD COLUMN IF NOT EXISTS secondary_image_2_path TEXT;

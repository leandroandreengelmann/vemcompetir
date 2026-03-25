ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS passport_font text,
ADD COLUMN IF NOT EXISTS passport_border_radius integer;

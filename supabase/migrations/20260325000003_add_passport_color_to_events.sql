ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS passport_bg_from text,
ADD COLUMN IF NOT EXISTS passport_bg_via text;

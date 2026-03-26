-- Add category change configuration to events table.
-- registration_end_date: last day athletes can register for the event.
-- category_change_deadline_days: how many days before event_date the academy can still change a paid registration's category.
--   0 = category changes not allowed.

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS registration_end_date date,
    ADD COLUMN IF NOT EXISTS category_change_deadline_days int NOT NULL DEFAULT 0;

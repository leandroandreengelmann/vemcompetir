-- Migration: Fix snapshot date columns — change from date to text
-- Snapshots are historical display data, not queryable dates.
-- The formatted pt-BR strings ("21/03/2026") are incompatible with PostgreSQL date type.

ALTER TABLE public.athlete_term_acceptances
    ALTER COLUMN event_start_date_snapshot TYPE text,
    ALTER COLUMN event_end_date_snapshot   TYPE text;

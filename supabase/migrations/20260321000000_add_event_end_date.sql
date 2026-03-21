-- Migration: Add event_end_date to events table
-- Date: 2026-03-21

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS event_end_date date;

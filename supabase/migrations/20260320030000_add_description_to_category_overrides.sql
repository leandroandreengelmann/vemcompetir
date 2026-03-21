-- Add description field to event_category_overrides
-- Allows organizers to add a text observation/note per category within an event.
ALTER TABLE event_category_overrides
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Add price column to event_registrations
ALTER TABLE event_registrations ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00;

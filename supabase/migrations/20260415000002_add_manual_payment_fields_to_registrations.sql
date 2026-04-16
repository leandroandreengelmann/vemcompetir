ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS manual_payment_method TEXT,
    ADD COLUMN IF NOT EXISTS manual_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS manual_payment_notes TEXT;

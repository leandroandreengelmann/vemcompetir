-- Add promo tracking fields to event_registrations
-- promo_type_applied: which promo was applied to this registration (e.g. 'free_second_registration')
-- promo_source_id: id of the registration that triggered/sponsored this promo (e.g. the Absoluto registration)
ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS promo_type_applied TEXT,
    ADD COLUMN IF NOT EXISTS promo_source_id UUID;

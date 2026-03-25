-- Add signed term tracking columns to athlete_guardian_declarations
ALTER TABLE athlete_guardian_declarations
    ADD COLUMN IF NOT EXISTS signed_term_url text,
    ADD COLUMN IF NOT EXISTS signed_term_status text NOT NULL DEFAULT 'pending' CHECK (signed_term_status IN ('pending', 'under_review', 'approved')),
    ADD COLUMN IF NOT EXISTS signed_term_at timestamptz;

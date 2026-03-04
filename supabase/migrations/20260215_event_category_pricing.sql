-- Add registration_fee to event_category_tables (Bulk price for the group)
ALTER TABLE event_category_tables 
ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10, 2) DEFAULT 0;

-- Create event_category_overrides for individual category pricing
CREATE TABLE IF NOT EXISTS event_category_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES category_rows(id) ON DELETE CASCADE,
    registration_fee NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, category_id)
);

-- Enable RLS
ALTER TABLE event_category_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for event_category_overrides
-- Everyone can view prices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view event category overrides') THEN
        CREATE POLICY "Everyone can view event category overrides"
        ON event_category_overrides FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage event category overrides') THEN
        CREATE POLICY "Admins can manage event category overrides"
        ON event_category_overrides FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage their event category overrides') THEN
        CREATE POLICY "Owners can manage their event category overrides"
        ON event_category_overrides FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM events e
                JOIN profiles p ON p.tenant_id = e.tenant_id
                WHERE e.id = event_category_overrides.event_id
                AND p.id = auth.uid()
            )
        );
    END IF;
END $$;

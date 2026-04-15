-- Pricing diferenciado para atletas baseado em gym_name/master_name
CREATE TABLE IF NOT EXISTS event_athlete_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    gym_name TEXT,
    master_name TEXT,
    registration_fee NUMERIC(10, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, gym_name, master_name)
);

ALTER TABLE event_athlete_pricing ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage event_athlete_pricing') THEN
        CREATE POLICY "Admin can manage event_athlete_pricing"
        ON event_athlete_pricing FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Athletes can view active athlete pricing') THEN
        CREATE POLICY "Athletes can view active athlete pricing"
        ON event_athlete_pricing FOR SELECT
        TO authenticated
        USING (active = true);
    END IF;
END $$;

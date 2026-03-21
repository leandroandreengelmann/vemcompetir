-- Migration: Create athlete_term_acceptances table
-- Date: 2026-03-21

CREATE TABLE IF NOT EXISTS public.athlete_term_acceptances (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    term_id                 uuid        NOT NULL REFERENCES public.terms_of_service(id) ON DELETE CASCADE,
    event_id                uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    accepted_at             timestamptz NOT NULL DEFAULT now(),
    -- Snapshot dos dados dinâmicos no momento do aceite
    athlete_name_snapshot   text        NOT NULL,
    event_title_snapshot    text        NOT NULL,
    event_address_snapshot  text,
    event_city_snapshot     text,
    event_start_date_snapshot date,
    event_end_date_snapshot   date,
    -- Um aceite por atleta por evento
    CONSTRAINT uq_athlete_term_event UNIQUE (athlete_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_athlete_term_acceptances_athlete_event
    ON public.athlete_term_acceptances (athlete_id, event_id);

ALTER TABLE public.athlete_term_acceptances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Atleta pode inserir seu próprio aceite
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_term_acceptances' AND policyname = 'Athlete insert own acceptance'
    ) THEN
        CREATE POLICY "Athlete insert own acceptance"
        ON public.athlete_term_acceptances
        FOR INSERT TO authenticated
        WITH CHECK (athlete_id = auth.uid());
    END IF;

    -- Atleta pode ler seu próprio aceite
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_term_acceptances' AND policyname = 'Athlete read own acceptance'
    ) THEN
        CREATE POLICY "Athlete read own acceptance"
        ON public.athlete_term_acceptances
        FOR SELECT TO authenticated
        USING (athlete_id = auth.uid());
    END IF;

    -- Admin geral: leitura de todos os aceites
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_term_acceptances' AND policyname = 'Admin read all acceptances'
    ) THEN
        CREATE POLICY "Admin read all acceptances"
        ON public.athlete_term_acceptances
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;
END $$;

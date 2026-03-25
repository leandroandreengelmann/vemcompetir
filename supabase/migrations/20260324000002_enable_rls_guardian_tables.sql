-- Enable RLS on guardian_term_templates
ALTER TABLE public.guardian_term_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Admin geral: acesso total
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'guardian_term_templates' AND policyname = 'Admin geral full access on guardian templates'
    ) THEN
        CREATE POLICY "Admin geral full access on guardian templates"
        ON public.guardian_term_templates
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    -- Todos os autenticados podem ler os templates ativos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'guardian_term_templates' AND policyname = 'Authenticated read active guardian templates'
    ) THEN
        CREATE POLICY "Authenticated read active guardian templates"
        ON public.guardian_term_templates
        FOR SELECT TO authenticated
        USING (is_active = true);
    END IF;
END $$;

-- Enable RLS on athlete_guardian_declarations
ALTER TABLE public.athlete_guardian_declarations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Atleta pode ler sua própria declaração
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_guardian_declarations' AND policyname = 'Athlete read own guardian declaration'
    ) THEN
        CREATE POLICY "Athlete read own guardian declaration"
        ON public.athlete_guardian_declarations
        FOR SELECT TO authenticated
        USING (athlete_id = auth.uid());
    END IF;

    -- Atleta pode inserir sua própria declaração
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_guardian_declarations' AND policyname = 'Athlete insert own guardian declaration'
    ) THEN
        CREATE POLICY "Athlete insert own guardian declaration"
        ON public.athlete_guardian_declarations
        FOR INSERT TO authenticated
        WITH CHECK (athlete_id = auth.uid());
    END IF;

    -- Atleta pode atualizar sua própria declaração
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_guardian_declarations' AND policyname = 'Athlete update own guardian declaration'
    ) THEN
        CREATE POLICY "Athlete update own guardian declaration"
        ON public.athlete_guardian_declarations
        FOR UPDATE TO authenticated
        USING (athlete_id = auth.uid())
        WITH CHECK (athlete_id = auth.uid());
    END IF;

    -- Academia/equipe pode ler declarações dos seus atletas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_guardian_declarations' AND policyname = 'Academy read own athletes guardian declarations'
    ) THEN
        CREATE POLICY "Academy read own athletes guardian declarations"
        ON public.athlete_guardian_declarations
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = athlete_id AND tenant_id = (
                    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
                )
            )
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('academia', 'academia/equipe')
            )
        );
    END IF;

    -- Admin geral: leitura de todas as declarações
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'athlete_guardian_declarations' AND policyname = 'Admin geral read all guardian declarations'
    ) THEN
        CREATE POLICY "Admin geral read all guardian declarations"
        ON public.athlete_guardian_declarations
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;
END $$;

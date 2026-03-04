-- Política para permitir que qualquer pessoa (anônima) veja eventos publicados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'events' AND policyname = 'public can read published events'
    ) THEN
        CREATE POLICY "public can read published events" 
        ON public.events
        FOR SELECT 
        TO anon, authenticated
        USING (status = 'publicado');
    END IF;
END $$;

-- Create table for event general info topics
CREATE TABLE IF NOT EXISTS public.event_general_infos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    content_type text NOT NULL DEFAULT 'text_media',
    text_content_json jsonb,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for event general info assets (images/PDFs)
CREATE TABLE IF NOT EXISTS public.event_general_info_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    info_id uuid NOT NULL REFERENCES public.event_general_infos(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    asset_type text NOT NULL, -- 'image' | 'pdf'
    storage_bucket text NOT NULL DEFAULT 'event-images',
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL DEFAULT 0,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_general_infos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_general_info_assets ENABLE ROW LEVEL SECURITY;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_event_general_infos_event_sort ON public.event_general_infos(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_general_infos_tenant_event ON public.event_general_infos(tenant_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_general_info_assets_info_sort ON public.event_general_info_assets(info_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_general_info_assets_event ON public.event_general_info_assets(event_id);

-- Policies (Super Admin access only for now)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_general_infos' AND policyname = 'Admin geral full access on general infos'
    ) THEN
        CREATE POLICY "Admin geral full access on general infos" 
        ON public.event_general_infos
        FOR ALL 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_general_info_assets' AND policyname = 'Admin geral full access on info assets'
    ) THEN
        CREATE POLICY "Admin geral full access on info assets" 
        ON public.event_general_info_assets
        FOR ALL 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;
END $$;

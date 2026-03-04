-- Create table for category groups (tabelas de categorias)
CREATE TABLE IF NOT EXISTS public.category_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, -- Default placeholder if not strictly enforced yet, or to be updated by app logic
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for category rows (linhas de categorias)
CREATE TABLE IF NOT EXISTS public.category_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid NOT NULL REFERENCES public.category_tables(id) ON DELETE CASCADE,
    sexo text,
    divisao_idade text,
    idade text,
    faixa text,
    categoria_peso text,
    peso_min_kg numeric,
    peso_max_kg numeric,
    uniforme text,
    categoria_completa text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rows ENABLE ROW LEVEL SECURITY;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_category_rows_table_id ON public.category_rows(table_id);
CREATE INDEX IF NOT EXISTS idx_category_tables_tenant_id ON public.category_tables(tenant_id);

-- Policies (Super Admin access only for now, mirroring event_general_infos)
DO $$ 
BEGIN
    -- Policy for category_tables
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'category_tables' AND policyname = 'Admin geral full access on category tables'
    ) THEN
        CREATE POLICY "Admin geral full access on category tables" 
        ON public.category_tables
        FOR ALL 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    -- Policy for category_rows
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'category_rows' AND policyname = 'Admin geral full access on category rows'
    ) THEN
        CREATE POLICY "Admin geral full access on category rows" 
        ON public.category_rows
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

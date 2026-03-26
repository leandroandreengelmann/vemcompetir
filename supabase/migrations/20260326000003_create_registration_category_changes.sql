-- Audit log for category changes on paid registrations.
-- Every time a registration's category is changed after payment, a record is inserted here.

CREATE TABLE IF NOT EXISTS public.registration_category_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    changed_by uuid NOT NULL REFERENCES public.profiles(id),
    old_category_id uuid NOT NULL REFERENCES public.category_rows(id),
    new_category_id uuid NOT NULL REFERENCES public.category_rows(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_cat_changes_registration_id
    ON public.registration_category_changes(registration_id);

ALTER TABLE public.registration_category_changes ENABLE ROW LEVEL SECURITY;

-- Only service_role (adminClient) can write.
-- Authenticated users (academias) can read changes for their own registrations.
CREATE POLICY "tenant can read own category changes"
ON public.registration_category_changes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.event_registrations er
        WHERE er.id = registration_id
          AND er.tenant_id = (
              SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
          )
    )
);

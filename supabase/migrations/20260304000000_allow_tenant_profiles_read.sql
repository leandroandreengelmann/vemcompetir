-- Allow users to read profiles that belong to the same tenant as them
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
);

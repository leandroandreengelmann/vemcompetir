-- Remove a política recursiva anterior
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

-- Cria a política usando a função não recursiva current_user_tenant_id()
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
USING (tenant_id = current_user_tenant_id());

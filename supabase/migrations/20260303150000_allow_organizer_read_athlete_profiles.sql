-- Allow event organizers to read athlete profiles of athletes
-- registered in their events (where the event belongs to their tenant).
-- This fixes the "Sem equipe" bug where organizers could not read
-- cross-tenant athlete profiles, causing gym_name to appear as null.
CREATE POLICY "Organizers can view athlete profiles in their events"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.event_registrations er
        JOIN public.events ev ON ev.id = er.event_id
        WHERE er.athlete_id = profiles.id
          AND ev.tenant_id = current_user_tenant_id()
    )
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read settings (needed for registration form)
CREATE POLICY "Allow read access for authenticated users" ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only service role can modify (Admin actions will use service role client or check permissions)
-- Alternatively, if using admin role claim:
-- CREATE POLICY "Allow full access for admins" ON public.system_settings
--    FOR ALL
--    TO authenticated
--    USING (auth.jwt() ->> 'role' = 'service_role'); -- This is incorrect for Supabase, service_role is a role itself.

-- Initial seed: Default tax value
INSERT INTO public.system_settings (key, value, description)
VALUES ('own_event_registration_tax', '5.00', 'Taxa administrativa para inscrições da própria academia em seus eventos')
ON CONFLICT (key) DO NOTHING;

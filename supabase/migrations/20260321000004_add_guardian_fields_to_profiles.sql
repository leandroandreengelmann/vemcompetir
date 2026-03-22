-- Add legal guardian fields to profiles table
-- Used for athletes under 18 years old

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_guardian boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_cpf text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text;

COMMENT ON COLUMN profiles.has_guardian IS 'Whether this athlete has a registered legal guardian (typically for minors under 18)';
COMMENT ON COLUMN profiles.guardian_name IS 'Full name of the legal guardian';
COMMENT ON COLUMN profiles.guardian_phone IS 'Phone number of the legal guardian (digits only)';
COMMENT ON COLUMN profiles.guardian_cpf IS 'CPF of the legal guardian (digits only)';
COMMENT ON COLUMN profiles.guardian_relationship IS 'Relationship of guardian to athlete: pai | mae | irmao | tio | padrinho | outro';

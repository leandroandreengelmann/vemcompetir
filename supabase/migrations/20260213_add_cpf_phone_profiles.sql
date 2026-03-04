-- Migração: 20260213_add_cpf_phone_profiles.sql
-- Objetivo: Adicionar CPF e Telefone no perfil do atleta

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'cpf') THEN
        ALTER TABLE public.profiles ADD COLUMN cpf text;
        CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique_idx ON public.profiles (cpf) WHERE cpf IS NOT NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.cpf IS 'CPF do atleta (armazenado apenas números)';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone de contato do atleta';

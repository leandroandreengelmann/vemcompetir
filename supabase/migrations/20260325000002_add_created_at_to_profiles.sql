-- Adiciona created_at à tabela profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Preenche com a data de criação real do auth.users
UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE u.id = p.id;

-- Pacotes de tokens definidos pelo admin para venda às academias
CREATE TABLE token_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  token_count integer NOT NULL CHECK (token_count > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

-- Academias autenticadas podem ver pacotes ativos (para exibição)
CREATE POLICY "Authenticated users can read active token packages"
  ON token_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Somente service_role pode escrever (via server actions com adminClient)

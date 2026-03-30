-- Auditoria completa de movimentação de tokens por academia
CREATE TABLE token_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type                  text        NOT NULL CHECK (type IN ('consumed', 'refunded', 'granted', 'adjusted')),
  amount                integer     NOT NULL, -- negativo = débito, positivo = crédito
  balance_after         integer     NOT NULL,
  registration_id       uuid        REFERENCES event_registrations(id) ON DELETE SET NULL,
  event_id              uuid        REFERENCES events(id) ON DELETE SET NULL,
  inscription_package_id uuid       REFERENCES inscription_packages(id) ON DELETE SET NULL,
  token_package_id      uuid        REFERENCES token_packages(id) ON DELETE SET NULL,
  notes                 text,
  created_by            uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_transactions_tenant_id  ON token_transactions(tenant_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at DESC);

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Academia vê apenas as próprias transações
CREATE POLICY "Tenants can view own token transactions"
  ON token_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Somente service_role pode escrever

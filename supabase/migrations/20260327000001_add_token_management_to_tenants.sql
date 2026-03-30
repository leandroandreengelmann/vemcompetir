-- Adiciona suporte à gestão por token nas academias
ALTER TABLE tenants
  ADD COLUMN token_management_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN inscription_token_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN token_alert_sent_at timestamptz;

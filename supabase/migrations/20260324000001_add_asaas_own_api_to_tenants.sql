ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS use_own_asaas_api boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS asaas_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS asaas_api_key_iv text,
  ADD COLUMN IF NOT EXISTS asaas_api_key_last4 text,
  ADD COLUMN IF NOT EXISTS asaas_webhook_token_hash text;

-- Tabela para configuração de combos de categorias por evento.
-- Um combo define um preço total que se aplica quando o atleta
-- possui as 4 categorias (Absoluto Gi, Regular Gi, Absoluto No-Gi, Regular No-Gi) no carrinho.
CREATE TABLE IF NOT EXISTS event_combo_bundles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    bundle_total  NUMERIC(10,2) NOT NULL,  -- preço total (ex: 240.00 = R$60 por slot)
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id)  -- um combo por evento
);

ALTER TABLE event_combo_bundles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar (necessário para exibir preços)
CREATE POLICY "Anyone authenticated can view event_combo_bundles"
ON event_combo_bundles FOR SELECT TO authenticated USING (true);

-- Organizadores do evento podem gerenciar
CREATE POLICY "Event owners can manage event_combo_bundles"
ON event_combo_bundles FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events e
        JOIN profiles p ON p.tenant_id = e.tenant_id
        WHERE e.id = event_combo_bundles.event_id
        AND p.id = auth.uid()
    )
);

-- Admins gerais têm acesso total
CREATE POLICY "Admins can manage event_combo_bundles"
ON event_combo_bundles FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin_geral'
    )
);

CREATE INDEX IF NOT EXISTS idx_event_combo_bundles_event_id
    ON event_combo_bundles(event_id);

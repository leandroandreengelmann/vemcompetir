-- Política de Privacidade
CREATE TABLE IF NOT EXISTS privacy_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage privacy_policies"
    ON privacy_policies FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_geral')
    );

CREATE POLICY "Public can read active privacy_policies"
    ON privacy_policies FOR SELECT
    USING (is_active = true);

-- Termos de Uso
CREATE TABLE IF NOT EXISTS terms_of_use (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE terms_of_use ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage terms_of_use"
    ON terms_of_use FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_geral')
    );

CREATE POLICY "Public can read active terms_of_use"
    ON terms_of_use FOR SELECT
    USING (is_active = true);

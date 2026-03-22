-- Academy management authorization documents
-- Optional: academy uploads signed authorization document from athlete/guardian

CREATE TABLE IF NOT EXISTS academy_management_authorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    academy_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_url text NOT NULL,
    status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('pending', 'uploaded')),
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(athlete_id, academy_id)
);

ALTER TABLE academy_management_authorizations ENABLE ROW LEVEL SECURITY;

-- Academy can insert/update their own athletes' authorizations
CREATE POLICY "academy_manage_own_authorizations"
ON academy_management_authorizations
FOR ALL
TO authenticated
USING (academy_id = auth.uid())
WITH CHECK (academy_id = auth.uid());

-- Super admin can read all
CREATE POLICY "admin_read_all_authorizations"
ON academy_management_authorizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin_geral'
    )
);

-- Add 'academy_management' type to guardian_term_templates
ALTER TABLE guardian_term_templates
    DROP CONSTRAINT IF EXISTS guardian_term_templates_type_check;

ALTER TABLE guardian_term_templates
    ADD CONSTRAINT guardian_term_templates_type_check
    CHECK (type IN ('academy', 'self_register', 'minor_event', 'academy_management'));

-- Seed default academy_management template
INSERT INTO guardian_term_templates (type, version, content, is_active)
VALUES (
    'academy_management',
    1,
    E'AUTORIZAÇÃO DE GERENCIAMENTO DE CONTA\n\nEu, {{atleta_nome}}, ou na qualidade de responsável legal pelo atleta acima identificado, autorizo expressamente a academia/equipe {{academia_nome}} a gerenciar minha conta na plataforma, incluindo inscrições em competições e aceitação de termos em meu nome.\n\nDeclaramos estar cientes de todas as condições e responsabilidades decorrentes desta autorização.\n\n{{data}}',
    true
)
ON CONFLICT DO NOTHING;

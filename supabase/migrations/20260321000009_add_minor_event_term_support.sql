-- 1. Add minor_event to the type check on guardian_term_templates
ALTER TABLE guardian_term_templates
    DROP CONSTRAINT IF EXISTS guardian_term_templates_type_check;

ALTER TABLE guardian_term_templates
    ADD CONSTRAINT guardian_term_templates_type_check
    CHECK (type IN ('academy', 'self_register', 'minor_event'));

-- 2. Alter athlete_term_acceptances to support minor terms
ALTER TABLE athlete_term_acceptances
    ALTER COLUMN term_id DROP NOT NULL;

ALTER TABLE athlete_term_acceptances
    ADD COLUMN IF NOT EXISTS minor_term_id uuid REFERENCES guardian_term_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS term_type text NOT NULL DEFAULT 'standard'
        CHECK (term_type IN ('standard', 'minor'));

-- 3. Seed default minor_event template
INSERT INTO guardian_term_templates (version, content, is_active, type)
SELECT
    1,
    E'TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO PARA PARTICIPAÇÃO EM EVENTO ESPORTIVO\n\nEu, {{responsavel_nome}}, portador(a) do CPF {{responsavel_cpf}}, na qualidade de {{responsavel_vinculo}} do(a) atleta {{atleta_nome}}, por este instrumento e na melhor forma de direito, AUTORIZO e DECLARO:\n\n1. AUTORIZAÇÃO DE PARTICIPAÇÃO\nAutorizo o(a) atleta {{atleta_nome}} a participar do evento esportivo "{{evento_nome}}", realizado em {{evento_local}}, na data de {{evento_data}}.\n\n2. CIÊNCIA DOS RISCOS\nDeclaro estar ciente dos riscos inerentes à prática de esportes de contato e asseguro que o(a) atleta está em plenas condições físicas e de saúde para participar da competição.\n\n3. RESPONSABILIDADE\nAsssumo total responsabilidade pelo(a) atleta durante o período do evento, comprometendo-me a responder por quaisquer danos ou incidentes que possam ocorrer.\n\n4. REFERÊNCIA AO TERMO DE CADASTRO\nEste termo complementa e está vinculado ao Termo de Responsabilidade assinado no momento do cadastro na plataforma Competir, o qual já formaliza a autorização geral para participação em competições esportivas.\n\n5. VERACIDADE DAS INFORMAÇÕES\nDeclaro que todas as informações prestadas são verdadeiras e assumo responsabilidade pelas informações fornecidas.\n\nAo aceitar eletronicamente este termo, declaro ter lido e compreendido todas as cláusulas acima.\n\n{{responsavel_nome}}\nCPF: {{responsavel_cpf}}\nVínculo: {{responsavel_vinculo}}\nTelefone: {{responsavel_telefone}}\n\nData de aceite: {{data}}',
    true,
    'minor_event'
WHERE NOT EXISTS (
    SELECT 1 FROM guardian_term_templates WHERE type = 'minor_event' AND is_active = true
);

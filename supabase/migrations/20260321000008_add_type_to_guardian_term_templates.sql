-- Add type column to guardian_term_templates to distinguish academy vs self-register flows
ALTER TABLE guardian_term_templates
    ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'academy'
    CHECK (type IN ('academy', 'self_register'));

-- Existing records are all academy type (already defaulted above)

-- Seed a default self_register template if none exists
INSERT INTO guardian_term_templates (version, content, is_active, type)
SELECT
    1,
    'DECLARAÇÃO DE RESPONSABILIDADE — ATLETA MENOR DE IDADE

Eu, {{responsavel_nome}}, portador(a) do CPF {{responsavel_cpf}}, na qualidade de {{responsavel_vinculo}} do(a) atleta {{atleta_nome}}, declaro estar ciente e de acordo com os seguintes termos:

1. Autorizo o(a) atleta a participar de competições e eventos esportivos promovidos pela plataforma VemCompetir.

2. Declaro estar ciente dos riscos inerentes à prática esportiva e assumo plena responsabilidade pela participação do(a) atleta sob minha responsabilidade.

3. Confirmo que os dados informados no cadastro são verdadeiros e que assumo responsabilidade pelas informações prestadas.

4. Comprometo-me a manter os dados de contato atualizados na plataforma.

Ao aceitar eletronicamente este termo, declaro ter lido e compreendido todas as cláusulas acima.

{{responsavel_nome}}
CPF: {{responsavel_cpf}}
Vínculo: {{responsavel_vinculo}}
Telefone: {{responsavel_telefone}}

Data: {{data}}',
    true,
    'self_register'
WHERE NOT EXISTS (
    SELECT 1 FROM guardian_term_templates WHERE type = 'self_register' AND is_active = true
);

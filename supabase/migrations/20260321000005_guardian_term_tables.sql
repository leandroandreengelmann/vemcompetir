-- Guardian term template (editable by super admin)
CREATE TABLE IF NOT EXISTS guardian_term_templates (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version    integer NOT NULL DEFAULT 1,
    content    text NOT NULL,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Generated guardian declarations (one per athlete, auto-accepted on save)
CREATE TABLE IF NOT EXISTS athlete_guardian_declarations (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    responsible_type         text NOT NULL CHECK (responsible_type IN ('guardian', 'academy')),
    responsible_name         text,
    responsible_cpf          text,
    responsible_relationship text,
    responsible_phone        text,
    content                  text NOT NULL,
    generated_at             timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT athlete_guardian_declarations_athlete_id_key UNIQUE (athlete_id)
);

-- Seed: default guardian term template
INSERT INTO guardian_term_templates (version, content, is_active) VALUES (1,
'TERMO DE RESPONSABILIDADE PARA ATLETA MENOR DE IDADE

Pelo presente instrumento particular, {{responsavel_nome}}, portador(a) do CPF nº {{responsavel_cpf}}, na qualidade de {{responsavel_vinculo}} do(a) menor {{atleta_nome}}, devidamente vinculado(a) à academia/equipe {{academia_nome}}, declara para os devidos fins de direito:

1. AUTORIZAÇÃO DE PARTICIPAÇÃO
Autorizo o(a) menor {{atleta_nome}} a praticar Jiu-Jitsu e a participar de competições, eventos esportivos e atividades organizadas ou gerenciadas pela plataforma VemCompetir e pela academia/equipe {{academia_nome}}.

2. RESPONSABILIDADE CIVIL E MORAL
Assumo total responsabilidade civil e moral pelo(a) menor durante a realização de atividades esportivas, treinos, competições, eventos e deslocamentos a eles relacionados.

3. CONDIÇÕES DE SAÚDE
Declaro que o(a) menor está em plenas condições físicas e de saúde para a prática de atividades esportivas, e que não existe impedimento médico conhecido que impeça sua participação nas atividades.

4. AUTORIZAÇÃO PARA EMERGÊNCIAS MÉDICAS
Autorizo os responsáveis pelo evento a tomarem as medidas de primeiros socorros que se fizerem necessárias em caso de acidente ou emergência médica, comprometendo-me a ser comunicado(a) imediatamente pelo meio de contato fornecido.

5. AUTORIZAÇÃO DE USO DE IMAGEM
Autorizo, a título gratuito, o uso da imagem do(a) menor {{atleta_nome}} em fotografias, vídeos e demais mídias relacionadas às atividades esportivas da plataforma VemCompetir e da academia/equipe {{academia_nome}}, para fins exclusivamente esportivos e institucionais.

6. VALIDADE DIGITAL
Este termo é gerado e aceito digitalmente no ato do cadastro do(a) atleta, sendo juridicamente válido nos termos da legislação brasileira vigente, em especial a Lei nº 13.709/2018 (LGPD), o Código Civil Brasileiro e a Lei nº 14.063/2020 (Assinaturas Eletrônicas).

Data de geração: {{data}}

Responsável Legal: {{responsavel_nome}}
CPF: {{responsavel_cpf}}
Vínculo com o(a) atleta: {{responsavel_vinculo}}
Contato: {{responsavel_telefone}}
Academia/Equipe: {{academia_nome}}', true);

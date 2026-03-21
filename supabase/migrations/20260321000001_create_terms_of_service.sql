-- Migration: Create terms_of_service table
-- Date: 2026-03-21

CREATE TABLE IF NOT EXISTS public.terms_of_service (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    version     int         NOT NULL,
    content     text        NOT NULL,
    is_active   boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Only one active term at a time
CREATE UNIQUE INDEX IF NOT EXISTS terms_of_service_active_unique
    ON public.terms_of_service (is_active)
    WHERE is_active = true;

ALTER TABLE public.terms_of_service ENABLE ROW LEVEL SECURITY;

-- Admin geral: acesso total
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'terms_of_service' AND policyname = 'Admin geral full access on terms'
    ) THEN
        CREATE POLICY "Admin geral full access on terms"
        ON public.terms_of_service
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin_geral'
            )
        );
    END IF;

    -- Todos os autenticados podem ler o termo ativo
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'terms_of_service' AND policyname = 'Authenticated read active term'
    ) THEN
        CREATE POLICY "Authenticated read active term"
        ON public.terms_of_service
        FOR SELECT TO authenticated
        USING (is_active = true);
    END IF;
END $$;

-- Semente: inserir o termo inicial (versão 1)
INSERT INTO public.terms_of_service (version, content, is_active)
VALUES (
    1,
    'TERMO DE RESPONSABILIDADE E CIÊNCIA

1. Identificação da inscrição

Eu, {{NOME_ATLETA}}, submeto minha inscrição para participar do evento {{NOME_EVENTO}}, que se realizará no {{ENDERECO_EVENTO}}, na cidade de {{CIDADE_UF}}, no período de {{DATA_INICIAL}} até {{DATA_FINAL}}.

2. Gestão das inscrições

Tenho ciência que o Sistema Competir cuida apenas da gestão das inscrições dos eventos divulgados no site www.vemcompetir.com.br, não sendo o responsável pela execução e produção do evento em que estou me inscrevendo.

3. Reembolso

Tenho ciência que, ao pagar a inscrição, o reembolso não será permitido, salvo exceções descritas no item reembolso, divulgadas no site www.vemcompetir.com.br, nos detalhes do evento.

4. Riscos da competição

Tenho ciência que o torneio de lutas oferece risco de sérias contusões, incluindo perda parcial ou total dos movimentos e até mesmo morte acidental ou natural.

5. Aceitação dos riscos

Aceito os riscos de participar ou estar presente no evento e isento a entidade organizadora, assim como as pessoas responsáveis, sobre qualquer contusão que ocorra comigo, seja provocada pelo meu adversário, pela inércia do juiz, pelo estado do tatame, por uma pessoa não participante do evento ou por qualquer outra razão.

6. Atendimento médico

Autorizo a equipe médica proporcionada pelo evento a oferecer tratamento médico, ou qualquer outra ação médica necessária, em caso de eu me machucar neste evento.

7. Informações falsas

Qualquer informação falsa emitida por mim ou por meu responsável durante a minha inscrição, como data de nascimento, mas não limitada a isso, pode levar à desclassificação imediata, suspensão, banimento em futuros eventos produzidos por esta entidade organizadora, processo civil por falsidade ideológica, danos morais e materiais.

8. Uso de imagem

Autorizo o uso da minha imagem, fotografada ou filmada, para qualquer audiência em torno do mundo, sem esperar qualquer compensação de qualquer ordem por conta disso.

9. Condição de saúde e capacidade

Admito estar em boa saúde, em condições de participar desta competição, não estar sob a influência de drogas de qualquer tipo, ter lido e entendido todos os termos citados neste documento e ser legalmente capaz de aceitar os termos deste documento e assumir todos os riscos.

10. Conferência das regras e da inscrição

Estou ciente de que é minha responsabilidade conferir as regras do evento divulgadas junto ao cartaz do evento e os dados da inscrição no período de checagem geral aberta, disponibilizado logo após o fim das inscrições, devendo verificar o período oficial nos detalhes de cada evento.

11. Erros na inscrição ou categoria sem adversário

Estou ciente de que, se houver algum erro de informação na minha inscrição ou se eu estiver sozinho em minha categoria, deverei entrar em contato com a central de atendimento do Sistema Competir até a data e hora final da checagem geral aberta, através do canal Fale Conosco, disponível no site www.vemcompetir.com.br.

12. Renúncia a disputas judiciais

Atesto abdicar do direito de entrar com qualquer tipo de disputa, processo ou ação, em qualquer corte ou instância, estadual, federal, internacional ou júri popular, por questões de acidentes ou contusões que possam ter ocorrido ou não neste evento.

13. Arbitragem

Concordo que qualquer disputa, processo, ação ou desentendimento de qualquer natureza ou tipo, entre atleta e organizadores do evento e seus sucessores e designados, independentemente de qualquer fato ou teoria legal envolvida, deve ser resolvido por acordo arbitral, de acordo com a comissão disciplinar da organização do evento, tendo efeito a partir do momento em que o processo for iniciado.

14. Local da arbitragem e custos

Qualquer audição do caso deverá ser processada na cidade em que estiver estabelecida a entidade organizadora ou responsável pela organização do evento. Embora cada parte deva arcar com seus próprios custos com a arbitragem do caso, a parte vencedora deverá ser ressarcida dos custos do processo. Mesmo em casos de desacordo sujeitos ao acordo arbitral, a disputa deverá ser resolvida por arbitragem.

15. Menor de 18 anos

Em caso de menor de 18 anos, eu assumo ou certifico que sou o guardião legal do menor acima mencionado, que li e entendi todas as partes deste documento e que sou legalmente capaz de aceitar os termos deste documento, aceitando os riscos em nome do menor mencionado e em meu nome.

16. Edital oficial

Tenho ciência de que todas as normas e regras estabelecidas para este evento estão detalhadas no edital oficial do evento, caso o mesmo exista.

17. Acompanhamento diário do site

O atleta competidor obriga-se a conferir o site www.vemcompetir.com.br diariamente, para averiguar se o evento sofreu alguma alteração, seja ela alteração de local, mudança de regras, prorrogação de data ou cancelamento, podendo ser notificado através de um botão Comunicado junto ao cartaz do evento no site e por notificação via e-mail.

18. Alteração de informações da inscrição

Estou ciente de que tanto a organização do evento como também o professor responsável pela agremiação ou equipe possuem o direito de trocar, mudar ou até editar uma informação contida no formulário de inscrição do atleta, incluindo, mas não se limitando a nome da academia ou clube ao qual o atleta está inscrito, nome e/ou apelido do atleta.

19. Pagamento por boleto

Tenho ciência de que, ao efetuar o pagamento no boleto bancário, terei de aguardar até 3 dias úteis após a data de pagamento para a confirmação. Também tenho ciência de que, caso eu efetue pagamento em atraso, fora do prazo oficial estipulado nas regras do evento, não terei o direito de competir no evento e estarei sujeito a desconto de taxas administrativas para devolução do valor.

20. COVID-19 e compartilhamento de dados

Tenho ciência de que estamos convivendo com a COVID-19 e que assumo todos os riscos sobre minha participação no evento. Autorizo ainda o Sistema Competir a compartilhar meus dados pessoais com a organização do evento.

21. Inscrição pessoal, intransferível e comunicações por e-mail

Tenho ciência de que as inscrições realizadas no Sistema Competir são pessoais e intransferíveis, válidas somente ao titular desta inscrição para o evento em questão. Tenho ciência também de que o Sistema Competir poderá me enviar informações importantes sobre o evento para meu e-mail de cadastro até a data do evento, assumindo eu a responsabilidade de conferir diariamente meus e-mails, tanto na caixa de entrada quanto no spam ou lixo eletrônico.',
    true
)
ON CONFLICT DO NOTHING;

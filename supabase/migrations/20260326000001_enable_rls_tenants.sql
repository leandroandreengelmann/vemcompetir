-- Habilita Row Level Security na tabela tenants.
-- O app usa createAdminClient() (service_role) para todas as operações sensíveis,
-- que bypassa RLS automaticamente. Esta migration apenas fecha o acesso direto
-- de clients não-admin, sem quebrar nenhuma funcionalidade existente.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados leiam tenants (ex: select('name') em páginas do painel).
-- As colunas sensíveis do Asaas são protegidas por criptografia AES-256-GCM no servidor;
-- ler o blob criptografado sem a chave de servidor não tem utilidade.
CREATE POLICY "authenticated users can read tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (true);

-- INSERT / UPDATE / DELETE não têm política para authenticated → negado por padrão.
-- Apenas o service_role (adminClient) pode escrever na tabela.

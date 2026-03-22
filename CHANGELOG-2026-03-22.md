# Relatório de Alterações — 22 de Março de 2026

## 1. Padronização Visual — Painel Admin (Termos)

### Botões
- `TermsEditor` e `GuardianTermEditor`: botões "Editar", "Histórico", "Cancelar", "Salvar Nova Versão" e "Ativar" migrados para o padrão do painel (`pill` + `mr-2` no ícone)
- `ManagementAuthorizationsList`: removidas classes manuais do botão "Ver documento" (`h-8 px-3 rounded-full`) — agora usa apenas `size="sm" variant="outline"`

### Inputs de Filtro
- Todos os 4 componentes de Registros (`TermAcceptancesList`, `GuardianDeclarationsList`, `SignedTermsList`, `ManagementAuthorizationsList`) padronizados com:
  - `Input variant="lg"` com `pl-11 bg-background border-input shadow-sm`
  - Ícone `MagnifyingGlassIcon` com `group-focus-within:text-primary transition-colors`
  - `Select` com `h-12 rounded-xl border-input bg-background font-medium`
  - Paginação com `Button variant="outline" size="sm" pill` ícone-only

---

## 2. Filtros nos Registros de Termos

Adicionados filtros específicos em cada seção de Registros:

| Seção | Filtros adicionados |
|---|---|
| Aceites de Termo | Busca por atleta, busca por evento, tipo (Adulto / Menor) |
| Declarações | Busca por atleta/responsável, tipo de responsável (Todos / Responsável Legal / Academia) |
| Termos Assinados | Busca por atleta, status (Aguardando revisão / Aprovados / Todos) |
| Docs. Gerenciamento | Busca por atleta ou academia |

---

## 3. Correção de 3 Bugs

### Bug 1 — Preview de PDF/Imagem quebrado (`SignedTermsList`)
- **Problema:** a detecção de PDF usava `previewUrl.endsWith('.pdf')` mas a URL assinada do Supabase termina com `?token=...`, nunca com `.pdf`
- **Correção:** detecta o tipo pelo `filePath` original antes de gerar a URL assinada; suporta PDF e qualquer formato de imagem (JPG, PNG, etc.)

### Bug 2 — Busca limitada aos 25 itens da página (`getManagementAuthorizationsAction` e `getGuardianDeclarationsAction`)
- **Problema:** `.range(from, to)` era aplicado antes do filtro JS por nome, portanto a busca só encontrava resultados dentro da página atual
- **Correção:** removido o `.range()` da query; busca JS aplicada no dataset completo; paginação feita por `.slice()` após o filtro

### Bug 3 — Total incorreto nos Termos Assinados (`getPendingSignedTermsAction`)
- **Problema:** retornava `total: count` do banco (antes do filtro JS), fazendo o contador e a paginação ficarem errados quando havia busca ativa
- **Correção:** retorna `total: rows.length` após o filtro aplicado

---

## 4. Organização do Painel Admin — Termos

- Página `/admin/dashboard/termos` reorganizada de 8 abas planas para dois grupos visuais:
  - **Modelos de Termos:** Adulto, Resp. Legal — Academia, Resp. Auto-Cadastro, Menor em Evento, Gerenc. de Conta
  - **Registros:** Aceites de Termo, Declarações, Termos Assinados, Docs. Gerenciamento

---

## 5. Autorização de Gerenciamento de Conta (Academia)

### Banco de dados
- Tabela `academy_management_authorizations` criada (migration `20260322000001`)
- Tipo `'academy_management'` adicionado à tabela `guardian_term_templates`
- Template padrão inserido com placeholders `{{atleta_nome}}`, `{{academia_nome}}`, `{{data}}`

### Painel Academia
- Nova seção no perfil do atleta (`ManagementAuthorizationSection`):
  - Botão de download do modelo em `.txt` com placeholders preenchidos
  - Upload do documento assinado (PDF/JPG/PNG, máx. 10MB)
  - Exibe status, data e link para visualizar quando já enviado

### Painel Admin
- Aba "Gerenc. de Conta" em Modelos: editor do template com histórico de versões
- Aba "Docs. Gerenciamento" em Registros: lista paginada com busca por atleta/academia e link para o documento

---

## 6. Atualização de Conteúdo dos Termos (migration `20260322000002`)

Todos os 4 modelos de termos atualizados:
- `VemCompetir` → `Competir` em todos os textos
- `vemcompetir.com.br` → `competir.com.br`
- Termo adulto v2: removida cláusula de menor de idade, removida cláusula de COVID-19
- Modelo auto-cadastro v2: atualizado para refletir fluxo `/register`
- Modelo menor em evento v2: corrigido erro tipográfico "Assssumo" → "Assumo"

---

## 7. Política de Privacidade e Termos de Uso

### Banco de dados (migration `20260322000003`)
- Tabelas `privacy_policies` e `terms_of_use` criadas com versionamento e RLS
- Conteúdo inicial inserido adaptado para a plataforma Competir (Foro: Matupá-MT)
- Inclui seção LGPD, dados de menores, academias, pagamentos online

### Painel Admin — nova página `/admin/dashboard/juridico`
- Item "Jurídico" adicionado ao menu lateral (`PanelSidebar`)
- Duas abas: **Política de Privacidade** e **Termos de Uso**
- Editor com histórico de versões (mesmo padrão do `TermsEditor`)
- Ao salvar, invalida cache das páginas públicas automaticamente

### Páginas públicas
- `/privacidade` — exibe a política ativa, sem necessidade de login
- `/termos-de-uso` — exibe os termos ativos, sem necessidade de login
- Middleware atualizado para liberar as duas rotas sem autenticação
- Renderização com destaque em títulos e seções numeradas

### Banner de Cookies
- Componente `CookieBanner` adicionado ao root layout (`app/layout.tsx`)
- Aparece na parte inferior de todas as páginas públicas
- Ícone de cookie em marrom (`CookieIcon`, `text-amber-800`)
- Links clicáveis para Política de Privacidade e Termos de Uso
- Só fecha ao clicar em "Concordo" (sem botão X)
- Aceite salvo em `localStorage` (`competir_cookie_consent`) — não reaparece
- Não exibido nas rotas do painel (`/admin`, `/academia-equipe`, `/atleta`)

### Rodapé Público (`PublicFooter`)
- Nova coluna **"Legal"** no grid com links para Política de Privacidade e Termos de Uso
- Grid expandido de 4 para 5 colunas
- Links "Privacidade" e "Termos de Uso" também adicionados na barra inferior ao lado do copyright

---

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `src/app/(panel)/academia-equipe/dashboard/atletas/[id]/perfil/ManagementAuthorizationSection.tsx` | Seção de autorização no perfil do atleta |
| `src/app/(panel)/academia-equipe/dashboard/atletas/[id]/perfil/management-authorization-actions.ts` | Server actions da autorização |
| `src/app/(panel)/admin/dashboard/termos/ManagementAuthorizationsList.tsx` | Lista de docs de gerenciamento no admin |
| `src/app/(panel)/admin/dashboard/juridico/actions.ts` | Server actions da página jurídico |
| `src/app/(panel)/admin/dashboard/juridico/LegalDocumentEditor.tsx` | Editor de documentos legais |
| `src/app/(panel)/admin/dashboard/juridico/page.tsx` | Página admin de Política e Termos de Uso |
| `src/app/privacidade/page.tsx` | Página pública — Política de Privacidade |
| `src/app/termos-de-uso/page.tsx` | Página pública — Termos de Uso |
| `src/components/CookieBanner.tsx` | Banner de consentimento de cookies |
| `supabase/migrations/20260322000001_create_academy_management_authorizations.sql` | Migration autorização de gerenciamento |
| `supabase/migrations/20260322000002_update_terms_content.sql` | Migration atualização de conteúdo dos termos |
| `supabase/migrations/20260322000003_create_legal_documents.sql` | Migration tabelas jurídicas |

## Arquivos modificados

`TermsEditor.tsx` · `GuardianTermEditor.tsx` · `TermAcceptancesList.tsx` · `GuardianDeclarationsList.tsx` · `SignedTermsList.tsx` · `actions.ts (termos)` · `actions.ts (register)` · `PanelSidebar.tsx` · `PublicFooter.tsx` · `app/layout.tsx` · `middleware.ts` · `atletas/[id]/perfil/page.tsx`

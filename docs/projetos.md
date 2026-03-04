# Projeto COMPETIR - Plataforma de Gestão Esportiva

## Visão Geral
Plataforma SaaS multi-tenant desenvolvida para gerenciar competições esportivas, conectando administradores, organizadores de eventos, academias e atletas. O sistema oferece painéis dedicados para cada perfil de usuário, permitindo desde a criação de eventos até a inscrição e acompanhamento de resultados.

## Stack Tecnológico
- **Frontend Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Componentes UI**: shadcn/ui (baseado em Radix UI)
- **Ícones**: Lucide React
- **Backend & Auth**: Supabase (PostgreSQL, Auth, RLS)
- **Gerenciamento de Estado/Data**: React Server Components & Server Actions

## Estrutura de Perfis (Roles)
O sistema utiliza um modelo de controle de acesso baseado em roles (RBAC) via Supabase Auth Metadata e tabela `profiles`:
1.  **Admin Geral** (`admin_geral`): Acesso total ao sistema. Gerencia usuários, organizadores e academias.
2.  **Organizador** (`organizador`): Cria e gerencia eventos, categorias e inscrições.
3.  **Academia** (`academia`): Gerencia seus atletas e realiza inscrições em lote.
4.  **Atleta** (`atleta`): Visualiza eventos, histórico e resultados (perfil padrão no registro).

## Funcionalidades Implementadas

### 1. Autenticação e Segurança
- **Login e Registro**: Fluxos completos com validação e redirecionamento baseado em role.
- **Redirecionamento Automático**:
    - Usuários logados são redirecionados automaticamente para seus respectivos dashboards ao acessar a home.
    - Correção de rota pós-login para evitar loop ou página incorreta.
- **Recuperação de Senha**: Sistema via OTP (código por e-mail) para maior segurança.
- **Proteção de Rotas**: Middleware para validação de sessão e redirecionamento de rotas protegidas.

### 2. Painel Admin Geral (`/admin`)
- **Gestão de Usuários**: Listagem geral de usuários do sistema.
- **Gestão de Organizadores**:
    - Listagem com status e data de cadastro.
    - Cadastro de novos organizadores via convite direto (criação de usuário).
    - Edição de dados cadastrais e redefinição de senha.
- **Gestão de Academias**:
    - CRUD completo (Listagem, Cadastro, Edição) seguindo o padrão dos organizadores.
- **Gestão de Academias**:
    - CRUD completo (Listagem, Cadastro, Edição) seguindo o padrão dos organizadores.
    - Sincronização automática entre Auth e Tabela de Perfis.
    - Validação de unicidade para evitar nomes duplicados.
- **Visualização Global de Atletas**:
    - Listagem completa de todos os atletas cadastrados no sistema (`/admin/dashboard/atletas`).
- **Dashboard e Métricas**:
    - Cards de resumo com contagem total de Academias, Mestres e Atletas.

### 3. Painel do Organizador (`/organizador`)
- **Dashboard**: Visão geral.
- **Meus Eventos**: Listagem e gestão de eventos criados pelo organizador.
- **Padronização de Tabelas**:
    - Layout alinhado com o Admin (Status, Badges, Ações).
    - Coluna de Status visual (Rascunho, Publicado, Encerrado).

### 4. Painel da Academia (`/gym`) e Atleta (`/atleta`)
- Dashboards iniciais estruturados para futuras funcionalidades (gestão de atletas, inscrições).

## Design System
- **Identidade Visual**: Interface limpa e moderna, utilizando uma paleta de cores sóbria com acentos estratégicos.
- **Componentes**: Utilização extensiva de componentes reutilizáveis (`Button`, `Input`, `Table`, `Card`, `Badge`) padronizados via `shadcn/ui`.
- **Inputs**: Estilo personalizado "clean" (arredondados, sem bordas grossas ou sombras excessivas) nas telas de autenticação e formulários administrativos.

## Estrutura de Diretórios Principal
```
src/
├── app/
│   ├── (panel)/          # Layouts protegidos (Sidebar, Header)
│   │   ├── admin/        # Rotas do Admin Geral
│   │   ├── organizador/  # Rotas do Organizador
│   │   ├── gym/          # Rotas da Academia
│   │   └── atleta/       # Rotas do Atleta
│   ├── login/            # Página de Login
│   ├── register/         # Página de Registro
│   └── ...
├── components/
│   ├── ui/               # Componentes base (shadcn)
│   └── layout/           # Componentes estruturais (Sidebar, etc)
├── lib/
│   └── supabase/         # Clientes Supabase (Server, Client, Admin)
└── ...
```

## Próximos Passos
- Implementação detalhada da gestão de eventos (Organizador).
- Funcionalidades de inscrição de atletas.
- Integração de pagamentos.

### 5. Frontend & UI Updates
- **Index Page (`/`)**:
    - Ajuste de background para branco (`bg-background`).
    - Implementação de header fixo (`sticky`) com altura de 100px (aprox `h-24`).
    - Adição de botão "Entrar" no canto superior direito utilizando componente padrão `Button` arredondado com altura de 48px (`h-12`).
    - Implementação de link para rederecionamento à página de login (`/login`).
    - *Arquivos modificados*: `src/app/page.tsx`.
    - *Motivo*: Melhoria de UI/UX conforme solicitado e padronização com Design System.

- **Refatoração Gestão de Atletas (Painel Academia)**:
    - Alteração da página de listagem (`/gym/dashboard/atletas`) para layout Full-Width (Card + Table), removendo formulário lateral.
    - Criação de página dedicada para cadastro (`/gym/dashboard/atletas/novo`) padronizada com admin.
    - Criação de página dedicada para edição (`/gym/dashboard/atletas/[id]`) com verificação de segurança por `tenant_id`.
    - Implementação de Server Actions específicas (`createAthleteAction`, `updateAthleteAction`) para garantir segurança e integridade dos dados no contexto da academia.
    - *Arquivos modificados/criados*: `src/app/(panel)/gym/dashboard/atletas/**/*`.
    - *Motivo*: Padronização com o painel administrativo conforme solicitado.

- **Correção de Bug (Sidebar)**:
    - Ajuste no link "Dashboard" da sidebar para usuários com role `academia`, redirecionando corretamente para `/gym/dashboard` (antes redirecionava para `/academia/dashboard`, 404).
    - *Arquivos modificados*: `src/components/layout/PanelSidebar.tsx`, `src/components/layout/MobileSidebar.tsx`.

- **Limpeza do Dashboard (Academia)**:
    - Remoção dos widgets/atalhos da página inicial do painel da academia (`/gym/dashboard`), mantendo apenas a mensagem de boas-vindas.
    - *Arquivos modificados*: `src/app/(panel)/gym/dashboard/page.tsx`.

- **Refinamento da Sidebar**:
    - Alteração do ícone de "Atletas" para `User` (Avatar simples).
    - Correção da lógica de estado ativo: O botão "Dashboard" agora só fica ativo na rota exata, evitando que subseções (como "Atletas") o mantenham ativo indevidamente.
    - *Arquivos modificados*: `src/components/layout/PanelSidebar.tsx`, `src/components/layout/MobileSidebar.tsx`.

- **Aprimoramento do Cadastro de Atletas (Painel Organizador)**:
    - Adição de novos campos no formulário de cadastro e edição: Data de Nascimento, Faixa e Peso.
    - Atualização das Server Actions `createAthleteAction` e `updateAthleteAction` para persistir os novos campos na tabela `profiles`.
    - **Padronização Visual (Design System)**: Alinhamento das páginas de listagem e formulários com o padrão "premium" da plataforma, utilizando `Cards`, botões `rounded-full` e ícones padronizados.
    - *Arquivos modificados*: `src/app/(panel)/organizador/dashboard/atletas/**/*`.
    - *Motivo*: Atender à necessidade de coletar dados técnicos dos atletas e manter a consistência visual em todo o painel do organizador.

- **Correção de Bug (Listagem de Atletas)**:
    - Correção do erro na consulta SQL que tentava ordenar por uma coluna inexistente (`created_at`) na tabela `profiles`. Alterado para `updated_at`.
    - *Arquivos modificados*: `src/app/(panel)/organizador/dashboard/atletas/page.tsx`.
    - *Motivo*: Garantir que os atletas cadastrados apareçam corretamente na tabela do painel.

- **Expansão do Cadastro de Organizadores (Super Admin)**:
    - Adição de novos campos: Nome do Responsável, CPF/CNPJ, Rua, Número, Cidade, Estado e CEP.
    - Atualização da tabela `profiles` com novas colunas para persistência desses dados.
    - Atualização das Server Actions `createOrganizerAction` e `updateOrganizerAction` para lidar com os novos campos.
    - *Arquivos modificados*: `src/app/(panel)/admin/dashboard/organizadores/**/*`.
    - *Motivo*: Coletar dados mais completos para fins contratuais e de localização das organizações.

- **Acesso ao Menu de Atletas (Organizador)**:
    - Adição do item "Atletas" no menu lateral para usuários com perfil `organizador`.
    - Ajuste da lógica de roteamento para direcionar corretamente organizadores para `/organizador/dashboard/atletas`.
    - *Arquivos modificados*: `src/components/layout/PanelSidebar.tsx`, `src/components/layout/MobileSidebar.tsx`.
    - *Motivo*: Permitir que organizadores acessem a funcionalidade de gestão de atletas implementada.

- **Correção de Bug (Sidebar)**:
    - Correção na renderização da sidebar onde um hook `usePathname` poderia causar erro de hidratação.
    - *Arquivos modificados*: `src/components/layout/PanelSidebar.tsx`.
    - *Motivo*: Estabilidade da aplicação.

- **Refatoração Cabeçalho Atleta (Mobile-First)**:
    - Ajuste do header do painel do atleta para `h-14` (mobile) e `h-16` (desktop).
    - Aplicação de `backdrop-blur-md` e transparência `bg-background/80`.
    - Substituição de cores hardcoded (`bg-black`) por tokens (`bg-primary/10`, `text-primary`).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Melhorar a experiência em dispositivos móveis e garantir consistência com o Design System.

- **Limpeza do Painel do Atleta**:
    - Remoção completa do conteúdo visual do painel do atleta (`src/app/atleta/dashboard/page.tsx`).
    - Mantido apenas o botão de logout posicionado no topo esquerdo.
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Solicitação explícita para deixar o painel "totalmente branco".

- **Ajuste de UI (Painel Atleta)**:
    - O botão de logout foi movido para o canto superior direito (classe `right-4`).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Solicitação do usuário.

- **Adição de Avatar (Painel Atleta)**:
    - Adicionado componente `Avatar` no canto superior esquerdo (`top-4 left-4`).
    - Exibe as iniciais do atleta sobre fundo `bg-brand-950` (cor preta do projeto).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Solicitação do usuário para identidade visual.

- **Adição de Toggle de Tema (Painel Atleta)**:
    - Adicionado componente `AnimatedThemeToggler` (Magic UI) no canto superior direito.
    - Posicionado junto ao botão de logout (`flex gap-2`).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Solicitação do usuário para controle de tema (Dark/Light).

- **Tema Dinâmico por Faixa (Painel Atleta)**:
    - Implementado sistema que altera a cor primária do painel do atleta baseado na cor da sua faixa.
    - Criado `src/lib/belt-theme.ts` para mapeamento de cores e conversão HEX->HSL.
    - Criado `src/components/belt-theme-provider.tsx` para injeção dinâmica de variáveis CSS.
    - Criado `src/app/atleta/layout.tsx` para aplicar o tema em todas as rotas de atleta.
    - *Arquivos criados*: `src/lib/belt-theme.ts`, `src/components/belt-theme-provider.tsx`, `src/app/atleta/layout.tsx`.
    - *Motivo*: Personalização da experiência do atleta conforme sua graduação.

- **Ajuste de Tema (Reversão)**:
    - O tema dinâmico por faixa agora afeta **apenas** as cores primárias (`--primary`, `--ring`, `--brand-*`), mantendo os fundos (`background`, `card`) com as cores padrão do sistema (branco/preto).
    - *Arquivos modificados*: `src/components/belt-theme-provider.tsx`.
    - *Motivo*: Reversão de experimento a pedido do usuário.

- **Ajuste de Tema (Lógica de Faixas)**:
    - **Faixa Branca e Preta**: Mantêm o tema padrão do sistema (Sem alteração).
    - **Outras Faixas (Azul, Roxa, etc.)**: Aplicam a cor da faixa como cor primária (`--primary`) no painel do atleta.
    - *Arquivos modificados*: `src/components/belt-theme-provider.tsx`.
    - *Motivo*: Regra de negócio específica para diferenciar graduações intermediárias.

- **Cards de Navegação (Painel Atleta)**:
    - Adicionado Grid de Cards para navegação: "Campeonatos", "Minhas Inscrições", "Meu Perfil".
    - Estilização dinâmica usando a cor da faixa (`border-primary`, `bg-primary/5`).
    - Layout responsivo (1 coluna mobile, 2 colunas desktop).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Melhorar a navegação e experiência do atleta.

- **Redesign de Cards (Visual Tech/Sport)**:
    - Implementação de design agressivo e moderno conforme diretrizes de Front-end Specialist.
    - Uso de **Tipografia Bold/Black** em caixa alta.
    - **Gradientes Suaves** e **Borda Assimétrica** (`border-l-4`) na cor da faixa.
    - **Marcas d'água** tipográficas (CMP, INS, PRF) no fundo para profundidade.
    - **Micro-interações** de hover (scale, glow, translate).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
    - *Motivo*: Modernização da interface e criação de identidade visual forte.

- **Redesign de Cards (Mobile First & Legibilidade)**:
    - Otimização agressiva para uso em celular (95% do público).
    - **Grid Forçado**: `grid-cols-2` sempre visível.
    - **Tipografia**: Títulos na cor da faixa (`primary`) e Descrições com tamanho aumentado (`xs`/`sm`) para leitura clara.
    - **Compactação**: Paddings reduzidos para caber dois cards lado a lado.
    - **Card Perfil**: Ocupa largura de 90% centralizado abaixo dos outros dois.
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.

- **Redesign de Cards (Mobile First)**:
    - Otimização agressiva para uso em celular (95% do público).
    - **Grid Forçado**: `grid-cols-2` sempre visível.
    - **Compactação**: Fontes (`text-base` mobile) e paddings reduzidos para caber dois cards lado a lado.
    - **Card Perfil**: Ocupa largura de 90% centralizado abaixo dos outros dois.
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.

- **Redesign de Cards (Refinamento)**:
    - Ajustado conforme feedback detalhado do usuário.
    - **Layout**: Triângulo invertido (2 cards em cima, 1 card centralizado e levemente mais largo embaixo - 65% width).
    - **Estilo**: Borda completa (`border-2`) na cor da faixa. Marcas d'água removidas.
    - **Tipografia**: Title Case (ex: "Campeonatos"), tamanho `text-2xl`.
    - **Detalhes**: Ícone de seta `ArrowRight` (stroke 3px). Texto "explorar" minúsculo no description.
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.

- **Redesign de Cards (Mobile-First Layout)**:
    - **Grid Mobile**: 2 Colunas reais (`grid-cols-2`).
    - **Card de Perfil**: Largura reduzida (`w-3/4` / 75%) e centralizado (`mx-auto`).
    - **Posicionamento**: Seta absoluta no canto inferior direito (`bottom-3 right-3`).
    - **Layout Interno**: Padding consistente (`p-4`), altura fixa (`h-40`), texto não sobrepõe a seta (`pb-12`).
    - **Tipografia**: Otimizada para mobile (`text-lg` título).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
- **Avatar e Saudação**:
    - **Avatar**: Substituição das iniciais pelo ícone `User` (Lucide).
    - **Saudação**: "Olá, [Primeiro Nome]" inserido 36px abaixo do avatar (`mt-9`).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.
- **Remoção do Dark Mode (Dashboard Atleta)**:
    - O `AnimatedThemeToggler` foi removido desta tela específica.
    - Fundo fixado em `#FAFAFA` (Light Mode permanente).
    - *Arquivos modificados*: `src/app/atleta/dashboard/page.tsx`.

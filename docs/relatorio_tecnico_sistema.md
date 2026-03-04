# Relatório Técnico Definitivo: Ecossistema COMPETIR

Este documento fornece um manual técnico completo da plataforma COMPETIR, detalhando a arquitetura, segurança, fluxos de dados, componentes de interface e a lógica específica de cada tela e cadastro dos painéis Administrativo e Operacional.

---

## 1. Arquitetura do Sistema e Stack de Tecnologia
A COMPETIR é construída sobre uma arquitetura moderna de aplicações web focada em performance, segurança e escalabilidade.

### Core Stack:
- **Framework**: Next.js 15 (App Router) — Utiliza Server Components para renderização rápida e Server Actions para mutações de dados seguras.
- **Banco de Dados & Autenticação**: Supabase (PostgreSQL) — Gerenciamento centralizado de usuários, permissões e armazenamento de arquivos.
- **Design System**: Tailwind CSS v4 + Shadcn UI — Interface baseada em tokens CSS para consistência visual absoluta e suporte nativo a Temas (Light/Dark).

---

## 2. Ecossistema de Telas: Painel Super Admin (`admin_geral`)
O Painel Administrativo é o cérebro da plataforma, permitindo ao administrador geral gerenciar o ecossistema multi-tenant.

### 2.1 Dashboard Central
- **Função**: Visão de alto nível da saúde da plataforma.
- **Componentes**: Cards de métricas globais (Total de Academias, Atletas e Eventos ativos).
- **Lógica**: Agrega dados de todos os tenants através de queries administrativas que ignoram políticas de RLS.

### 2.2 Gestão de Equipes e Academias (`/admin/dashboard/equipes-academias`)
- **Tela de Listagem**: Tabela detalhada mostrando Nome, E-mail, Mestre Responsável e contagem de atletas federados por academia.
- **Lógica de Cadastro (`/novo`)**:
  - Criação de usuário no Supabase Auth via Admin API.
  - Associação automática de um `tenant_id` exclusivo.
  - Definição do papel `academia/equipe`.
- **Tela de Detalhes (`/[id]`)**: Exibe o perfil completo da entidade e vincula o "Mestre" (usuário com flag `is_master`).

### 2.3 Gestão Global de Eventos (`/admin/dashboard/eventos`)
- **Tela de Listagem**: Centraliza todos os campeonatos e festivais criados por qualquer academia na plataforma.
- **Lógica de Curadoria**:
  - Filtro por status para facilitar a aprovação de eventos pendentes.
  - **Ações**: Botão de visualização rápida e edição profunda.

---

## 3. Ecossistema de Telas: Painel Academia/Equipe (`academia/equipe`)
O Painel Operacional permite que os donos de academia gerenciem seus atletas e organizem seus próprios eventos.

### 3.1 Dashboard da Organização
- **Função**: Controle interno da academia.
- **Componentes**: Lista de atletas vinculados e resumo de eventos próximos.

### 3.2 Gestão de Eventos Próprios (`/academia-equipe/dashboard/eventos`)
- **Cadastro de Evento (`/novo`)**:
  - **Identificação**: Título, Data e Local.
  - **Endereço Completo**: Logradouro, Número, Bairro, Cidade, Estado e CEP (com normalização de dados).
  - **Identidade Visual**: Upload de imagem com redimensionamento inteligente (thumbnail 200x200).
- **Fluxo de Status**:
  - O evento é salvo como `pendente`.
  - Aparece automaticamente para o Super Admin para revisão e aprovação.

---

## 4. Lógica de Negócio e Fluxos de Dados

### 4.1 Ciclo de Vida de um Evento
1. **Criação**: Academia submete formulário; status = `pendente`.
2. **Revisão**: Super Admin visualiza o evento na lista global; status = `pendente` (Amber).
3. **Aprovação**: Super Admin clica em "Aprovar Evento"; status = `aprovado` (Emerald).
4. **Publicação**: Próxima etapa comercial que move para `publicado` (Blue).

### 4.2 Segurança e Identidade (`auth-guards.ts`)
O sistema utiliza "Guards" para proteger cada requisição:
- `requireAuth`: Bloqueia acessos anônimos.
- `requireRole`: Garante que um Atleta não entre no Painel Admin (e vice-versa).
- `requireTenantScope`: Garante que o dono da "Academia A" nunca veja os dados da "Academia B".

---

## 5. Design System e Identidade Visual (Premium Design)
A COMPETIR segue uma estética minimalista, escura e de alto contraste.

### Cores e Tokens:
- **Cor Primária**: Dark Gray/Black (`#252B37` até `#0A0D12`).
- **Estados Semânticos**:
  - `Pendente`: Laranja/Âmbar (Atenção necessária).
  - `Aprovado`: Verde Esmeralda (Sucesso/Validado).
  - `Publicado`: Azul Clássico (Visível ao público).
- **Tipografia**: Utiliza fontes modernas (Inter) focadas em legibilidade.

### Elementos de Design:
- **Botões "Pill"**: Bordas altamente arredondadas (`rounded-full` ou `rounded-xl`).
- **Transparências**: Backgrounds tipo `bg-transparent` com bordas `border-input` para um visual "Glass" leve.
- **Ausência de Ícones em Ações Críticas**: Botões como "Aprovar" e "Excluir" usam apenas texto para evitar distrações e manter a seriedade da ação.

---

## 6. Infraestrutura de Cloud e Media
### Supabase Storage:
- **Pasta de Mídia**: `/event-images`.
- **Hierarquia**: `tenant/${tenant_id}/events/${event_id}/thumb.jpg`.
- **Cleanup**: Lógica integrada que apaga arquivos físicos quando registros no banco de dados são excluídos, economizando espaço e mantendo a integridade dos dados.

---
*Este relatório técnico é exaustivo e reflete a implementação completa até 13 de Fevereiro de 2026.*

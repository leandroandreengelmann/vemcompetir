# PROMPT_RESTRITIVO.md — Design System + Tokens Tailwind — COMPETIR (Next.js SaaS Multi-tenant)

## 0) Objetivo
Você deve implementar/ajustar **somente** o Design System de cores (tokens) e o setup de UI para o projeto **Competir** (Next.js + Tailwind) com foco em:
- **Preto/Cinza escuro como cor primária (NOVO)**
- **Tokens via CSS variables**
- **Integração com Tailwind**
- **Uso obrigatório dos componentes do ui.shadcn**
- **Compatível com SaaS Multi-tenant**
- **Sem hardcode de HEX em componentes**

**IMPORTANTE:** Não alterar regras de negócio, páginas, banco, autenticação, rotas, nem criar features além do necessário. Faça apenas o que este documento pede.

---

## 1) Stack (imutável)
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Componentes UI: **ui.shadcn**
- Estratégia de temas: **CSS Variables** + Tailwind

---

## 2) Regras absolutas (NÃO NEGOCIÁVEIS)
1. **Proibido** usar `#hex` hardcoded em componentes, páginas ou classes Tailwind (ex: `text-[#0A0D12]`).
2. **Toda cor** deve vir de tokens: `bg-primary`, `text-foreground`, `border-border`, `bg-muted`, etc.
3. Dark mode deve existir e funcionar.
4. Componentes devem ser os do **ui.shadcn** sempre que existir equivalente (Button, Input, Card, Badge, Alert, Dropdown, Dialog, Tabs etc).
5. Os tokens devem suportar multi-tenant: possibilidade de trocar a paleta por tenant **sem quebrar o sistema**.

---

## 3) Paleta oficial COMPETIR (base fornecida)

### 3.1 Primary (Preto/Cinza escuro — NOVO)
Use **apenas** estes primários (conforme fornecido):

- Primary 600: `#535862`
- Primary 700: `#414651`
- Primary 800: `#252B37`
- Primary 900: `#181D27`
- Primary 950: `#0A0D12`

**Mapeamento esperado (sem inventar novas cores):**
- **Primary (brand 800)**: `#252B37`
- **Primary hover/active (brand 900)**: `#181D27`
- **Primary strong (brand 950)**: `#0A0D12`
- **Primary soft bg (brand 600)**: `#535862` *(usar apenas como apoio quando necessário via tokens existentes, sem criar “nova paleta”)*
- **Primary soft bg 2 (brand 700)**: `#414651` *(idem)*

> Observação: os “soft bg” aqui são **tons de cinza escuro** (não roxo). Não criar cores claras novas fora do que já existe em Neutros.

### 3.2 Neutros (Gray Neutral)

Light:
- Background: `#FCFCFD`
- Card: `#FFFFFF`
- Border: `#D2D6DB`
- Muted: `#F3F4F6`
- Foreground: `#111927`
- Muted foreground: `#6C737F`

Dark (Gray dark mode):
- Background: `#0C0E12`
- Card: `#13161B`
- Border: `#373A41`
- Foreground: `#F7F7F7`
- Muted foreground: `#94979C`

### 3.3 Estados semânticos
- Success 600: `#16B364`
- Warning 600: `#EF6820`
- Destructive 600: `#D92D20`

---

## 4) Tokens (CSS Variables) — Padrão shadcn

Crie/ajuste tokens no CSS global (ex: `app/globals.css`) usando **HSL (recomendado)** ou HEX convertidos para HSL.

Deve existir:
- `:root` (Light)
- `.dark` (Dark)

### 4.1 Tokens obrigatórios (mínimo)

Você deve definir ao menos estes tokens:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

### 4.2 Mapeamento semântico (atualizado)
- `primary`: usar **Primary 800** (`#252B37`)
- `ring`: usar **primary** (focus)
- `muted`: superfícies leves (da seção Neutros)
- `destructive`: ações de risco
- `accent`: pode ser **um tom escuro de apoio do primary** (ex: Primary 700 ou 600) **sem criar cor vibrante nova**
- `secondary`: usar superfícies neutras (outline / backgrounds) — não inventar nova paleta

---

## 5) Tailwind config (tokens)

Ajuste `tailwind.config.ts` para mapear cores para `hsl(var(--token))`, exemplo:

- `background: "hsl(var(--background))"`
- `primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }`

Repita para todos os tokens definidos.

Meta: permitir usar classes como:

- `bg-background text-foreground`
- `bg-card`
- `bg-primary text-primary-foreground`
- `border-border`
- `ring-primary`
- `text-muted-foreground`

---

## 6) Componentes (ui.shadcn) — regras de uso

1. Todo Button deve ser do ui.shadcn.
2. Variantes obrigatórias:
   - Primary (default)
   - Secondary (outline)
   - Destructive
   - Ghost/Link (se existir)
3. Inputs, Selects, Textarea, Dialog, Dropdown, Badge, Alert, Tabs devem vir do ui.shadcn.
4. Se algum componente não existir no kit, criar seguindo o padrão estrutural do ui.shadcn (mesma abordagem de tokens e variantes).

---

## 7) Dark mode

- Deve funcionar via classe `.dark` no `html` ou `body`.
- Garantir que componentes ui.shadcn herdem corretamente:
  - `bg-background`
  - `text-foreground`
  - `border-border`
- Focus (ring) deve usar `--ring` = primary.

---

## 8) Multi-tenancy (SaaS) — ajuste de tema por tenant

### 8.1 Regra

Multi-tenant significa:
- Um único build
- Tema pode variar por tenant futuramente

### 8.2 Implementação mínima exigida

- Adicionar suporte a:
  - `data-tenant="competir"` no `<html>` ou `<body>`
- Estrutura esperada:
  - `:root` define tema default Competir
  - `[data-tenant="competir"]` pode reforçar o padrão
  - Futuramente `[data-tenant="tenant-x"]` sobrescreve apenas `--primary`, etc.

NÃO criar sistema complexo de temas agora. Apenas preparar a base estrutural.

---

## 9) Proibições

- Não criar novas páginas.
- Não alterar layout existente fora do necessário para aplicar tokens.
- Não mudar tipografia ou espaçamentos.
- Não adicionar dependências extras.
- Não usar cores fora da paleta oficial.

---

## 10) Checklist de aceite

- [ ] Não existe `#HEX` em componentes/páginas (exceto no arquivo de tokens)
- [ ] Tailwind usa `hsl(var(--...))`
- [ ] Classes semânticas funcionam (`bg-primary`, `text-foreground`, etc.)
- [ ] Dark mode funcional
- [ ] Componentes ui.shadcn respeitam tokens
- [ ] Estrutura preparada para multi-tenant
- [ ] Primary roxo foi removido e substituído pelo **Primary preto/cinza escuro** (600/700/800/900/950)

---

## 11) Entregáveis

1. `app/globals.css` com tokens Light/Dark
2. `tailwind.config.ts` mapeado para tokens
3. Remoção de hardcoded colors
4. Exemplo mínimo: Button + Card + Input usando apenas tokens

FIM.

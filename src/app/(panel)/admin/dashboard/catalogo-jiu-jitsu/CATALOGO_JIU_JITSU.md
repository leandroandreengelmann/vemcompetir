# Catálogo Jiu-Jitsu — Base de conhecimento

Demo isolada do super admin em `/admin/dashboard/catalogo-jiu-jitsu/preview`. Não conecta ao banco — todos os dados vêm de `lib/*.ts` estáticos.

## Estrutura de pastas

```
catalogo-jiu-jitsu/
├── lib/
│   ├── adulto-masculino.ts     # IBJJF Adulto M+F · Gi+No-Gi · 5 faixas · 9M+8F pesos
│   ├── master.ts               # IBJJF · 7 grupos Master · M+F · Gi+No-Gi · 5 faixas
│   ├── juvenil.ts              # IBJJF Juvenil I/II (16-17) · M+F · Gi+No-Gi · 3 faixas
│   ├── infantil.ts             # IBJJF Infantil Gi · 12 idades (4-15) · 13 faixas · 9 pesos sem nome
│   ├── infantil-nogi.ts        # IBJJF Infantil No-Gi · 6 grupos pareados · 6 faixas · 12 pesos com nome
│   ├── aamep-adulto.ts         # AAMEP Adulto M+F · só Gi · 5 faixas · 9M+8F pesos
│   ├── aamep-juvenil.ts        # AAMEP Juvenil (14-17) · M+F · só Gi · 3 faixas (até Roxa)
│   ├── aamep-master.ts         # AAMEP Master · só Masculino · 2 grupos (M1/M2) · 3 pesos
│   ├── aamep-kids.ts           # AAMEP Kids · 5 grupos pareados (6-15) · 6 faixas simples · 9 pesos
│   └── aamep-absolutos.ts      # AAMEP Absolutos · tabela própria · independente de faixa
└── components/
    ├── preview-tabs.tsx        # Toggle IBJJF/AAMEP + modos por categoria × admin/atleta
    ├── adulto-preview.tsx + adulto-athlete-view.tsx          (IBJJF)
    ├── master-preview.tsx + master-athlete-view.tsx          (IBJJF)
    ├── juvenil-preview.tsx + juvenil-athlete-view.tsx        (IBJJF)
    ├── kids-preview.tsx + kids-athlete-view.tsx              (IBJJF, Gi/No-Gi toggle interno)
    ├── aamep-adulto-preview.tsx + aamep-adulto-athlete-view.tsx
    ├── aamep-juvenil-preview.tsx + aamep-juvenil-athlete-view.tsx
    ├── aamep-master-preview.tsx + aamep-master-athlete-view.tsx
    ├── aamep-kids-preview.tsx + aamep-kids-athlete-view.tsx
    └── aamep-absolutos-preview.tsx + aamep-absolutos-athlete-view.tsx
```

## Os 5 eixos do jiu-jitsu

idade × gênero × faixa × peso × modalidade

## Categorias e regras (IBJJF/CBJJ)

### Adulto (18+)
- 5 faixas: Branca, Azul, Roxa, Marrom, Preta
- M: 9 pesos + Absoluto (Galo 57.5 → Pesadíssimo 100.5+)
- F: 8 pesos + Absoluto (Galo 48.5 → Super Pesado 79.3+)
- No-Gi: ~2 kg mais leve que Gi (oficial IBJJF)

### Master (30+)
- 7 grupos: Master 1 (30-35), 2 (36-40), 3 (41-45), 4 (46-50), 5 (51-55), 6 (56-60), 7 (61+)
- 5 faixas (já podem ter Marrom e Preta)
- Tabela de pesos = igual ao Adulto
- No-Gi: mesmo padrão "Gi −2 kg"

### Juvenil (16-17)
- 2 idades: Juvenil I (16), Juvenil II (17)
- 3 faixas: Branca, Azul, Roxa (Marrom só aos 18, Preta aos 19)
- M: 9 pesos + Absoluto · F: 8 + Absoluto (mesmos nomes do Adulto)
- No-Gi (valores oficiais IBJJF, NÃO usar aproximação −2 kg):
  - M: 51.5 / 56.5 / 62.0 / 67.5 / 72.5 / 77.5 / 82.5 / 88.5 / +
  - F: 42.5 / 46.5 / 50.5 / 55.0 / 59.5 / 63.5 / 68.0 / +

### Infantil — Gi (4-15) · `lib/infantil.ts`
- 12 idades individuais: Pré-mirim I/II/III (4-6), Mirim I/II/III (7-9), Infantil I/II/III (10-12), Infantojuvenil I/II/III (13-15)
- Faixas progressivas (até 13): Branca → Cinza-Branca/Cinza/Cinza-Preta → Amarela trio → Laranja trio → Verde trio
  - Pré-mirim (4-6): só 4 (Branca + Cinzas)
  - Mirim (7-9): + 3 Amarelas = 7
  - Infantil (10-12): + 3 Laranjas = 10
  - Infantojuvenil (13-15): + 3 Verdes = 13
- 9 pesos por idade SEM nome (Galo/Pluma só do Juvenil em diante) — exibidos como "Peso 1 → Peso 9"

### Infantil — No-Gi (4-15) · `lib/infantil-nogi.ts`
**Estrutura completamente diferente do Gi** (não tentar encaixar na shape do Gi):
- 6 grupos pareados: Pré-mirim (4-5), Mirim/Little (6-7), Infantil A (8-9), Infantil B (10-11), Infanto Juvenil A (12-13), Infanto Juvenil B (14-15)
- 6 faixas simples (sem variantes Branca-Preta): Branca, Cinza, Amarela, Laranja, Verde, Azul
  - Pré-mirim: 2 (Branca, Cinza)
  - Mirim/Little: 3 (+ Amarela)
  - Infantil A/B: 4 (+ Laranja)
  - Infanto Juvenil A: 5 (+ Verde)
  - Infanto Juvenil B: 6 (+ Azul)
- 12 pesos COM nome: Galo, Pluma, Pena, Leve, Médio, Meio Pesado, Pesado, Super Pesado, Pesadíssimo, Extra Pesadíssimo, Extra Pesadíssimo 2, Extra Pesadíssimo 3
- Ranges em kg específicos por grupo × gênero (extraídos do CSV oficial fornecido pelo usuário)

## Padrão de componentes

Cada categoria tem **dois componentes** com mesma estrutura:

### `*-preview.tsx` (admin)
- Card "Os 5 eixos" no topo com `AxisChip` × 5
- Toggle gênero + toggle modalidade (Gi/No-Gi) onde aplicável
- Filtros de chips: idade/grupo + faixa
- Grade: idade → faixa → pesos
- Card final em `bg-muted/30 border-dashed` explicando regras

### `*-athlete-view.tsx` (atleta)
- Header com gradient + ícone (BabyIcon, StudentIcon, TrophyIcon, UserCircleIcon)
- Toggle gênero + modalidade
- Busca por texto livre
- Filtros de chips
- Grid de cards (md:grid-cols-2), com badge de faixa, peso, range, "Mais pesado", aviso de responsável (Pré-mirim/Mirim)
- `cart: Set<string>` com IDs prefixados por modalidade (`gi-...` / `nogi-...`)
- Sticky bottom card mostrando contagem da sacola
- Limite de 60 itens visíveis

## Categorias e regras (AAMEP)

Federação paralela ao IBJJF/CBJJ. Estrutura mais condensada e exclusivamente Gi.

### Adulto AAMEP (18+)
- 5 faixas: Branca, Azul, Roxa, Marrom, Preta
- M: 9 pesos (Galo 57.5 → Pesadíssimo 100.5+)
- F: 8 pesos (Galo 48.5 → Super Pesado 79.3+, sem Pesadíssimo)
- Tempo de luta: 6 min · sem No-Gi

### Juvenil AAMEP (14-17)
- Faixa etária mais ampla que IBJJF (que usa só 16-17)
- 3 faixas: Branca, Azul, Roxa (Marrom só aos 18, Preta aos 19 — mesma regra do IBJJF)
- M: 9 pesos · F: 8 pesos · Tempo: 5 min

### Master AAMEP (30+)
- Apenas Masculino (AAMEP não modela Master Feminino)
- Apenas 2 grupos: M1 (30-40), M2 (40+) — bem mais condensado que IBJJF (M1-M7)
- 5 faixas (igual IBJJF Master)
- Apenas 3 pesos por grupo: Pluma, Médio, Pesado (livre)
  - M1: Pluma 0-64 · Médio 64-74 · Pesado 74+
  - M2: Pluma 0-70 · Médio 70-80 · Pesado 80+
- Tempo: 5 min

### Kids AAMEP (6-15)
- 5 grupos pareados por ano de nascimento (M+F):
  - Mirim (6-7, 2019/2020) — 2 faixas, 2 min
  - Infantil A (8-9, 2017/2018) — 3 faixas, 3 min
  - Infantil B (10-11, 2015/2016) — 4 faixas, 3,5 min
  - Inf. Juvenil A (12-13, 2013/2014) — 5 faixas, 4 min
  - Inf. Juvenil B (14-15, 2011/2012) — 6 faixas, 4 min
- 6 faixas simples (Branca, Cinza, Amarela, Laranja, Verde, Azul) — **sem variantes ponta-preta/ponta-branca** (decisão do produto)
- 9 pesos com nome (Galo → Pesadíssimo) por idade × gênero

### Absolutos AAMEP
- Tabela própria, separada da grade de pesos
- Independem de faixa
- Adulto M/F: Absoluto Livre (6 min)
- Juvenil M: até 65 / até 82 kg · Juvenil F: até 60 / até 80 kg (5 min)
- Master M: Absoluto Livre (5 min) · sem Master F

## `preview-tabs.tsx`

Toggle de federação no topo (IBJJF/CBJJ vs AAMEP) + grupos de categorias por federação:

**IBJJF (8 modos)**
- Adulto (BarbellIcon): admin + atleta
- Master (TrophyIcon): admin + atleta
- Juvenil (StudentIcon): admin + atleta
- Infantil (BabyIcon): admin + atleta

**AAMEP (10 modos)**
- Adulto (BarbellIcon): admin + atleta
- Juvenil (StudentIcon): admin + atleta
- Master (TrophyIcon): admin + atleta — só Masculino
- Kids (BabyIcon): admin + atleta
- Absolutos (MedalIcon): admin + atleta — tabela própria

## Helpers compartilhados

- `formatWeightRange(min, max)` em `lib/adulto-masculino.ts` — formata `0 a 53,5 kg` / `+89,3 kg`
- `getBeltStyle` em `@/lib/belt-theme` (não usado nas previews atuais — usado em outros lugares do app)

## Fontes de dados

### CSVs em `jj_lab_raw_rows` (Supabase, projeto `fwgnwufqtujwxeaixpqh`)
- 4492 linhas total
- ~3182 linhas com `Faixa Etária` + `Modalidade`: cobrem Adulto, Adulto (18-29), Master 1-7, Juvenil — Gi e No-Gi
- ~1310 linhas com `divisao_idade` + `tipo_pesagem='Kimono liso'`: cobrem TODAS as idades em Gi (Pré-mirim a Master 7) — sem No-Gi
- Acessar via `data->>'campo'` (NÃO `raw->>` — coluna correta é `data` JSONB)

### Dados não vindos do banco
- **Juvenil No-Gi**: tabela oficial IBJJF (CSV não cobre)
- **Master No-Gi**: padrão "Gi −2 kg" do Adulto (CSV cobre só Gi)
- **Infantil No-Gi**: CSV oficial fornecido pelo usuário em chat — encodado direto em `lib/infantil-nogi.ts` (não está no banco)

## Convenções importantes

- **Estática**: nada bate banco. Toda decisão de "qual faixa em qual idade" está em `lib/*.ts`.
- **Cart IDs**: sempre incluem modalidade no prefixo para permitir seleções independentes Gi/No-Gi.
- **Naming convention**:
  - Gi: `Categoria • idade anos • Gênero • Faixa • Peso N (range) • Kimono`
  - No-Gi: `Categoria • idade anos • Gênero • Faixa • NomePeso (range) • Sem kimono`
- **Não compartilhar shapes**: o Infantil Gi e No-Gi têm tipos distintos (`KidsBeltKey` vs `KidsNogiBeltKey`, etc.) porque a estrutura real da federação é diferente.
- **Federações**: IBJJF/CBJJ é a base. AAMEP foi adicionada como federação paralela com tipos próprios (`AamepWeight`, `AamepKidsBeltKey`, etc.) — não compartilha shape com IBJJF. Outras federações (AJP, JJIF, etc.) ainda não estão modeladas.
- **AAMEP é só Gi**: a federação não modela No-Gi nas tabelas oficiais — todos os componentes AAMEP omitem o toggle Gi/No-Gi.
- **Cart IDs AAMEP**: prefixados por `aamep-{categoria}-...` para não colidir com IDs IBJJF.

## Estado atual (2026-05-04)

**IBJJF/CBJJ**
- ✅ Adulto Gi+No-Gi
- ✅ Master Gi+No-Gi (todos os 7 grupos)
- ✅ Juvenil Gi+No-Gi (valores oficiais IBJJF, não aproximação)
- ✅ Infantil Gi (`lib/infantil.ts`)
- ✅ Infantil No-Gi (`lib/infantil-nogi.ts`) com toggle Gi/No-Gi nos componentes kids

**AAMEP**
- ✅ Adulto (M+F) — `lib/aamep-adulto.ts`
- ✅ Juvenil (M+F, até Roxa) — `lib/aamep-juvenil.ts`
- ✅ Master (só Masculino, M1/M2, 3 pesos) — `lib/aamep-master.ts`
- ✅ Kids (5 grupos pareados, faixas simples) — `lib/aamep-kids.ts`
- ✅ Absolutos (tabela própria) — `lib/aamep-absolutos.ts`

## Possíveis próximos passos

- Conectar ao banco (criar tabelas próprias do catálogo a partir das `lib/*.ts`)
- Adicionar export para CSV/JSON
- Validador: dada idade + gênero + peso atual + faixa → retornar a categoria correta em cada modalidade
- Comparador lado-a-lado Gi vs No-Gi (hoje exige toggle)
- Outras federações (estrutura paralela)

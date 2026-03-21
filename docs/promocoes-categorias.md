# Mapeamento: Promoções em Categorias de Eventos

> Criado em: 20/03/2026
> Status: **Estrutura criada no banco, frontend NÃO consome ainda**

---

## Situação Atual

### No Banco de Dados

A tabela `event_category_overrides` recebeu hoje (20/03/2026) dois novos campos via migration `20260320021600_add_category_promotions_columns`:

| Coluna | Tipo | Default | Nullable |
|---|---|---|---|
| `promo_type` | text | null | SIM |
| `promo_value` | numeric | null | SIM |

Estrutura completa da tabela:
```
event_category_overrides
├── id              UUID PK
├── event_id        UUID → events.id
├── category_id     UUID → category_rows.id (UNIQUE com event_id)
├── registration_fee NUMERIC (preço base da categoria naquele evento)
├── promo_type      TEXT   ← NOVO
├── promo_value     NUMERIC ← NOVO
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ
```

### Dados Existentes no Banco

Já existem **6 registros** com `promo_type` preenchido, todos no mesmo evento (`c2e716f2`):

| promo_type | Qtd | promo_value |
|---|---|---|
| `free_second_registration` | 6 | null (sem valor numérico) |

> A promoção `free_second_registration` foi setada manualmente/via código para categorias específicas. O `promo_value` está nulo em todos os casos — o tipo de promoção por si só define a regra.

### No Frontend

**Nenhuma parte do frontend lê ou aplica `promo_type` / `promo_value` ainda.**

Os arquivos que consultam `event_category_overrides` selecionam **apenas**:
```ts
.select('category_id, registration_fee')
```

Arquivos afetados:
- `src/app/(panel)/actions/event-categories.ts` (linhas ~289, ~402) — usado no painel do organizador
- `src/app/(panel)/academia-equipe/dashboard/eventos/registrations-actions.ts` — usado no painel de academia

---

## Tipo de Promoção Definido

### `free_second_registration`
- **Significado**: a segunda inscrição do atleta naquela categoria (ou evento?) é gratuita.
- **Como funciona hoje**: o campo existe no banco mas **nenhuma lógica de negócio o aplica**.
- **promo_value**: não utilizado neste tipo (a promoção é binária: tem ou não tem).

---

## O Que Precisa Ser Feito (Futuro)

### 1. Definir os tipos de promoção suportados
Exemplos a decidir:
- `free_second_registration` — 2ª inscrição gratuita
- `percent_discount` — desconto percentual (usaria `promo_value` como %)
- `fixed_discount` — desconto fixo em reais (usaria `promo_value` como R$)
- `fixed_price` — preço fixo promocional (usaria `promo_value` como preço final)

### 2. Aplicar a lógica no backend (carrinho/checkout)
- No `addToAthleteCartAction()` — `src/app/atleta/dashboard/campeonatos/athlete-cart-actions.ts`
- No `addToCartAction()` (academia) — `src/app/(panel)/academia-equipe/dashboard/eventos/cart-actions.ts`
- Verificar se o atleta já tem inscrição na categoria/evento para aplicar `free_second_registration`

### 3. Expor `promo_type` e `promo_value` nas queries de categorias
- `getEligibleCategoriesWithPrices()` em `event-categories.ts`
- `searchEventCategories()` em `event-categories.ts`
- `getEligibleCategoriesAction()` em `registrations-actions.ts`

### 4. Exibir promoção na UI
- `CategoryCard.tsx` (atleta) — mostrar badge/label de promoção
- `registration-category-card.tsx` (academia) — idem
- Mostrar preço original riscado + preço com promoção

### 5. Painel do organizador — configurar promoção por categoria
- Atualmente só é possível editar `registration_fee` por categoria
- Adicionar campo de tipo de promoção e valor

---

## Arquivos-Chave

| Arquivo | Papel |
|---|---|
| `src/app/(panel)/actions/event-categories.ts` | Leitura de overrides (precisa incluir promo_type/value) |
| `src/app/(panel)/academia-equipe/dashboard/eventos/registrations-actions.ts` | Match + preço academia |
| `src/app/atleta/dashboard/campeonatos/athlete-cart-actions.ts` | Carrinho atleta (aplicar desconto aqui) |
| `src/app/(panel)/academia-equipe/dashboard/eventos/cart-actions.ts` | Carrinho academia (aplicar desconto aqui) |
| `src/app/atleta/dashboard/campeonatos/components/_components/CategoryCard.tsx` | UI atleta |
| `src/app/(panel)/academia-equipe/dashboard/eventos/components/registration-category-card.tsx` | UI academia |

---

## Notas Importantes

- A constraint `UNIQUE(event_id, category_id)` garante no máximo 1 override por categoria por evento.
- `promo_type` e `promo_value` convivem com `registration_fee` — o preço base ainda é `registration_fee`, a promoção é aplicada em cima dele.
- Não existe ainda validação de `promo_type` via CHECK constraint no banco (qualquer string é aceita).

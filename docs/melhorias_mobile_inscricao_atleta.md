# Melhorias Mobile — Página de Inscrição do Atleta

**Data:** 2026-03-31  
**Rota:** `/atleta/dashboard/campeonatos/[id]`  
**Status:** Pendente de implementação

---

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/atleta/dashboard/campeonatos/components/AthleteEventDetail.tsx` | Layout principal — grid 2 colunas |
| `src/app/atleta/dashboard/campeonatos/components/_components/EventHeader.tsx` | Imagem do evento + badge de status |
| `src/app/atleta/dashboard/campeonatos/components/_components/EventSummary.tsx` | Data e localização |
| `src/app/atleta/dashboard/campeonatos/components/_components/AthleteProfileCard.tsx` | Card "Seu Perfil" |
| `src/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel.tsx` | Busca + filtros de categorias |
| `src/app/atleta/dashboard/campeonatos/components/_components/CategoryCard.tsx` | Card individual de categoria |
| `src/app/atleta/components/AthleteCartTrigger.tsx` | Botão flutuante da sacola |

---

## Problemas Identificados

### Críticos

**1. Scroll excessivo até as categorias**  
`AthleteEventDetail.tsx:74` — grid `grid-cols-1 md:grid-cols-12`. No mobile, a coluna esquerda (imagem + resumo + perfil) aparece inteira antes das categorias, que é a ação principal da tela.

**2. Botão da sacola na zona de difícil alcance**  
`AthleteCartTrigger.tsx` — posicionado em `fixed top-4 right-4`, canto superior direito, zona inacessível no mapa de polegar do mobile.

**3. Touch targets abaixo do mínimo nos filtros**  
`CategorySearchPanel.tsx:184` — pill-buttons com `py-1.5` resultam em ~36-38px de altura, abaixo dos 44pt (iOS) / 48dp (Android) recomendados.

**4. Sequência preço → botão no mobile**  
`CategoryCard.tsx:122` — rodapé usa `flex-col sm:flex-row`. No mobile, o preço aparece antes do botão "Inscrever", sequência visual estranha para uma CTA primária.

### Importantes

**5. `text-[10px]` literal viola o design system**  
`AthleteProfileCard.tsx:85` — uso de tamanho arbitrário. O sistema define apenas `text-panel-sm/md/lg`.

**6. Imagem `aspect-square` domina a tela no mobile**  
`EventHeader.tsx:24` — `aspect-square w-full` em 390px de largura resulta em 390×390px de imagem antes de qualquer conteúdo útil.

**7. Filtros em `flex-wrap` sem controle de altura**  
`CategorySearchPanel.tsx:209` — com múltiplos filtros ativos, a área pode ocupar 3-4 linhas sem indicador visual ou collapse.

**8. Label "Ver" oculto no mobile**  
`CategoryCard.tsx:205` — `hidden sm:inline-flex` esconde o texto, deixando apenas o ícone sem affordance textual.

---

## Plano de Implementação

> Todas as mudanças seguem o design system: `rounded-3xl/2xl/xl`, tokens `text-panel-sm/md/lg`, ícones Phosphor duotone, cores via `--primary` dinâmico da faixa.

---

### 1 — Reordenar colunas no mobile (`AthleteEventDetail.tsx`)

Categorias sobem para primeiro lugar no mobile usando `order-*`, sem quebrar o grid desktop.

```diff
- <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
+ <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">

-   <div className="md:col-span-5 space-y-6">
+   <div className="order-2 md:order-1 md:col-span-5 space-y-6">

-   <div className="md:col-span-7 space-y-6">
+   <div className="order-1 md:order-2 md:col-span-7 space-y-6">
```

---

### 2 — Imagem compacta no mobile (`EventHeader.tsx`)

Reduzir de `aspect-square` para banner `aspect-[16/7]` no mobile. Badge de status posicionado sobre a imagem (absoluto), liberando espaço vertical.

```diff
- <div className="relative aspect-square w-full rounded-md border border-border overflow-hidden bg-muted shadow-sm">
+ <div className="relative w-full rounded-2xl border border-border overflow-hidden bg-muted shadow-sm aspect-[16/7] md:aspect-square">
```

Mover o badge para dentro da div da imagem com posicionamento absoluto:
```diff
+ <div className="absolute bottom-3 left-3">
    {isEndingSoon ? ( ... badge ... ) : ( ... badge ... )}
+ </div>
```

Remover o `<div className="px-1">` externo que envolvia o badge.

---

### 3 — Touch targets nos filtros (`CategorySearchPanel.tsx`)

```diff
- const PILL_BASE = 'px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all';
+ const PILL_BASE = 'px-3 py-2.5 rounded-full text-panel-sm font-semibold border transition-all min-h-[44px] flex items-center';
```

---

### 4 — Reordenar rodapé do CategoryCard (`CategoryCard.tsx`)

Botão "Inscrever" aparece antes do preço no mobile usando `flex-col-reverse`.

```diff
- <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-auto pt-2 gap-2">
+ <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between mt-auto pt-2 gap-2">
```

---

### 5 — Corrigir token tipográfico (`AthleteProfileCard.tsx`)

```diff
- <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
+ <p className="text-panel-sm uppercase tracking-wide text-muted-foreground opacity-60">
```

---

### 6 — Sacola na thumb zone (`AthleteCartTrigger.tsx` + pai)

Localizar onde `<AthleteCartTrigger />` é montado e envolver com div de posicionamento contextual:

```diff
- <AthleteCartTrigger />
+ <div className="fixed bottom-6 right-4 md:top-4 md:bottom-auto md:right-6 z-50">
+   <AthleteCartTrigger />
+ </div>
```

---

### 7 — Label "Ver" visível no mobile (`CategoryCard.tsx`)

```diff
- <span className="text-panel-sm font-bold text-primary uppercase tracking-wider hidden sm:inline-flex">
+ <span className="text-panel-sm font-bold text-primary uppercase tracking-wider">
```

---

## Prioridade

| # | Arquivo | Impacto | Esforço |
|---|---------|---------|---------|
| 1 | `AthleteEventDetail.tsx` | Alto — categorias acessíveis sem scroll | Baixo |
| 2 | `EventHeader.tsx` | Alto — imagem não domina a tela | Baixo |
| 3 | `CategorySearchPanel.tsx` | Alto — touch targets corretos | Mínimo |
| 4 | `CategoryCard.tsx` | Médio — CTA principal em destaque | Mínimo |
| 5 | `AthleteProfileCard.tsx` | Médio — conformidade com design system | Mínimo |
| 6 | `AthleteCartTrigger.tsx` | Médio — finalização acessível | Baixo |
| 7 | `CategoryCard.tsx` | Baixo — affordance textual | Mínimo |

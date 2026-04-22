# Como Funciona o Chaveamento — Explicação Detalhada

Documento técnico explicativo sobre o algoritmo de geração de chaves (brackets) usado no sistema Competir. O código-fonte está em `src/lib/bracket-utils.ts` (função `generateBracketLogic`).

---

## 1. Objetivo

Gerar automaticamente uma chave de **eliminatória simples** (single elimination) que:

1. **Distribua atletas da mesma equipe** para os pontos mais distantes possíveis da árvore, evitando confrontos internos precoces.
2. **Trate BYEs (avanços automáticos)** quando o número de atletas não é potência de 2, garantindo que nunca haja um confronto BYE vs BYE.
3. **Seja determinístico e matematicamente verificável**, sem sorteio aleatório ingênuo.

---

## 2. Tipos de Dados (Contratos)

```typescript
interface Athlete {
  name: string;
  team: string;
}

interface Match {
  id: string;
  athleteA: string | null;
  athleteB: string | null;
  teamA?: string | null;
  teamB?: string | null;
  winner: string | null;
  isBye: boolean;
}

interface Round {
  name: string;       // "Round 1", "Semi-Final", "Final"...
  matches: Match[];
}
```

O retorno da função `generateBracketLogic` é um `Round[]` já com o Round 1 preenchido (inclusive com vencedores automáticos em BYEs) e os rounds seguintes vazios, prontos para receber os vencedores à medida que as lutas forem resolvidas.

---

## 3. Visão Geral do Fluxo

```
Lista de Atletas
      │
      ▼
[Passo 1] Calcular tamanho da chave (potência de 2)
      │
      ▼
[Passo 2] Agrupar por equipe (BYEs = "equipe gigante")
      │
      ▼
[Passo 3] Ordenar equipes da maior para a menor
      │
      ▼
[Passo 4] Concatenar em um único array contíguo
      │
      ▼
[Passo 5] Bit-Reversal Permutation → slots físicos
      │
      ▼
[Passo 6] Montar Round 1 (pares consecutivos = confrontos)
      │
      ▼
[Passo 7] Montar rounds seguintes (vazios, ligados por índice)
      │
      ▼
   Bracket pronto
```

---

## 4. Passo a Passo Detalhado

### Passo 1 — Tamanho da Chave (Potência de 2)

```typescript
const size = nextPowerOf2(count);
const roundsCount = Math.log2(size);
```

Toda chave de eliminatória simples precisa ter um número de slots que seja potência de 2 (2, 4, 8, 16, 32, 64, 128…). Isso porque cada rodada **divide exatamente pela metade** o número de lutadores restantes.

| Atletas | Tamanho da chave | BYEs |
|--------:|-----------------:|-----:|
|      3  |               4  |   1  |
|      5  |               8  |   3  |
|     21  |              32  |  11  |
|     33  |              64  |  31  |
|    100  |             128  |  28  |

`roundsCount` é o número de rodadas da chave (ex.: 32 slots ⇒ 5 rodadas).

---

### Passo 2 — Agrupamento por Equipe

```typescript
const teamMap = new Map<string, (Athlete | "BYE")[]>();
for (const a of athleteList) {
  const t = a.team?.trim() || "Sem Equipe";
  if (!teamMap.has(t)) teamMap.set(t, []);
  teamMap.get(t)!.push(a);
}

// BYEs viram uma "equipe gigante"
const numByes = size - count;
if (numByes > 0) {
  teamMap.set("BYE_TEAM", new Array(numByes).fill("BYE"));
}
```

**Regra crucial:** os espaços vazios (BYEs) são empacotados como se fossem a "equipe BYE_TEAM". Isso é o que garante que dois BYEs nunca caiam no mesmo confronto do Round 1 — eles serão distribuídos pelas pontas da chave junto com as equipes reais.

---

### Passo 3 — Ordenação Decrescente

```typescript
const sortedTeams = [...teamMap.values()].sort((a, b) => b.length - a.length);
```

As equipes com mais atletas entram primeiro no array mestre. Isso assegura que os "grupos maiores" recebam prioridade na distribuição fractal — os maiores primeiro, os menores encaixam nas sobras.

---

### Passo 4 — Array Mestre Contíguo

```typescript
const allAthletes: (Athlete | "BYE")[] = [];
for (const team of sortedTeams) {
  allAthletes.push(...team);
}
```

Cria-se uma fila única (`allAthletes`) onde atletas da mesma equipe ficam **colados lado a lado**. Esse é justamente o estado que a Bit-Reversal Permutation vai explodir para os extremos opostos da chave.

Exemplo (chave de 8, 3 equipes):
```
Equipe Alpha (3 atletas): A1 A2 A3
Equipe Beta  (2 atletas): B1 B2
Equipe Gama  (1 atleta):  G1
BYE_TEAM     (2 BYEs):    BYE BYE

allAthletes = [A1, A2, A3, B1, B2, G1, BYE, BYE]
```

---

### Passo 5 — Bit-Reversal Permutation (o coração do algoritmo)

```typescript
function getBitReverseSlot(k: number, roundsCount: number): number {
  let rev = 0;
  for (let i = 0; i < roundsCount; i++) {
    rev = (rev << 1) | ((k >> i) & 1);
  }
  return rev;
}

const slots: (Athlete | "BYE" | null)[] = new Array(size).fill(null);
for (let k = 0; k < size; k++) {
  slots[getBitReverseSlot(k, roundsCount)] = allAthletes[k];
}
```

**A ideia matemática:** o índice do atleta no array mestre é convertido em binário, os bits são invertidos, e o resultado é o índice do slot físico na chave. Essa operação tem a propriedade de **maximizar a distância física** entre índices consecutivos.

#### Exemplo para chave de 8 (`roundsCount = 3`)

| k (decimal) | k (binário) | bits invertidos | slot físico |
|------------:|:-----------:|:---------------:|------------:|
|          0  |     000     |       000       |          0  |
|          1  |     001     |       100       |          4  |
|          2  |     010     |       010       |          2  |
|          3  |     011     |       110       |          6  |
|          4  |     100     |       001       |          1  |
|          5  |     101     |       101       |          5  |
|          6  |     110     |       011       |          3  |
|          7  |     111     |       111       |          7  |

Aplicando na fila `[A1, A2, A3, B1, B2, G1, BYE, BYE]`:

| Slot físico | Conteúdo |
|------------:|:--------:|
|         0   |    A1    |
|         1   |    B2    |
|         2   |    A3    |
|         3   |   BYE    |
|         4   |    A2    |
|         5   |    G1    |
|         6   |    B1    |
|         7   |   BYE    |

Os pares do Round 1 (slots 0-1, 2-3, 4-5, 6-7):

```
Luta 1: A1 (Alpha) × B2 (Beta)
Luta 2: A3 (Alpha) × BYE        ← A3 avança
Luta 3: A2 (Alpha) × G1 (Gama)
Luta 4: B1 (Beta)  × BYE        ← B1 avança
```

**Observações:**
- Os três atletas da Alpha (A1, A2, A3) foram espalhados em slots 0, 4 e 2 — nenhum se encontra no Round 1.
- Os dois BYEs caíram em slots 3 e 7, em confrontos diferentes.
- Nenhum confronto BYE vs BYE ocorreu.

---

### Passo 6 — Construção do Round 1

```typescript
for (let i = 0; i < size / 2; i++) {
  const slotA = slots[i * 2]!;
  const slotB = slots[i * 2 + 1]!;
  const isBye = slotA === "BYE" || slotB === "BYE";
  // ... monta o Match
  if (isBye) {
    match.winner = /* o atleta real do par */;
  }
}
```

Para cada par `(slot 2i, slot 2i+1)` cria-se um `Match`. Quando um dos lados é BYE, o vencedor é automaticamente o outro lado (o atleta real).

---

### Passo 7 — Rounds Seguintes

```typescript
for (let r = 1; r < roundsCount; r++) {
  const mCount = Math.pow(2, roundsCount - r - 1);
  // cria mCount partidas vazias
  // propaga vencedores do round anterior
}
```

Os rounds seguintes são criados **vazios** e a função já propaga os vencedores conhecidos (os de BYE). A lógica de propagação usa:

- `nextPos = Math.floor(idx / 2)` — a partida do round atual alimenta a partida `⌊idx/2⌋` do próximo round.
- `isSlotB = idx % 2 !== 0` — partidas de índice ímpar alimentam o lado B da partida seguinte; partidas de índice par alimentam o lado A.

Os nomes das rodadas finais são normalizados:
- Última rodada → `"Final"`
- Penúltima → `"Semi-Final"`
- Demais → `"Round N"`

---

## 5. Garantias Matemáticas

A Bit-Reversal Permutation aplicada sobre um array ordenado por equipes oferece:

| Nº de atletas na equipe | Rodada mais cedo possível de encontro |
|:-----------------------:|:-------------------------------------:|
|            2            |                 Final                 |
|            3 ou 4       |              Semi-Final               |
|            5 a 8        |             Quartas de Final          |
|            9 a 16       |             Oitavas de Final          |

**BYE vs BYE:** matematicamente impossível no Round 1, pois os BYEs são tratados como uma equipe e espalhados pela mesma função de distância máxima.

---

## 6. Exemplos Práticos

### Exemplo A — 8 atletas, 2 equipes (4 × 4)

```
Equipes: Alpha (A1..A4), Beta (B1..B4)
Chave: 8 slots, 0 BYEs, 3 rodadas
```

Round 1 após Bit-Reversal:
```
A1 × B2
A3 × B4
A2 × B1
A4 × B3
```

Resultado: todos os confrontos são inter-equipes. Alphas só se encontrariam entre si a partir das semifinais.

---

### Exemplo B — 5 atletas, 1 equipe única

```
Equipes: Única (E1..E5)
Chave: 8 slots, 3 BYEs, 3 rodadas
```

Round 1:
```
E1 × BYE   → E1 avança
E3 × E5    ← confronto interno inevitável (só 1 equipe!)
E2 × BYE   → E2 avança
E4 × BYE   → E4 avança
```

Quando há apenas uma equipe, o algoritmo **não pode evitar** confrontos internos — só garante que sejam o mais tarde possível dada a estrutura. Os BYEs ainda são distribuídos perfeitamente.

---

### Exemplo C — 21 atletas, várias equipes

- Chave: 32 slots, 11 BYEs, 5 rodadas.
- BYE_TEAM (tamanho 11) é provavelmente a maior "equipe" → recebe prioridade de distribuição.
- Resultado: todos os 11 BYEs caem em confrontos separados, e nenhum BYE vs BYE acontece.

---

## 7. Validação e Testes

- Testes unitários em `src/lib/bracket-utils.test.ts`.
- Simulador interativo em `src/app/chaveamento/page.tsx`.
- Renderização visual em `src/components/panel/CategoryBracket.tsx`.
- Testes end-to-end em `tests/bracket-simulator.spec.ts`.

Conforme documentado em `docs/algoritmo_de_chaveamento.md`, o algoritmo foi submetido a mais de 5.000 simulações aleatórias (de 3 a 128 competidores, com 1 a N equipes) e retornou **zero confrontos BYE vs BYE** em 100% dos cenários.

---

## 8. Exportação em PDF

O botão "Baixar PDF" não renderiza a visualização em árvore da tela. Em vez disso, ele intercepta o estado final do objeto `Round[]` gerado e monta um DOM oculto ("Ghost Wrapper") no formato **tabular vertical** — cabeçalho oficial + blocos de Rounds em tabelas A4, com os BYEs já posicionados. Esse é o formato requerido por federações e mesas de arbitragem.

Tokens de design do PDF em `src/lib/pdf-design-tokens.ts`.

---

## 9. Referências no Código

| Arquivo | Função / Propósito |
|---|---|
| `src/lib/bracket-utils.ts` | `generateBracketLogic`, `getBitReverseSlot`, `nextPowerOf2`, `getSeedingPattern` |
| `src/lib/bracket-utils.test.ts` | Testes unitários do algoritmo |
| `src/app/chaveamento/page.tsx` | Simulador interativo |
| `src/components/panel/CategoryBracket.tsx` | Renderização em árvore |
| `docs/algoritmo_de_chaveamento.md` | Documentação oficial do algoritmo |
| `tests/bracket-simulator.spec.ts` | Testes E2E do simulador |

---

## 10. Resumo em Uma Linha

> A chave aplica uma **permutação Bit-Reversal** sobre a lista de atletas agrupados por equipe (com BYEs tratados como "equipe" adicional), de modo que membros consecutivos no array — mesma equipe ou BYEs — sejam injetados nos slots físicos mais distantes da árvore, erradicando matematicamente confrontos precoces e pares BYE vs BYE.

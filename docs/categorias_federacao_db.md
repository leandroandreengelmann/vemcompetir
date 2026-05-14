# Categorias por Federação — Playbook de implementação (Fase B)

Este documento é o **guia executável** para tirar a tela `/admin/dashboard/eventos/[id]/categorias-federacao` da Fase A (memória) para a Fase B (banco). Cada passo é copy-paste — não há decisão pendente.

> ⚠️ Banco só é alterado com autorização explícita do usuário. Este doc descreve o **como**, não dispara nada sozinho.

**Projeto Supabase:** `fwgnwufqtujwxeaixpqh` (sistemacompetir)
**Tela alvo:** `src/app/(panel)/admin/dashboard/eventos/[id]/categorias-federacao/`
**Estado atual (Fase A):** tudo em `useState` no componente `CategoriasFederacaoEditor`. Sair daqui sem salvar = perde tudo.

---

## Ordem de execução

| # | Passo | Pra quê |
|---|---|---|
| 1 | Migration SQL | Cria 3 tabelas + índices + triggers |
| 2 | RLS policies | Multi-tenant + leitura pública para atletas |
| 3 | Gerar tipos TS | Sincroniza `database.types.ts` |
| 4 | Schemas Zod | Validação client/server |
| 5 | Server actions | Substituem o `useState` |
| 6 | Refactor da tela | `page.tsx` carrega, editor escreve |
| 7 | Smoke tests | Checklist manual antes de liberar |
| 8 | Rollout (feature flag) | Liga por evento |

Se algum passo falhar, **pare e investigue** — não pule para frente.

---

## Passo 1 — Migration SQL

**Aplicar via Supabase MCP** (`mcp__supabase__apply_migration`, name: `event_categorias_v2`).

```sql
-- ============================================================
-- 1.1 Tabela principal — uma linha por categoria do evento
-- ============================================================
create table public.event_categorias (
    id              uuid primary key default gen_random_uuid(),
    event_id        uuid not null references public.events(id) on delete cascade,

    federacao       text not null check (federacao in ('aamep','ibjjf')),
    modalidade      text not null check (modalidade in ('gi','nogi')),
    grupo           text not null check (grupo in ('adulto','juvenil','master','kids','absolutos')),
    genero          text not null check (genero in ('masculino','feminino')),

    ativa           boolean not null default true,
    is_absoluto     boolean not null default false,
    label           text not null,

    age_keys        text[] not null default '{}',
    age_labels      text[] not null default '{}',
    age_years       text[] not null default '{}',

    belt_keys       text[] not null default '{}',
    belt_labels     text[] not null default '{}',

    weight_key      text not null,
    weight_name     text not null,
    weight_range    text not null,
    peso_min        numeric(5,2) not null,
    peso_max        numeric(5,2),
    fight_time      text not null,

    valor_inscricao numeric(10,2),

    origem_template_ids text[] not null default '{}',
    ordem               int not null default 0,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index event_categorias_event_idx
    on public.event_categorias (event_id);

create index event_categorias_event_grupo_idx
    on public.event_categorias (event_id, grupo, genero, modalidade)
    where ativa = true;

create index event_categorias_event_absoluto_idx
    on public.event_categorias (event_id)
    where is_absoluto = true;

-- Evita criar duas categorias idênticas no mesmo evento
create unique index event_categorias_unique_bucket_idx
    on public.event_categorias (
        event_id, federacao, modalidade, grupo, genero, weight_key,
        md5(array_to_string(belt_keys, ',')),
        md5(array_to_string(age_keys, ','))
    );

-- ============================================================
-- 1.2 Histórico de operações em massa (UNDO durável)
-- ============================================================
create table public.event_categoria_lotes (
    id          uuid primary key default gen_random_uuid(),
    event_id    uuid not null references public.events(id) on delete cascade,
    user_id     uuid not null references public.profiles(id),

    tipo        text not null check (tipo in (
        'preco','desativar','reativar',
        'mesclar-faixa','mesclar-idade','unir-pesos',
        'duplicar-absoluto','editar-absoluto','clonar-template'
    )),
    label       text not null,
    resumo      text not null,
    snapshot    jsonb not null,

    created_at  timestamptz not null default now()
);

create index event_categoria_lotes_event_idx
    on public.event_categoria_lotes (event_id, created_at desc);

-- ============================================================
-- 1.3 Config do editor (1:1 com evento)
-- ============================================================
create table public.event_categoria_config (
    event_id          uuid primary key references public.events(id) on delete cascade,
    federacao_base    text check (federacao_base in ('aamep','ibjjf')),
    modalidades       text[] not null default '{}',
    grupos_clonados   text[] not null default '{}',
    precos_por_bucket jsonb not null default '{}'::jsonb,
    last_clone_at     timestamptz,
    updated_at        timestamptz not null default now()
);

-- ============================================================
-- 1.4 Trigger: atualiza updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger event_categorias_set_updated_at
    before update on public.event_categorias
    for each row execute function public.set_updated_at();

create trigger event_categoria_config_set_updated_at
    before update on public.event_categoria_config
    for each row execute function public.set_updated_at();

-- ============================================================
-- 1.5 Trigger: limita histórico a 12 lotes por evento (FIFO)
-- ============================================================
create or replace function public.trim_event_categoria_lotes()
returns trigger language plpgsql as $$
begin
    delete from public.event_categoria_lotes
    where event_id = new.event_id
      and id not in (
          select id from public.event_categoria_lotes
          where event_id = new.event_id
          order by created_at desc
          limit 12
      );
    return new;
end;
$$;

create trigger event_categoria_lotes_trim
    after insert on public.event_categoria_lotes
    for each row execute function public.trim_event_categoria_lotes();

-- ============================================================
-- 1.6 Feature flag por evento
-- ============================================================
alter table public.events
    add column if not exists usa_categorias_v2 boolean not null default false;
```

**Verificar:**
```sql
select count(*) from information_schema.tables
 where table_schema = 'public'
   and table_name in ('event_categorias','event_categoria_lotes','event_categoria_config');
-- esperado: 3
```

---

## Passo 2 — RLS

```sql
-- ============================================================
-- 2.1 Helper: usuário pode editar este evento?
-- ============================================================
create or replace function public.user_pode_editar_evento(p_event_id uuid, p_user_id uuid)
returns boolean language sql stable security definer as $$
    select exists (
        select 1 from public.events e
        join public.profiles p on p.id = p_user_id
        where e.id = p_event_id
          and (
              p.role = 'admin_geral'
              or (p.role = 'organizador' and p.tenant_id = e.tenant_id)
          )
    );
$$;

-- ============================================================
-- 2.2 RLS event_categorias
-- ============================================================
alter table public.event_categorias enable row level security;

create policy "leitura_publica_categorias_ativas" on public.event_categorias
    for select using (ativa = true);

create policy "organizador_le_categorias" on public.event_categorias
    for select using (public.user_pode_editar_evento(event_id, auth.uid()));

create policy "organizador_escreve_categorias" on public.event_categorias
    for all using (public.user_pode_editar_evento(event_id, auth.uid()))
            with check (public.user_pode_editar_evento(event_id, auth.uid()));

-- ============================================================
-- 2.3 RLS event_categoria_lotes
-- ============================================================
alter table public.event_categoria_lotes enable row level security;

create policy "organizador_acessa_lotes" on public.event_categoria_lotes
    for all using (public.user_pode_editar_evento(event_id, auth.uid()))
            with check (public.user_pode_editar_evento(event_id, auth.uid()));

-- ============================================================
-- 2.4 RLS event_categoria_config
-- ============================================================
alter table public.event_categoria_config enable row level security;

create policy "organizador_acessa_config" on public.event_categoria_config
    for all using (public.user_pode_editar_evento(event_id, auth.uid()))
            with check (public.user_pode_editar_evento(event_id, auth.uid()));
```

**Verificar (em outra sessão de organizador):**
```sql
-- deve retornar 0 linhas se logado como organizador de outro tenant
select count(*) from public.event_categorias
 where event_id = '<id-de-evento-de-outro-tenant>';
```

---

## Passo 3 — Gerar tipos TypeScript

```bash
# Via MCP
# Ferramenta: mcp__supabase__generate_typescript_types
# Resultado: salvar em src/lib/supabase/database.types.ts (substitui o atual)
```

Verificar que aparecem `event_categorias`, `event_categoria_lotes`, `event_categoria_config` em `Database['public']['Tables']`.

---

## Passo 4 — Schemas Zod

**Arquivo novo:** `src/lib/gestao-evento/schemas.ts` (já existe a pasta)

```ts
import { z } from 'zod';

export const FederacaoSchema = z.enum(['aamep', 'ibjjf']);
export const ModalidadeSchema = z.enum(['gi', 'nogi']);
export const GrupoSchema = z.enum(['adulto', 'juvenil', 'master', 'kids', 'absolutos']);
export const GeneroSchema = z.enum(['masculino', 'feminino']);

export const EventoCategoriaSchema = z.object({
    id: z.string().uuid().optional(),
    event_id: z.string().uuid(),
    federacao: FederacaoSchema,
    modalidade: ModalidadeSchema,
    grupo: GrupoSchema,
    genero: GeneroSchema,
    ativa: z.boolean(),
    is_absoluto: z.boolean(),
    label: z.string().min(1),
    age_keys: z.array(z.string()),
    age_labels: z.array(z.string()),
    age_years: z.array(z.string()),
    belt_keys: z.array(z.string()),
    belt_labels: z.array(z.string()),
    weight_key: z.string().min(1),
    weight_name: z.string().min(1),
    weight_range: z.string().min(1),
    peso_min: z.number().min(0),
    peso_max: z.number().min(0).nullable(),
    fight_time: z.string().min(1),
    valor_inscricao: z.number().min(0).nullable(),
    origem_template_ids: z.array(z.string()),
    ordem: z.number().int().default(0),
});

export const ClonarTemplateInput = z.object({
    event_id: z.string().uuid(),
    federacao: FederacaoSchema,
    modalidades: z.array(ModalidadeSchema).min(1),
    grupos: z.array(GrupoSchema).min(1),
});

export const SalvarCategoriaInput = z.object({
    id: z.string().uuid(),
    patch: EventoCategoriaSchema.partial(),
});

export const MesclarFaixasInput = z.object({
    event_id: z.string().uuid(),
    bucket: z.object({
        grupo: GrupoSchema,
        genero: GeneroSchema,
        modalidade: ModalidadeSchema,
    }),
    belt_keys: z.array(z.string()).min(2),
});

export const DesativarFaixasInput = z.object({
    event_id: z.string().uuid(),
    bucket: z.object({
        grupo: GrupoSchema,
        genero: GeneroSchema,
        modalidade: ModalidadeSchema,
    }),
    belt_keys: z.array(z.string()).min(1),
});

export const SalvarPrecosBucketInput = z.object({
    event_id: z.string().uuid(),
    bucket_key: z.string().min(1),    // "adulto", "adulto-abs", etc.
    valor: z.number().min(0),
});

export const DuplicarAbsolutoInput = z.object({ id: z.string().uuid() });
export const DesfazerLoteInput = z.object({ lote_id: z.string().uuid() });

export type EventoCategoriaRow = z.infer<typeof EventoCategoriaSchema>;
```

---

## Passo 5 — Server actions

**Arquivo novo:** `src/app/(panel)/admin/dashboard/eventos/[id]/categorias-federacao/actions/index.ts`

> Use o pattern existente do projeto: `'use server'` no topo, `createClient()` (server client com cookies), `revalidatePath()` no fim. Nunca `createAdminClient()` aqui — RLS precisa rodar.

### 5.1 Conversores (row ↔ EventoCategoria do client)

```ts
import type { EventoCategoria } from '../lib/template-flatten';
import type { EventoCategoriaRow } from '@/lib/gestao-evento/schemas';

export function rowToEventoCategoria(r: EventoCategoriaRow & { id: string }): EventoCategoria {
    return {
        id: r.id,
        federacao: r.federacao,
        modalidade: r.modalidade,
        grupo: r.grupo,
        ativa: r.ativa,
        label: r.label,
        genero: r.genero,
        ageKeys: r.age_keys,
        ageLabels: r.age_labels,
        ageYears: r.age_years,
        beltKeys: r.belt_keys,
        beltLabels: r.belt_labels,
        weightKey: r.weight_key,
        weightName: r.weight_name,
        range: r.weight_range,
        pesoMin: r.peso_min,
        pesoMax: r.peso_max,
        fightTime: r.fight_time,
        valorInscricao: r.valor_inscricao,
        isAbsoluto: r.is_absoluto,
        origemTemplateIds: r.origem_template_ids,
    };
}

export function eventoCategoriaToRow(c: EventoCategoria, event_id: string): Omit<EventoCategoriaRow, 'id'> {
    return {
        event_id,
        federacao: c.federacao,
        modalidade: c.modalidade,
        grupo: c.grupo,
        genero: c.genero,
        ativa: c.ativa,
        is_absoluto: c.isAbsoluto,
        label: c.label,
        age_keys: c.ageKeys,
        age_labels: c.ageLabels,
        age_years: c.ageYears,
        belt_keys: c.beltKeys,
        belt_labels: c.beltLabels,
        weight_key: c.weightKey,
        weight_name: c.weightName,
        weight_range: c.range,
        peso_min: c.pesoMin,
        peso_max: c.pesoMax,
        fight_time: c.fightTime,
        valor_inscricao: c.valorInscricao,
        origem_template_ids: c.origemTemplateIds,
        ordem: 0,
    };
}
```

### 5.2 `clonarTemplate`

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ClonarTemplateInput } from '@/lib/gestao-evento/schemas';
import { gerarCategoriasParaTemplate } from '../lib/template-flatten';
import { eventoCategoriaToRow } from './converters';

export async function clonarTemplate(input: unknown) {
    const data = ClonarTemplateInput.parse(input);
    const supabase = await createClient();

    // Geração local (sem chamar API): reaproveita o flatten que já existe na Fase A
    const categorias = gerarCategoriasParaTemplate({
        federacao: data.federacao,
        modalidades: data.modalidades,
        grupos: data.grupos,
    });

    const rows = categorias.map((c) => eventoCategoriaToRow(c, data.event_id));

    // Snapshot do estado atual (para UNDO)
    const { data: anterior } = await supabase
        .from('event_categorias')
        .select('*')
        .eq('event_id', data.event_id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    await supabase.from('event_categoria_lotes').insert({
        event_id: data.event_id,
        user_id: user.id,
        tipo: 'clonar-template',
        label: `Clonar template ${data.federacao.toUpperCase()}`,
        resumo: `${rows.length} categorias`,
        snapshot: anterior ?? [],
    });

    // Limpa categorias atuais e insere novas (single transaction via RPC seria ideal,
    // mas para o volume esperado (<5k linhas) o delete+insert sequencial atende)
    await supabase.from('event_categorias').delete().eq('event_id', data.event_id);

    // Insert em chunks de 1000 (limite do Supabase REST)
    for (let i = 0; i < rows.length; i += 1000) {
        const chunk = rows.slice(i, i + 1000);
        const { error } = await supabase.from('event_categorias').insert(chunk);
        if (error) throw new Error(`clonarTemplate chunk ${i}: ${error.message}`);
    }

    // Atualiza config
    await supabase.from('event_categoria_config').upsert({
        event_id: data.event_id,
        federacao_base: data.federacao,
        modalidades: data.modalidades,
        grupos_clonados: data.grupos,
        last_clone_at: new Date().toISOString(),
    });

    revalidatePath(`/admin/dashboard/eventos/${data.event_id}/categorias-federacao`);
    return { ok: true, total: rows.length };
}
```

### 5.3 `salvarCategoria`

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SalvarCategoriaInput } from '@/lib/gestao-evento/schemas';

export async function salvarCategoria(input: unknown) {
    const { id, patch } = SalvarCategoriaInput.parse(input);
    const supabase = await createClient();

    const { data: existing, error: errSel } = await supabase
        .from('event_categorias').select('event_id').eq('id', id).single();
    if (errSel || !existing) throw new Error('Categoria não encontrada');

    const { error } = await supabase.from('event_categorias').update(patch).eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath(`/admin/dashboard/eventos/${existing.event_id}/categorias-federacao`);
    return { ok: true };
}
```

### 5.4 `mesclarFaixas`

Cria N novas linhas mescladas e desativa as originais:

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MesclarFaixasInput } from '@/lib/gestao-evento/schemas';

export async function mesclarFaixas(input: unknown) {
    const data = MesclarFaixasInput.parse(input);
    const supabase = await createClient();

    const { data: alvos, error } = await supabase
        .from('event_categorias')
        .select('*')
        .eq('event_id', data.event_id)
        .eq('grupo', data.bucket.grupo)
        .eq('genero', data.bucket.genero)
        .eq('modalidade', data.bucket.modalidade)
        .eq('ativa', true)
        .overlaps('belt_keys', data.belt_keys);
    if (error) throw new Error(error.message);
    if (!alvos?.length) return { ok: true, criadas: 0 };

    // Snapshot
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    await supabase.from('event_categoria_lotes').insert({
        event_id: data.event_id,
        user_id: user.id,
        tipo: 'mesclar-faixa',
        label: `Mesclar faixas ${data.belt_keys.join(' + ')}`,
        resumo: `${alvos.length} linhas afetadas`,
        snapshot: alvos,
    });

    // Agrupa por (weight_key, age_keys) → cria 1 linha mesclada por agrupamento
    const grupos = new Map<string, typeof alvos>();
    for (const a of alvos) {
        const k = `${a.weight_key}|${a.age_keys.join(',')}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k)!.push(a);
    }

    const novas = Array.from(grupos.values()).map((linhas) => {
        const base = linhas[0];
        const beltLabels = linhas.flatMap((l) => l.belt_labels);
        return {
            ...base,
            id: undefined,
            belt_keys: data.belt_keys,
            belt_labels: beltLabels,
            label: base.label.replace(/• [^•]+ •/, `• ${beltLabels.join('+')} •`),
            origem_template_ids: linhas.flatMap((l) => l.origem_template_ids),
        };
    });

    await supabase.from('event_categorias')
        .update({ ativa: false })
        .in('id', alvos.map((a) => a.id));

    const { error: errIns } = await supabase.from('event_categorias').insert(novas);
    if (errIns) throw new Error(errIns.message);

    revalidatePath(`/admin/dashboard/eventos/${data.event_id}/categorias-federacao`);
    return { ok: true, criadas: novas.length };
}
```

### 5.5 `desativarFaixas`

```ts
export async function desativarFaixas(input: unknown) {
    const data = DesativarFaixasInput.parse(input);
    const supabase = await createClient();
    // snapshot + UPDATE ativa=false WHERE belt_keys && data.belt_keys (no bucket)
    // (mesmo pattern de mesclarFaixas, sem o INSERT)
}
```

### 5.6 `salvarPrecosBucket`

```ts
export async function salvarPrecosBucket(input: unknown) {
    const data = SalvarPrecosBucketInput.parse(input);
    const supabase = await createClient();

    // bucket_key formato: "<grupo>" ou "<grupo>-abs"
    const isAbs = data.bucket_key.endsWith('-abs');
    const grupo = isAbs ? data.bucket_key.replace('-abs', '') : data.bucket_key;

    await supabase.from('event_categorias')
        .update({ valor_inscricao: data.valor })
        .eq('event_id', data.event_id)
        .eq('grupo', grupo)
        .eq('is_absoluto', isAbs);

    // upsert também em precos_por_bucket no config
    revalidatePath(`/admin/dashboard/eventos/${data.event_id}/categorias-federacao`);
    return { ok: true };
}
```

### 5.7 `duplicarAbsoluto` / `editarAbsoluto`

```ts
export async function duplicarAbsoluto(input: unknown) {
    const { id } = DuplicarAbsolutoInput.parse(input);
    const supabase = await createClient();

    const { data: orig, error } = await supabase
        .from('event_categorias').select('*').eq('id', id).single();
    if (error || !orig?.is_absoluto) throw new Error('Só absolutos podem ser duplicados');

    const { id: _drop, created_at: _c, updated_at: _u, ...rest } = orig;
    const { data: nova, error: errIns } = await supabase
        .from('event_categorias')
        .insert({ ...rest, label: `${rest.label} (cópia)`, origem_template_ids: [] })
        .select().single();
    if (errIns) throw new Error(errIns.message);

    revalidatePath(`/admin/dashboard/eventos/${orig.event_id}/categorias-federacao`);
    return { ok: true, id: nova.id };
}
```

`editarAbsoluto` = `salvarCategoria` com guarda `is_absoluto = true`.

### 5.8 `desfazerLote`

```ts
export async function desfazerLote(input: unknown) {
    const { lote_id } = DesfazerLoteInput.parse(input);
    const supabase = await createClient();

    const { data: lote, error } = await supabase
        .from('event_categoria_lotes').select('*').eq('id', lote_id).single();
    if (error || !lote) throw new Error('Lote não encontrado');

    const snapshot = lote.snapshot as any[];
    await supabase.from('event_categorias').delete().eq('event_id', lote.event_id);
    if (snapshot.length) {
        const limpos = snapshot.map(({ created_at, updated_at, ...r }) => r);
        await supabase.from('event_categorias').insert(limpos);
    }
    await supabase.from('event_categoria_lotes').delete().eq('id', lote_id);

    revalidatePath(`/admin/dashboard/eventos/${lote.event_id}/categorias-federacao`);
    return { ok: true };
}
```

---

## Passo 6 — Refactor da tela

### 6.1 `page.tsx` carrega do banco

```tsx
const { data: categoriasRow } = await adminClient
    .from('event_categorias').select('*').eq('event_id', params.id).order('ordem');
const { data: config } = await adminClient
    .from('event_categoria_config').select('*').eq('event_id', params.id).single();
const { data: lotes } = await adminClient
    .from('event_categoria_lotes').select('id,tipo,label,resumo,created_at')
    .eq('event_id', params.id).order('created_at', { ascending: false });

return <CategoriasFederacaoEditor
    eventId={params.id}
    eventTitle={event.title}
    initialCategorias={(categoriasRow ?? []).map(rowToEventoCategoria)}
    initialConfig={config ?? null}
    initialLotes={lotes ?? []}
/>;
```

### 6.2 `CategoriasFederacaoEditor`

Trocar todo `setCategorias((prev) => ...)` por **optimistic update + server action**:

```ts
async function handleClonar() {
    const snapshot = categorias;
    const previstas = gerarCategoriasParaTemplate({...});
    setCategorias(previstas);                               // otimista
    try {
        await clonarTemplate({...});
    } catch (e) {
        setCategorias(snapshot);                             // rollback
        toast.error('Falha ao clonar');
    }
}
```

Padrão para cada operação: **snapshot → muta UI → chama action → rollback no catch**.

Manter o histórico in-memory para feedback imediato; sincronizar com `event_categoria_lotes` no `useEffect` ao carregar.

---

## Passo 7 — Smoke tests

Executar manualmente nesta ordem após o deploy:

- [ ] **Clonar AAMEP Adulto Gi:** ~70 linhas aparecem, todas `ativa = true`
- [ ] **Clonar IBJJF Adulto+Master Gi+NoGi:** ~600 linhas, sem timeout
- [ ] **Mesclar Cinza+Amarela em Kids:** novas linhas aparecem, originais somem (ativa=false)
- [ ] **Desfazer mescla:** estado volta exatamente ao anterior
- [ ] **Editar nome de absoluto AAMEP:** persiste após refresh
- [ ] **Duplicar absoluto:** aparece "(cópia)", animação dispara
- [ ] **Salvar preço em lote do Adulto:** todas as linhas do bucket têm `valor_inscricao`
- [ ] **Logar como organizador de OUTRO tenant:** retorna 0 categorias (RLS)
- [ ] **Atleta não logado lê `event_categorias` ativas:** consegue (policy pública)

Se qualquer item falhar, **NÃO ligar a feature flag em prod**.

---

## Passo 8 — Rollout

```sql
-- Liga apenas para um evento de teste
update public.events set usa_categorias_v2 = true where id = '<evento-teste>';
```

`page.tsx` decide qual tela renderizar:

```tsx
return event.usa_categorias_v2
    ? <CategoriasFederacaoEditor ... />        // Fase B (esta tela)
    : redirect(`/admin/dashboard/eventos/${params.id}/categorias`);  // legacy
```

Manter ambas as telas até **≥ 1 evento real** rodar inscrição completa pela nova.

---

## Apêndice — Decisões arquiteturais (referência)

| # | Decisão | Por quê | Alternativa rejeitada |
|---|---|---|---|
| 1 | Linha plana, 1 tabela principal | Cada categoria é única, UI já trabalha plana | Normalizar faixas/idades em N tabelas → 4 joins por SELECT |
| 2 | `belt_keys` / `age_keys` como `text[]` | Mesclas são sets; PG trata bem (`@>`, `&&`) | Tabela ponte → query mais lenta para o caso comum |
| 3 | `label` armazenado pronto | Evita recompor em SELECT (renderiza em listas grandes) | Computar no client → 5k linhas × concat = jank |
| 4 | `snapshot` em JSONB | Opaco, consumido só pelo UNDO; não fazemos query interna | Tabela versionada → complexidade sem ganho |
| 5 | Trigger limita 12 lotes | Mesma regra da Fase A; evita crescimento ilimitado | Cron de limpeza → mais infra, mesmo efeito |
| 6 | Feature flag `usa_categorias_v2` | Rollout seguro tenant-a-tenant sem desligar legacy | Big bang → risco de incidente |
| 7 | Server actions, não API REST | Já é o padrão do projeto; tipos TS end-to-end | Endpoints REST → boilerplate de fetch/parse |
| 8 | Optimistic UI com snapshot+rollback | Tela já trabalha assim; UX rápida | `await` antes de mutar UI → percepção de lag |
| 9 | UNIQUE index com `md5(array_to_string(...))` | Evita criar duplicatas idênticas no mesmo evento | UNIQUE em `text[]` → PG não suporta direto |

---

## Que NÃO está neste doc (decidir antes de fazer)

Estes pontos NÃO bloqueiam a implementação acima — mas devem ser respondidos antes de marcar a Fase B como "pronta para todo o catálogo":

- **Versionamento do template:** se IBJJF mudar tabela em 2027, evento clonado em 2026 mantém a tabela velha? (provável `template_version` em `event_categoria_config`)
- **Edição livre fora de absolutos:** hoje só AAMEP absolutos têm edit/duplicate. Estender para todas as categorias? Risco de divergir da tabela oficial.
- **Undo step-by-step:** lotes são por operação (granularidade da Fase A). Se quiserem desfazer 1 linha por vez, precisa audit log diferente.
- **Categorias custom do zero (não-absoluto):** schema já suporta (`origem_template_ids = '{}'`), falta UI.

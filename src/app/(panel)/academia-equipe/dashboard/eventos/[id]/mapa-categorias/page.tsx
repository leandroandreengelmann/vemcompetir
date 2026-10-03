import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { requireTenantScope } from '@/lib/auth-guards';
import { montarMapaCategorias, type CategoriaRowInput } from '@/lib/mapa-categorias';
import { MapaCategoriasClient } from './MapaCategoriasClient';

// O PostgREST devolve no máximo 1000 linhas por consulta; o evento pode ter mais que isso.
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
    fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
    const todas: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
        if (error) throw new Error('Falha ao carregar categorias do evento.');
        const pagina = data ?? [];
        todas.push(...pagina);
        if (pagina.length < PAGE_SIZE) break;
    }
    return todas;
}

export default async function MapaCategoriasPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') redirect('/login');

    const supabase = await createClient();
    const { data: event, error } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('id', params.id)
        .eq('tenant_id', tenant_id)
        .single();

    if (error || !event) notFound();

    const { data: vinculos, error: vinculosError } = await supabase
        .from('event_category_tables')
        .select('category_table_id, category_tables(name)')
        .eq('event_id', params.id);

    if (vinculosError) throw new Error('Falha ao carregar grupos do evento.');

    const nomePorTabela = new Map<string, string>();
    for (const v of vinculos ?? []) {
        const tabela = v.category_tables as unknown as { name: string } | null;
        nomePorTabela.set(v.category_table_id, tabela?.name ?? 'Sem nome');
    }
    const tabelaIds = [...nomePorTabela.keys()];

    const categorias = tabelaIds.length === 0 ? [] : await fetchAllPages((from, to) =>
        supabase
            .from('category_rows')
            .select('id, table_id, sexo, divisao_idade, faixa, categoria_completa, peso_min_kg, peso_max_kg')
            .in('table_id', tabelaIds)
            .order('id')
            .range(from, to),
    );

    const desativadas = new Set<string>();
    const overrides = await fetchAllPages((from, to) =>
        supabase
            .from('event_category_overrides')
            .select('category_id, disabled')
            .eq('event_id', params.id)
            .eq('disabled', true)
            .order('category_id')
            .range(from, to),
    );
    for (const o of overrides) desativadas.add(o.category_id);

    const linhas: CategoriaRowInput[] = categorias.map((c) => ({
        table_name: nomePorTabela.get(c.table_id) ?? 'Sem nome',
        sexo: c.sexo,
        divisao_idade: c.divisao_idade,
        faixa: c.faixa,
        categoria_completa: c.categoria_completa,
        peso_min_kg: c.peso_min_kg,
        peso_max_kg: c.peso_max_kg,
        disabled: desativadas.has(c.id),
    }));

    const grupos = montarMapaCategorias(linhas);

    return (
        <div className="space-y-6">
            <Link
                href={`/academia-equipe/dashboard/eventos/${params.id}`}
                className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
            >
                <ArrowLeftIcon size={16} weight="duotone" className="mr-2" />
                Voltar
            </Link>

            <SectionHeader
                title={`Mapa de Categorias: ${event.title}`}
                description="Estrutura das categorias do evento, como aparecem para o atleta. Somente leitura."
            />

            <MapaCategoriasClient grupos={grupos} />
        </div>
    );
}

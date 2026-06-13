'use server';

// Camada de dados PÚBLICA (sem autenticação) para a página de chaves do evento.
// Todas as leituras passam pelo service role (createAdminClient) e retornam
// apenas dados sanitizados — NUNCA CPF, telefone ou e-mail. O CPF é aceito
// apenas como termo de busca, comparado no servidor, e nunca devolvido.
// A única escrita é o incremento do contador de acessos (registrarAcesso).

import { createAdminClient } from '@/lib/supabase/admin';
import { mapChaveToResult } from '@/lib/gestao-evento/chave-mapper';
import type {
    GenerateBracketResult,
    AthleteInput,
} from '@/lib/gestao-evento/bracket-generator';
import type { BracketAthleteDetail } from '@/components/gestao-evento/GeBracket';
import {
    parseCategoria,
    getSuperDivisao,
    divisaoSortKey,
    faixaSortKey,
    SUPER_DIVISAO_ORDER,
    type SuperDivisao,
} from '@/lib/gestao-evento/parse-categoria';

const PAID_STATUSES = ['paga', 'pago', 'confirmado', 'isento'];

// Mesma normalização usada na gestão: encurta categorias de absoluto para casar
// com o category_name salvo em ge_chaves_oficiais.
function normalizeCategoryName(name: string | null | undefined): string {
    if (!name) return 'Sem categoria';
    if (name.toLowerCase().includes('absoluto')) {
        const parts = name.split(' • ');
        if (parts.length >= 4) return parts.slice(-4).join(' • ');
    }
    return name;
}

function onlyDigits(s: string): string {
    return (s || '').replace(/\D/g, '');
}

// "53,5 a 64 kg" / "até 64 kg" / "acima de 100 kg"
function formatPesoRange(min: number | null, max: number | null): string | null {
    const fmt = (n: number) => String(n).replace('.', ',');
    const hasMin = min != null && !Number.isNaN(min);
    const hasMax = max != null && !Number.isNaN(max);
    if (hasMin && hasMax) return `${fmt(min!)} a ${fmt(max!)} kg`;
    if (hasMax) return `até ${fmt(max!)} kg`;
    if (hasMin) return `acima de ${fmt(min!)} kg`;
    return null;
}

function sortByDivisao(a: { name: string }, b: { name: string }): number {
    const pa = parseCategoria(a.name);
    const pb = parseCategoria(b.name);
    const sa = SUPER_DIVISAO_ORDER.indexOf(getSuperDivisao(pa.grupo));
    const sb = SUPER_DIVISAO_ORDER.indexOf(getSuperDivisao(pb.grupo));
    if (sa !== sb) return sa - sb;
    const da = divisaoSortKey(pa.grupo, pa.idade);
    const db = divisaoSortKey(pb.grupo, pb.idade);
    if (da !== db) return da - db;
    const fa = faixaSortKey(pa.faixa);
    const fb = faixaSortKey(pb.faixa);
    if (fa !== fb) return fa - fb;
    return a.name.localeCompare(b.name);
}

// Resolve, para um event_id, o conjunto de categorias-membro de cada junção e
// o display_name correspondente (que casa com ge_chaves_oficiais.category_name).
async function carregarJuncoes(eventId: string): Promise<{
    memberToDisplay: Map<string, string>;
    displayToMembers: Map<string, string[]>;
}> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('ge_categorias_juntadas')
        .select('display_name, ge_categorias_juntadas_itens(category_name)')
        .eq('event_id', eventId);

    const memberToDisplay = new Map<string, string>();
    const displayToMembers = new Map<string, string[]>();
    for (const j of (data || []) as Array<{
        display_name: string;
        ge_categorias_juntadas_itens: { category_name: string }[];
    }>) {
        const members = (j.ge_categorias_juntadas_itens || []).map((i) => i.category_name);
        displayToMembers.set(j.display_name, members);
        for (const m of members) memberToDisplay.set(m, j.display_name);
    }
    return { memberToDisplay, displayToMembers };
}

export type EventoPublico = { id: string; title: string };

export async function getEventoPublico(eventId: string): Promise<EventoPublico | null> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('events')
        .select('id, title')
        .eq('id', eventId)
        .maybeSingle();
    if (!data) return null;
    return { id: data.id as string, title: (data.title as string) || 'Evento' };
}

export type ChavePublicaItem = {
    category_name: string;
    formato: string;
    total_atletas: number;
    total_rounds: number;
    superDivisao: SuperDivisao;
    faixa: string;
    grupo: string;
};

// Lista as categorias já sorteadas (com chave oficial), EXCLUINDO W.O.
export async function listarChavesPublicas(eventId: string): Promise<ChavePublicaItem[]> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('ge_chaves_oficiais')
        .select('category_name, formato, total_atletas, total_rounds')
        .eq('event_id', eventId)
        .neq('formato', 'wo');

    const list = (data || []).map((c: any) => {
        const parsed = parseCategoria(c.category_name);
        return {
            category_name: c.category_name as string,
            formato: c.formato as string,
            total_atletas: (c.total_atletas as number) ?? 0,
            total_rounds: (c.total_rounds as number) ?? 0,
            superDivisao: getSuperDivisao(parsed.grupo),
            faixa: parsed.faixa,
            grupo: parsed.grupo,
        };
    });

    list.sort((a, b) => sortByDivisao({ name: a.category_name }, { name: b.category_name }));
    return list;
}

export type ChavePublicaDetalhe = {
    categoryName: string;
    result: GenerateBracketResult;
    athletes: AthleteInput[];
    athleteDetails: BracketAthleteDetail[];
    pesoRangeLabel: string | null;
} | null;

// Detalhe completo da chave de UMA categoria (read-only). Recusa W.O.
export async function getChavePublica(
    eventId: string,
    categoryName: string,
): Promise<ChavePublicaDetalhe> {
    const admin = createAdminClient();

    const { data: chave } = await admin
        .from('ge_chaves_oficiais')
        .select('*')
        .eq('event_id', eventId)
        .eq('category_name', categoryName)
        .maybeSingle();

    if (!chave || (chave as any).formato === 'wo') return null;

    const { data: lutas } = await admin
        .from('ge_lutas_oficiais')
        .select('*')
        .eq('chave_id', (chave as any).id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });

    const result = mapChaveToResult(chave as any, (lutas as any) || []);

    // Detalhes dos atletas (peso/faixa/idade) resolvendo junções.
    const { displayToMembers } = await carregarJuncoes(eventId);
    const memberSet = new Set<string>(
        displayToMembers.get(categoryName) ?? [categoryName],
    );

    const { data: regs } = await admin
        .from('event_registrations')
        .select(`
            athlete_id,
            athlete:profiles!athlete_id(full_name, gym_name, weight, belt_color, birth_date),
            category:category_rows!category_id(categoria_completa, peso_min_kg, peso_max_kg)
        `)
        .eq('event_id', eventId)
        .in('status', PAID_STATUSES);

    let min: number | null = null;
    let max: number | null = null;
    const athleteDetails: BracketAthleteDetail[] = [];
    for (const r of (regs || []) as any[]) {
        const cat = r.category;
        if (!cat || !memberSet.has(normalizeCategoryName(cat.categoria_completa))) continue;
        if (cat.peso_min_kg != null) min = min == null ? cat.peso_min_kg : Math.min(min, cat.peso_min_kg);
        if (cat.peso_max_kg != null) max = max == null ? cat.peso_max_kg : Math.max(max, cat.peso_max_kg);
        athleteDetails.push({
            id: String(r.athlete_id),
            name: r.athlete?.full_name || 'Desconhecido',
            team: r.athlete?.gym_name || null,
            weight: r.athlete?.weight ?? null,
            belt: r.athlete?.belt_color ?? null,
            birth_date: r.athlete?.birth_date ?? null,
        });
    }

    const athletes: AthleteInput[] =
        ((chave as any).placed_order as AthleteInput[] | null) ||
        athleteDetails.map((d) => ({ id: d.id, name: d.name, team: d.team ?? null }));

    return {
        categoryName,
        result,
        athletes,
        athleteDetails,
        pesoRangeLabel: formatPesoRange(min, max),
    };
}

export type AtletaPublicoResultado = {
    name: string;
    team: string | null;
    categorias: string[];
};

// Busca pública por NOME ou CPF. Só retorna atletas cujas categorias têm chave
// sorteada (não-W.O.). CPF nunca é devolvido.
export async function buscarAtletaPublico(
    eventId: string,
    termo: string,
): Promise<AtletaPublicoResultado[]> {
    const raw = (termo || '').trim();
    if (raw.length < 2) return [];

    const admin = createAdminClient();

    // Categorias com chave sorteada (não-W.O.) → set para filtrar.
    const { data: chaves } = await admin
        .from('ge_chaves_oficiais')
        .select('category_name, formato')
        .eq('event_id', eventId)
        .neq('formato', 'wo');
    const sorteadas = new Set<string>(
        (chaves || []).map((c: any) => c.category_name as string),
    );
    if (sorteadas.size === 0) return [];

    const { memberToDisplay } = await carregarJuncoes(eventId);

    const termLower = raw.toLowerCase();
    const termDigits = onlyDigits(raw);
    const isCpfSearch = termDigits.length >= 3;

    const { data: regs } = await admin
        .from('event_registrations')
        .select(`
            athlete_id,
            athlete:profiles!athlete_id(full_name, gym_name, cpf),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', PAID_STATUSES);

    // athlete_id -> { name, team, categorias:Set }
    const byAthlete = new Map<string, { name: string; team: string | null; categorias: Set<string> }>();

    for (const r of (regs || []) as any[]) {
        const name: string = r.athlete?.full_name || '';
        const cpfDigits = onlyDigits(r.athlete?.cpf || '');
        const nameMatch = name.toLowerCase().includes(termLower);
        const cpfMatch = isCpfSearch && cpfDigits.length > 0 && cpfDigits.includes(termDigits);
        if (!nameMatch && !cpfMatch) continue;

        const norm = normalizeCategoryName(r.category?.categoria_completa);
        const display = memberToDisplay.get(norm) ?? norm;
        if (!sorteadas.has(display)) continue; // só categorias sorteadas (não-W.O.)

        const key = String(r.athlete_id);
        const entry = byAthlete.get(key);
        if (entry) {
            entry.categorias.add(display);
        } else {
            byAthlete.set(key, {
                name: name || 'Desconhecido',
                team: r.athlete?.gym_name || null,
                categorias: new Set([display]),
            });
        }
    }

    const out: AtletaPublicoResultado[] = Array.from(byAthlete.values())
        .map((e) => ({
            name: e.name,
            team: e.team,
            categorias: Array.from(e.categorias).sort((a, b) =>
                sortByDivisao({ name: a }, { name: b }),
            ),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 30);

    return out;
}

export async function getEstatsPublicas(eventId: string): Promise<{ total_views: number }> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('ge_public_view_stats')
        .select('total_views')
        .eq('event_id', eventId)
        .maybeSingle();
    return { total_views: (data?.total_views as number) ?? 0 };
}

// Incrementa o contador de acessos (chamado 1×/sessão pelo cliente).
export async function registrarAcesso(eventId: string): Promise<{ ok: boolean }> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('ge_public_view_stats')
        .select('total_views')
        .eq('event_id', eventId)
        .maybeSingle();

    if (!data) {
        await admin.from('ge_public_view_stats').insert({ event_id: eventId, total_views: 1 });
    } else {
        await admin
            .from('ge_public_view_stats')
            .update({ total_views: (data.total_views as number) + 1, updated_at: new Date().toISOString() })
            .eq('event_id', eventId);
    }
    return { ok: true };
}

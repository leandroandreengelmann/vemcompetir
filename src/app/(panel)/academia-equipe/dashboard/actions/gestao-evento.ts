'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import {
    generateBracket,
    type AthleteInput,
    type GenerateBracketResult,
} from '@/lib/gestao-evento/bracket-generator';

const PAID_STATUSES = ['paga', 'pago', 'confirmado', 'isento'];

function normalizeCategoryName(name: string | null | undefined): string {
    if (!name) return 'Sem categoria';
    if (name.toLowerCase().includes('absoluto')) {
        const parts = name.split(' • ');
        if (parts.length >= 4) return parts.slice(-4).join(' • ');
    }
    return name;
}

async function assertEventOwner(eventId: string) {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();
    const { data: event } = await supabase
        .from('events')
        .select('id, owner_tenant_id:tenant_id, name:title, event_date, status')
        .eq('id', eventId)
        .single();
    if (!event || event.owner_tenant_id !== tenant_id) throw new Error('Acesso negado');
    return { event, tenant_id };
}

export async function getEventoBasico(eventId: string) {
    try {
        const { event } = await assertEventOwner(eventId);
        return {
            data: {
                id: event.id as string,
                name: (event.name as string) || 'Evento',
                event_date: event.event_date as string | null,
            },
            error: null,
        };
    } catch (err: any) {
        return { data: null, error: err?.message || 'Falha ao ler evento' };
    }
}

export async function listEventosGestao() {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();
    const { data: events, error } = await supabase
        .from('events')
        .select('id, name:title, event_date, status, location_name:location')
        .eq('tenant_id', tenant_id)
        .order('event_date', { ascending: false });

    if (error) return { data: [], error };

    const adminSupabase = createAdminClient();
    const eventIds = (events || []).map((e) => e.id);
    if (eventIds.length === 0) return { data: [], error: null };

    const { data: regs } = await adminSupabase
        .from('event_registrations')
        .select('event_id, status')
        .in('event_id', eventIds)
        .in('status', PAID_STATUSES);

    const counts = new Map<string, number>();
    for (const r of regs || []) counts.set(r.event_id, (counts.get(r.event_id) || 0) + 1);

    const data = (events || []).map((e) => ({
        ...e,
        athletes_count: counts.get(e.id) || 0,
    }));

    return { data, error: null };
}

export async function listCategoriasComContagem(eventId: string) {
    const { event } = await assertEventOwner(eventId);
    const adminSupabase = createAdminClient();

    const [{ data: regs, error: regsErr }, juntadasRes, chavesRes] = await Promise.all([
        adminSupabase
            .from('event_registrations')
            .select(`status, category:category_rows!category_id(categoria_completa, peso_min_kg, peso_max_kg)`)
            .eq('event_id', eventId)
            .in('status', PAID_STATUSES),
        adminSupabase
            .from('ge_categorias_juntadas')
            .select('id, display_name, ge_categorias_juntadas_itens(category_name)')
            .eq('event_id', eventId),
        adminSupabase
            .from('ge_chaves_oficiais')
            .select('category_name, status')
            .eq('event_id', eventId),
    ]);

    if (regsErr) return { event, data: [], error: regsErr };

    type CategoryStats = {
        count: number;
        peso_min_kg: number | null;
        peso_max_kg: number | null;
    };

    const baseMap = new Map<string, CategoryStats>();
    for (const r of regs || []) {
        const cat = normalizeCategoryName((r as any).category?.categoria_completa);
        const peso_min_kg = (r as any).category?.peso_min_kg ?? null;
        const peso_max_kg = (r as any).category?.peso_max_kg ?? null;
        const existing = baseMap.get(cat);
        if (existing) {
            existing.count += 1;
        } else {
            baseMap.set(cat, { count: 1, peso_min_kg, peso_max_kg });
        }
    }

    const juntadas = (juntadasRes.data || []) as Array<{
        id: string;
        display_name: string;
        ge_categorias_juntadas_itens: { category_name: string }[];
    }>;

    const memberToJuntadaId = new Map<string, string>();
    for (const j of juntadas) {
        for (const it of j.ge_categorias_juntadas_itens || []) {
            memberToJuntadaId.set(it.category_name, j.id);
        }
    }

    const chaveByName = new Map<string, string>();
    for (const c of (chavesRes.data || []) as Array<{ category_name: string; status: string }>) {
        chaveByName.set(c.category_name, c.status);
    }

    const list: Array<{
        name: string;
        count: number;
        peso_min_kg: number | null;
        peso_max_kg: number | null;
        isMerged: boolean;
        mergedId?: string;
        mergedItems?: string[];
        chaveGerada: boolean;
        chaveStatus: string | null;
    }> = [];

    for (const [name, v] of baseMap.entries()) {
        if (memberToJuntadaId.has(name)) continue;
        const chaveStatus = chaveByName.get(name) ?? null;
        list.push({
            name,
            count: v.count,
            peso_min_kg: v.peso_min_kg,
            peso_max_kg: v.peso_max_kg,
            isMerged: false,
            chaveGerada: chaveStatus !== null,
            chaveStatus,
        });
    }

    for (const j of juntadas) {
        const items = (j.ge_categorias_juntadas_itens || []).map((i) => i.category_name);
        let count = 0;
        let minKg: number | null = null;
        let maxKg: number | null = null;
        for (const memberName of items) {
            const s = baseMap.get(memberName);
            if (!s) continue;
            count += s.count;
            if (s.peso_min_kg != null) minKg = minKg == null ? s.peso_min_kg : Math.min(minKg, s.peso_min_kg);
            if (s.peso_max_kg != null) maxKg = maxKg == null ? s.peso_max_kg : Math.max(maxKg, s.peso_max_kg);
        }
        const chaveStatus = chaveByName.get(j.display_name) ?? null;
        list.push({
            name: j.display_name,
            count,
            peso_min_kg: minKg,
            peso_max_kg: maxKg,
            isMerged: true,
            mergedId: j.id,
            mergedItems: items,
            chaveGerada: chaveStatus !== null,
            chaveStatus,
        });
    }

    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { event, data: list, error: null };
}

export async function getAtletasInscritos(eventId: string, categoryName: string) {
    await assertEventOwner(eventId);
    const adminSupabase = createAdminClient();

    const { data: juntada } = await adminSupabase
        .from('ge_categorias_juntadas')
        .select('id, ge_categorias_juntadas_itens(category_name)')
        .eq('event_id', eventId)
        .eq('display_name', categoryName)
        .maybeSingle();

    const memberSet = new Set<string>();
    if (juntada) {
        for (const it of ((juntada as any).ge_categorias_juntadas_itens || []) as { category_name: string }[]) {
            memberSet.add(it.category_name);
        }
    } else {
        memberSet.add(categoryName);
    }

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            id,
            athlete_id,
            athlete:profiles!athlete_id(full_name, gym_name),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', PAID_STATUSES);

    if (error) return { data: [], error };

    const athletes: AthleteInput[] = (data || [])
        .filter((r: any) => memberSet.has(normalizeCategoryName(r.category?.categoria_completa)))
        .map((r: any) => ({
            id: String(r.athlete_id ?? r.id),
            name: r.athlete?.full_name || 'Desconhecido',
            team: r.athlete?.gym_name || null,
        }));

    return { data: athletes, error: null };
}

export async function getPreviewChave(
    eventId: string,
    categoryName: string,
    seed?: string,
    separationGroups?: string[][],
) {
    const { data: athletes, error } = await getAtletasInscritos(eventId, categoryName);
    if (error) return { result: null, athletes: [], error };

    let groups = separationGroups;
    if (!groups) {
        const loaded = await listarGruposSeparacao(eventId, categoryName);
        groups = loaded.data.map((g) => g.atleta_ids);
    }

    const result = generateBracket(athletes, {
        seed: seed || 'preview',
        separationGroups: groups,
    });
    return { result, athletes, error: null };
}

export async function listEventosWithStats() {
    return listEventosGestao();
}

// ─────────────────────────────────────────────────────────────────────
// CHAVE OFICIAL (persistida em ge_chaves_oficiais / ge_lutas_oficiais)
// ─────────────────────────────────────────────────────────────────────

export async function getChaveOficial(eventId: string, categoryName: string) {
    const { tenant_id } = await assertEventOwner(eventId);
    const adminSupabase = createAdminClient();

    const { data: chave } = await adminSupabase
        .from('ge_chaves_oficiais')
        .select('*')
        .eq('event_id', eventId)
        .eq('category_name', categoryName)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

    if (!chave) return { chave: null, lutas: [], error: null };

    const { data: lutas, error } = await adminSupabase
        .from('ge_lutas_oficiais')
        .select('*')
        .eq('chave_id', chave.id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });

    return { chave, lutas: lutas || [], error };
}

export async function gerarChaveDefinitiva(
    eventId: string,
    categoryName: string,
    seed?: string,
): Promise<{ ok: boolean; error?: string; chave?: any }> {
    try {
        const { user, tenant_id } = await requireTenantScope();
        await assertEventOwner(eventId);

        const existing = await getChaveOficial(eventId, categoryName);
        if (existing.chave) {
            return { ok: false, error: 'Chave definitiva já existe para esta categoria.' };
        }

        const { data: athletes, error: athErr } = await getAtletasInscritos(eventId, categoryName);
        if (athErr) return { ok: false, error: 'Falha ao ler atletas inscritos.' };
        if (!athletes || athletes.length === 0) {
            return { ok: false, error: 'Sem atletas confirmados nesta categoria.' };
        }

        const groupsLoaded = await listarGruposSeparacao(eventId, categoryName);
        const result = generateBracket(athletes, {
            seed: seed || `definitiva-${Date.now()}`,
            separationGroups: groupsLoaded.data.map((g) => g.atleta_ids),
        });
        const adminSupabase = createAdminClient();

        const { data: chave, error: chaveErr } = await adminSupabase
            .from('ge_chaves_oficiais')
            .insert({
                tenant_id,
                event_id: eventId,
                category_name: categoryName,
                formato: result.format,
                status: 'finalizada',
                seed: result.seed,
                bracket_size: result.main_bracket_size,
                total_rounds: result.total_rounds,
                total_atletas: athletes.length,
                placed_order: result.placed_order,
                finalizada_em: new Date().toISOString(),
                created_by: user.id,
            })
            .select('*')
            .single();

        if (chaveErr || !chave) {
            return { ok: false, error: `Falha ao criar chave: ${chaveErr?.message || 'erro desconhecido'}` };
        }

        if (result.matches.length > 0) {
            const rows = result.matches.map((m) => ({
                chave_id: chave.id,
                round: m.round,
                position: m.position,
                athlete_a_id: m.athlete_a_id,
                athlete_b_id: m.athlete_b_id,
                athlete_a_name: m.athlete_a_name,
                athlete_b_name: m.athlete_b_name,
                team_a: m.team_a,
                team_b: m.team_b,
                winner_id: m.winner_id,
                is_bye: m.is_bye,
                status: m.is_bye && m.winner_id ? 'concluida' : 'pendente',
            }));
            const { error: lutasErr } = await adminSupabase.from('ge_lutas_oficiais').insert(rows);
            if (lutasErr) {
                await adminSupabase.from('ge_chaves_oficiais').delete().eq('id', chave.id);
                return { ok: false, error: `Falha ao gravar lutas: ${lutasErr.message}` };
            }
        }

        return { ok: true, chave };
    } catch (err: any) {
        console.error('[gerarChaveDefinitiva]', err);
        return { ok: false, error: err?.message || 'Erro inesperado ao gerar chave definitiva.' };
    }
}

export async function registrarVencedor(
    lutaId: string,
    winnerId: string | null,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const { tenant_id } = await requireTenantScope();
        const adminSupabase = createAdminClient();

        const { data: luta } = await adminSupabase
            .from('ge_lutas_oficiais')
            .select('id, chave_id, round, position, athlete_a_id, athlete_b_id, athlete_a_name, athlete_b_name, team_a, team_b')
            .eq('id', lutaId)
            .single();

        if (!luta) return { ok: false, error: 'Luta não encontrada.' };

        const { data: chave } = await adminSupabase
            .from('ge_chaves_oficiais')
            .select('tenant_id, total_rounds')
            .eq('id', luta.chave_id)
            .single();

        if (!chave || chave.tenant_id !== tenant_id) return { ok: false, error: 'Acesso negado.' };

        await adminSupabase
            .from('ge_lutas_oficiais')
            .update({
                winner_id: winnerId,
                status: winnerId ? 'concluida' : 'pendente',
            })
            .eq('id', lutaId);

        if (!winnerId) return { ok: true };

        if (luta.round < chave.total_rounds && luta.position !== 99) {
            const nextRound = luta.round + 1;
            const nextPosition = Math.floor(luta.position / 2);
            const slot = luta.position % 2 === 0 ? 'a' : 'b';

            const winnerName = winnerId === luta.athlete_a_id ? luta.athlete_a_name : luta.athlete_b_name;
            const winnerTeam = winnerId === luta.athlete_a_id ? luta.team_a : luta.team_b;

            const update: Record<string, any> = {};
            update[`athlete_${slot}_id`] = winnerId;
            update[`athlete_${slot}_name`] = winnerName;
            update[`team_${slot}`] = winnerTeam;

            await adminSupabase
                .from('ge_lutas_oficiais')
                .update(update)
                .eq('chave_id', luta.chave_id)
                .eq('round', nextRound)
                .eq('position', nextPosition);
        }

        return { ok: true };
    } catch (err: any) {
        console.error('[registrarVencedor]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

export async function reverterChaveDefinitiva(
    eventId: string,
    categoryName: string,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const { tenant_id } = await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from('ge_chaves_oficiais')
            .delete()
            .eq('event_id', eventId)
            .eq('category_name', categoryName)
            .eq('tenant_id', tenant_id);

        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (err: any) {
        console.error('[reverterChaveDefinitiva]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

export async function finalizarChaveOficial(
    eventId: string,
    categoryName: string,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const { tenant_id } = await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        await adminSupabase
            .from('ge_chaves_oficiais')
            .update({ status: 'finalizada', finalizada_em: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('category_name', categoryName)
            .eq('tenant_id', tenant_id);

        return { ok: true };
    } catch (err: any) {
        console.error('[finalizarChaveOficial]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

// ─────────────────────────────────────────────────────────────────────
// GRUPOS DE SEPARAÇÃO MANUAL
// Atletas no mesmo grupo são distribuídos em metades opostas da chave.
// ─────────────────────────────────────────────────────────────────────

export type GrupoSeparacao = {
    id: string;
    atleta_ids: string[];
    created_at: string;
};

export async function listarGruposSeparacao(
    eventId: string,
    categoryName: string,
): Promise<{ data: GrupoSeparacao[]; error: any }> {
    try {
        const { tenant_id } = await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { data: grupos, error } = await adminSupabase
            .from('ge_grupos_separacao')
            .select('id, created_at, ge_grupos_separacao_atletas(athlete_id)')
            .eq('event_id', eventId)
            .eq('category_name', categoryName)
            .eq('tenant_id', tenant_id)
            .order('created_at', { ascending: true });

        if (error) return { data: [], error };

        const data: GrupoSeparacao[] = (grupos || []).map((g: any) => ({
            id: g.id,
            created_at: g.created_at,
            atleta_ids: (g.ge_grupos_separacao_atletas || []).map((a: any) => a.athlete_id),
        }));

        return { data, error: null };
    } catch (err: any) {
        return { data: [], error: err?.message || 'Erro ao listar grupos.' };
    }
}

export async function criarGrupoSeparacao(
    eventId: string,
    categoryName: string,
    atletaIds: string[],
): Promise<{ ok: boolean; error?: string; grupo?: GrupoSeparacao }> {
    try {
        if (!atletaIds || atletaIds.length < 2) {
            return { ok: false, error: 'Um grupo precisa ter pelo menos 2 atletas.' };
        }
        const unique = Array.from(new Set(atletaIds));
        if (unique.length !== atletaIds.length) {
            return { ok: false, error: 'Atletas duplicados no grupo.' };
        }

        const { user, tenant_id } = await requireTenantScope();
        await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { data: existentes } = await adminSupabase
            .from('ge_grupos_separacao')
            .select('id')
            .eq('event_id', eventId)
            .eq('category_name', categoryName)
            .eq('tenant_id', tenant_id);

        if ((existentes || []).length > 0) {
            return {
                ok: false,
                error: 'Esta categoria já possui um grupo de separação. Remova-o antes de criar outro.',
            };
        }

        const { data: grupo, error: grupoErr } = await adminSupabase
            .from('ge_grupos_separacao')
            .insert({
                tenant_id,
                event_id: eventId,
                category_name: categoryName,
                created_by: user.id,
            })
            .select('id, created_at')
            .single();

        if (grupoErr || !grupo) {
            return { ok: false, error: grupoErr?.message || 'Falha ao criar grupo.' };
        }

        const rows = unique.map((athlete_id) => ({ grupo_id: grupo.id, athlete_id }));
        const { error: atletasErr } = await adminSupabase
            .from('ge_grupos_separacao_atletas')
            .insert(rows);

        if (atletasErr) {
            await adminSupabase.from('ge_grupos_separacao').delete().eq('id', grupo.id);
            return { ok: false, error: atletasErr.message };
        }

        return {
            ok: true,
            grupo: { id: grupo.id, created_at: grupo.created_at, atleta_ids: unique },
        };
    } catch (err: any) {
        console.error('[criarGrupoSeparacao]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

export async function removerGrupoSeparacao(
    eventId: string,
    grupoId: string,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const { tenant_id } = await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from('ge_grupos_separacao')
            .delete()
            .eq('id', grupoId)
            .eq('tenant_id', tenant_id);

        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (err: any) {
        console.error('[removerGrupoSeparacao]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

// ─────────────────────────────────────────────────────────────────────
// CATEGORIAS JUNTADAS (chaveamento combinado ad-hoc)
// ─────────────────────────────────────────────────────────────────────

export type CategoriaJuntada = {
    id: string;
    display_name: string;
    items: string[];
    created_at: string;
};

export async function listarCategoriasJuntadas(
    eventId: string,
): Promise<{ data: CategoriaJuntada[]; error: any }> {
    try {
        await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from('ge_categorias_juntadas')
            .select('id, display_name, created_at, ge_categorias_juntadas_itens(category_name)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (error) return { data: [], error };

        const list: CategoriaJuntada[] = (data || []).map((j: any) => ({
            id: j.id,
            display_name: j.display_name,
            created_at: j.created_at,
            items: (j.ge_categorias_juntadas_itens || []).map((i: any) => i.category_name),
        }));

        return { data: list, error: null };
    } catch (err: any) {
        return { data: [], error: err?.message || 'Erro ao listar junções.' };
    }
}

export async function criarCategoriaJuntada(
    eventId: string,
    displayName: string,
    categoryNames: string[],
): Promise<{ ok: boolean; error?: string; juntada?: CategoriaJuntada }> {
    try {
        const name = (displayName || '').trim();
        if (!name) return { ok: false, error: 'Informe um nome para a categoria juntada.' };
        if (!categoryNames || categoryNames.length < 2) {
            return { ok: false, error: 'Selecione pelo menos 2 categorias.' };
        }
        const unique = Array.from(new Set(categoryNames));
        if (unique.length !== categoryNames.length) {
            return { ok: false, error: 'Categorias duplicadas na seleção.' };
        }

        const { user, tenant_id } = await requireTenantScope();
        await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { data: existentes } = await adminSupabase
            .from('ge_categorias_juntadas_itens')
            .select('category_name')
            .eq('event_id', eventId)
            .in('category_name', unique);

        if (existentes && existentes.length > 0) {
            const used = existentes.map((e: any) => e.category_name).join(', ');
            return {
                ok: false,
                error: `Alguma(s) já estão em uma junção: ${used}. Desfaça a junção existente primeiro.`,
            };
        }

        const { data: juntada, error: juntadaErr } = await adminSupabase
            .from('ge_categorias_juntadas')
            .insert({
                tenant_id,
                event_id: eventId,
                display_name: name,
                created_by: user.id,
            })
            .select('id, created_at')
            .single();

        if (juntadaErr || !juntada) {
            if (juntadaErr?.code === '23505') {
                return { ok: false, error: 'Já existe uma junção com esse nome neste evento.' };
            }
            return { ok: false, error: juntadaErr?.message || 'Falha ao criar junção.' };
        }

        const rows = unique.map((category_name) => ({
            juntada_id: juntada.id,
            event_id: eventId,
            category_name,
        }));
        const { error: itensErr } = await adminSupabase
            .from('ge_categorias_juntadas_itens')
            .insert(rows);

        if (itensErr) {
            await adminSupabase.from('ge_categorias_juntadas').delete().eq('id', juntada.id);
            if (itensErr.code === '23505') {
                return {
                    ok: false,
                    error: 'Uma das categorias já foi incluída em outra junção. Atualize a tela e tente novamente.',
                };
            }
            return { ok: false, error: itensErr.message };
        }

        return {
            ok: true,
            juntada: {
                id: juntada.id,
                display_name: name,
                items: unique,
                created_at: juntada.created_at,
            },
        };
    } catch (err: any) {
        console.error('[criarCategoriaJuntada]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

export async function desfazerCategoriaJuntada(
    eventId: string,
    juntadaId: string,
): Promise<{ ok: boolean; error?: string; hadChave?: boolean }> {
    try {
        const { tenant_id } = await assertEventOwner(eventId);
        const adminSupabase = createAdminClient();

        const { data: juntada } = await adminSupabase
            .from('ge_categorias_juntadas')
            .select('id, display_name, tenant_id, event_id')
            .eq('id', juntadaId)
            .single();

        if (!juntada || juntada.tenant_id !== tenant_id || juntada.event_id !== eventId) {
            return { ok: false, error: 'Junção não encontrada ou acesso negado.' };
        }

        const { data: chaveExistente } = await adminSupabase
            .from('ge_chaves_oficiais')
            .select('id')
            .eq('event_id', eventId)
            .eq('category_name', juntada.display_name)
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        if (chaveExistente) {
            await adminSupabase
                .from('ge_chaves_oficiais')
                .delete()
                .eq('id', chaveExistente.id);
        }

        const { error } = await adminSupabase
            .from('ge_categorias_juntadas')
            .delete()
            .eq('id', juntadaId);

        if (error) return { ok: false, error: error.message };
        return { ok: true, hadChave: !!chaveExistente };
    } catch (err: any) {
        console.error('[desfazerCategoriaJuntada]', err);
        return { ok: false, error: err?.message || 'Erro inesperado.' };
    }
}

export type ListEventosResult = Awaited<ReturnType<typeof listEventosGestao>>;
export type ListCategoriasResult = Awaited<ReturnType<typeof listCategoriasComContagem>>;
export type PreviewChaveResult = {
    result: GenerateBracketResult | null;
    athletes: AthleteInput[];
    error: any;
};
export type ChaveOficialResult = Awaited<ReturnType<typeof getChaveOficial>>;

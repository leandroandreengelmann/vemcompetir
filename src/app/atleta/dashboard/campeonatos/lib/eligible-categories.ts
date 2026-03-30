'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { parseISO } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * [AJUSTE AQUI] Mapeamento de campos reais do banco de dados
 */
const FIELDS = {
    profile: {
        belt_color: 'belt_color',
        weight: 'weight',
        birth_date: 'birth_date',
        sexo: 'sexo',
    },
    category: {
        sexo: 'sexo',
        divisao_idade: 'divisao_idade',
        idade_min_fallback: 'idade',
        faixa: 'faixa',
        peso_min: 'peso_min_kg',
        peso_max: 'peso_max_kg',
        categoria_completa: 'categoria_completa',
    }
};

export interface AthleteProfile {
    belt_color: string | null;
    weight: number | null;
    birth_date: string | null;
    sexo: string | null;
}

export interface CategoryRow {
    id: string;
    table_id: string;
    faixa: string;
    idade: string | null;
    divisao_idade: string | null;
    peso_min_kg: number | null;
    peso_max_kg: number | null;
    sexo: string | null;
    categoria_completa: string;
    registration_fee: number;
}

export interface AgeRange {
    min?: number;
    max?: number;
    wildcard: boolean;
    parse_ok: boolean;
    source: "divisao_idade" | "categoria_completa" | "idade" | "none";
}

/**
 * Normaliza texto para comparação (remover acentos, lowercase, trim)
 */
export async function normalizeText(input: string | null): Promise<string> {
    if (!input) return "";
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, " ") // Espaços simples
        .trim();
}

/**
 * Calcula a "idade no ano" do evento.
 * Regra CBJJ/IBJJF: a categoria é definida pela idade que o atleta
 * COMPLETA no ano do evento — independente da data do aniversário.
 * Ex: atleta nascido em Out/1996 compete em Jun/2026 → tem 29 anos, mas
 * completa 30 em 2026 → categoria Master 1 (não Adulto).
 */
export async function computeAgeOnDate(birthDateStr: string | null, eventDateStr: string | null): Promise<number | null> {
    if (!birthDateStr) return null;
    try {
        const birth = parseISO(birthDateStr);
        const eventDate = eventDateStr ? parseISO(eventDateStr) : new Date();
        // Ano civil: apenas a diferença de anos, sem considerar mês/dia
        const age = eventDate.getFullYear() - birth.getFullYear();
        return isNaN(age) ? null : age;
    } catch {
        return null;
    }
}

/**
 * Parseia faixas múltiplas (ex: "Roxa e Marrom" -> ["roxa", "marrom"])
 * Protege faixas compostas (Kids) de serem quebradas (ex: "Cinza e Branca")
 */
export async function parseBelts(input: string | null): Promise<string[]> {
    const text = await normalizeText(input);
    if (!text) return [];

    // Lista de faixas compostas (BJJ Kids) que não devem ser quebradas pelo "e"
    const compositeBelts = [
        "cinza e branca",
        "cinza e preta",
        "amarela e branca",
        "amarela e preta",
        "laranja e branca",
        "laranja e preta",
        "verde e branca",
        "verde e preta",
        "branca e amarela"
    ];

    // Passo 1: Proteger faixas compostas trocando " e " por um placeholder temporário
    let protectedText = text;
    compositeBelts.forEach((belt, index) => {
        const placeholder = `__BELT_${index}__`;
        // Usamos regex global para garantir que todas as ocorrências sejam protegidas
        protectedText = protectedText.split(belt).join(placeholder);
    });

    // Passo 2: Quebrar pelos separadores comuns, incluindo o " e " que sobrou (que não faz parte de nome composto)
    // Conectores: " e ", ",", "/", "|", " - ", " a "
    let parts = protectedText
        .split(/\s+e\s+|[,/|]|\s+-\s+|\s+a\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

    // Passo 3: Restaurar as faixas protegidas
    const restoredParts = parts.map(part => {
        let restored = part;
        compositeBelts.forEach((belt, index) => {
            const placeholder = `__BELT_${index}__`;
            restored = restored.split(placeholder).join(belt);
        });
        return restored;
    });

    return [...new Set(restoredParts)];
}

/**
 * Verifica se texto contém números
 */
function hasAnyNumber(text: string): boolean {
    return /\d+/.test(text);
}

/**
 * Parser de Range de Idade Robusto (Contextualizado)
 */
export async function parseAgeRangeFromText(
    divisaoIdade: string | null,
    categoriaCompleta: string | null,
    idadeFallback: string | null
): Promise<AgeRange> {
    const sources = [
        { val: divisaoIdade, name: "divisao_idade" as const },
        { val: categoriaCompleta, name: "categoria_completa" as const },
        { val: idadeFallback, name: "idade" as const }
    ];

    // Contexto de classe
    const fullText = await normalizeText(`${divisaoIdade} ${categoriaCompleta}`);
    const isYouth = /juvenil|infantil|mirim|sub|junior|kids|pre-mirim/i.test(fullText);
    const isSenior = /adulto|master|senior/i.test(fullText);

    for (const source of sources) {
        if (!source.val) continue;

        // Limpar nomenclaturas numéricas para evitar falsos positivos (Ex: "Master 1", "Juvenil 2")
        const text = source.val.replace(/\b(master|juvenil|infantil|mirim|infanto[- ]?juvenil|pre[- ]?mirim)\s*\d+\b/gi, '').trim();
        if (!text) continue; // Se sobrou apenas string vazia apos limpar, pula pra proxima fonte

        // Tentar range (ex: 30-35, 30 a 35, 30–35 ou 0-200)
        const rangeMatch = text.match(/(\d+)\s*(?:-|–|a|ate)\s*(\d+)/i);
        if (rangeMatch) {
            const minNum = parseInt(rangeMatch[1]);
            const maxNum = parseInt(rangeMatch[2]);
            // Se o range for extremo (ex: 0 a 200), tratamos como wildcard
            const isWildcard = (minNum <= 1 && maxNum >= 100);
            return { min: minNum, max: maxNum, wildcard: isWildcard, parse_ok: true, source: source.name };
        }

        // Tentar min explícito (ex: 61+, 61 anos ou mais)
        const plusMatch = text.match(/(\d+)\s*(?:\+|anos\s+ou\s+mais)/i);
        if (plusMatch) {
            return { min: parseInt(plusMatch[1]), wildcard: false, parse_ok: true, source: source.name };
        }

        // Tentar exato ou isolado (ex: Juvenil II (17) ou 200 anos)
        const exactMatch = text.match(/(\d+)/);
        if (exactMatch) {
            const val = parseInt(exactMatch[1]);

            // Se for um valor irreal para idade isolada (ex: 200 no seu print), tratamos como wildcard
            if (val > 100) {
                return { wildcard: true, parse_ok: true, source: source.name };
            }

            // Se for contexto de jovens (Juvenil/Sub), o número isolado é o LIMITE MÁXIMO (≤ val)
            if (isYouth && !isSenior) {
                return { max: val, wildcard: false, parse_ok: true, source: source.name };
            }

            // Caso contrário (ou se for Adulto/Master), o número isolado é o PISO (min)
            return { min: val, wildcard: false, parse_ok: true, source: source.name };
        }
    }

    return { wildcard: false, parse_ok: false, source: "none" };
}

/**
 * Safety Rule 3: Master Livre (Critério Estrito)
 */
export async function isMasterLivre(divisaoIdade: string | null, pesoMin: number | null, pesoMax: number | null): Promise<boolean> {
    const text = await normalizeText(divisaoIdade);
    return text.includes("master") && !hasAnyNumber(text) && pesoMin === null && pesoMax === null;
}

/**
 * Detecta categoria Absoluto pela presença da palavra "absoluto" no nome completo.
 * Regras especiais para absoluto:
 *   - Peso: ignorado (qualquer peso participa)
 *   - Idade: mínimo 18 anos (regra fixa)
 *   - Sexo e Faixa: verificados normalmente
 */
export async function isAbsolutoCategory(categoriaCompleta: string | null): Promise<boolean> {
    const text = await normalizeText(categoriaCompleta);
    return text.includes("absoluto");
}

/**
 * Elegibilidade Determinística
 */
export async function isEligible(
    athlete: AthleteProfile,
    category: CategoryRow,
    eventDate: string | null
): Promise<{ eligible: boolean; reasons: { sex: boolean; belt: boolean; age: boolean; weight: boolean } }> {
    const reasons = { sex: false, belt: false, age: false, weight: false };

    // 1. Sexo (Obrigatório)
    const catSex = await normalizeText(category.sexo);
    const athleteSex = await normalizeText(athlete.sexo);
    if (!catSex || catSex.includes("absoluto") || catSex.includes("misto")) {
        reasons.sex = true;
    } else {
        reasons.sex = catSex === athleteSex;
    }

    // 2. Faixa (Múltiplas)
    const athleteBelt = await normalizeText(athlete.belt_color);
    const validBelts = await parseBelts(category.faixa);
    reasons.belt = validBelts.includes(athleteBelt);

    // 3. Idade (Master Livre, Absoluto ou Range)
    const masterLivre = await isMasterLivre(category.divisao_idade, category.peso_min_kg, category.peso_max_kg);
    const absoluto = await isAbsolutoCategory(category.categoria_completa);
    const athleteAge = await computeAgeOnDate(athlete.birth_date, eventDate);

    if (masterLivre) {
        reasons.age = true;
    } else if (absoluto) {
        // Absoluto: idade mínima fixa de 18 anos
        reasons.age = athleteAge !== null && athleteAge >= 18;
    } else {
        const ageRange = await parseAgeRangeFromText(category.divisao_idade, category.categoria_completa, category.idade);
        if (athleteAge === null) {
            reasons.age = false;
        } else if (ageRange.wildcard) {
            reasons.age = true;
        } else if (!ageRange.parse_ok && (hasAnyNumber(category.divisao_idade || "") || hasAnyNumber(category.categoria_completa || ""))) {
            reasons.age = false; // Falha de parser em campo com números = rejeita sugestão
        } else if (!ageRange.parse_ok) {
            reasons.age = true; // Sem números em lugar nenhum = wildcard
        } else {
            const minOk = ageRange.min === undefined || athleteAge >= ageRange.min;
            const maxOk = ageRange.max === undefined || athleteAge <= ageRange.max;
            reasons.age = minOk && maxOk;
        }
    }

    // 4. Peso
    if (masterLivre || absoluto) {
        // Absoluto = sem restrição de peso
        reasons.weight = true;
    } else {
        const isAbsolutoWeight = (category.peso_min_kg !== null && category.peso_min_kg <= 1) &&
            (category.peso_max_kg !== null && category.peso_max_kg >= 150);

        if (isAbsolutoWeight) {
            reasons.weight = true;
        } else if (category.peso_min_kg === null && category.peso_max_kg === null) {
            // Sem restrição de peso → qualquer atleta passa, mesmo sem peso cadastrado
            reasons.weight = true;
        } else if (athlete.weight === null) {
            // Categoria com faixa de peso definida, atleta sem peso → não é possível validar
            reasons.weight = false;
        } else {
            const minOk = category.peso_min_kg === null || athlete.weight >= category.peso_min_kg;
            const maxOk = category.peso_max_kg === null || athlete.weight <= category.peso_max_kg;
            reasons.weight = minOk && maxOk;
        }
    }

    return {
        eligible: reasons.sex && reasons.belt && reasons.age && reasons.weight,
        reasons
    };
}

/**
 * Busca Orquestrada
 */
export async function getEligibleCategories(eventId: string) {
    const supabase = await createClient();

    // 1. Perfil - Allow admin_geral to prevent redirects in preview mode
    const { profile } = await requireRole(['atleta', 'admin_geral']);
    if (!profile) throw new Error('Perfil não encontrado');

    // If admin, return early with empty suggestions to avoid athlete-specific logic
    if (profile.role === 'admin_geral') {
        return {
            suggestions: [],
            isIncomplete: false,
            profile: { belt_color: null, weight: null, birth_date: null, sexo: null },
            incompleteReasons: []
        };
    }

    const athlete: AthleteProfile = {
        belt_color: (profile as any).belt_color,
        weight: (profile as any).weight,
        birth_date: (profile as any).birth_date,
        sexo: (profile as any).sexo || null
    };

    const incompleteReasons: string[] = [];
    if (!athlete.sexo) incompleteReasons.push("Sexo");
    if (!athlete.belt_color) incompleteReasons.push("Faixa");
    if (!athlete.weight) incompleteReasons.push("Peso");
    if (!athlete.birth_date) incompleteReasons.push("Data de Nascimento");

    const isIncomplete = incompleteReasons.length > 0;

    // Se sexo estiver vazio, Safety Rule 1: suggestions = []
    if (!athlete.sexo) {
        return { suggestions: [], isIncomplete: true, profile: athlete, incompleteReasons };
    }

    // 2. Evento
    const { data: event } = await supabase
        .from('events')
        .select('event_date')
        .eq('id', eventId)
        .single();

    // 3. Categorias
    const { data: linkedTables } = await supabase
        .from('event_category_tables')
        .select('category_table_id, registration_fee')
        .eq('event_id', eventId);

    if (!linkedTables || linkedTables.length === 0) {
        return { suggestions: [], isIncomplete, profile: athlete, incompleteReasons };
    }

    const tableIds = linkedTables.map(lt => lt.category_table_id);
    const tablePriceMap = new Map(linkedTables.map(lt => [lt.category_table_id, lt.registration_fee]));

    // Paginação: eventos grandes podem ter 2000+ categorias (limite padrão PostgREST = 1000)
    const supabaseAdmin = createAdminClient();
    let allCategories: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error } = await supabaseAdmin
            .from('category_rows')
            .select('*')
            .in('table_id', tableIds)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !batch || batch.length === 0) {
            hasMore = false;
        } else {
            allCategories = [...allCategories, ...batch];
            hasMore = batch.length === pageSize;
            page++;
        }
    }

    // Deduplicate by id (safety net for edge cases)
    const seen = new Set<string>();
    const categories = allCategories.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
    if (categories.length === 0) return { suggestions: [], isIncomplete, profile: athlete, incompleteReasons };

    // 4. Overrides
    const { data: overrides } = await supabase
        .from('event_category_overrides')
        .select('category_id, registration_fee, description, promo_type')
        .eq('event_id', eventId);

    const overridesMap = new Map(overrides?.map(o => [o.category_id, o.registration_fee]));
    const overridesDescMap = new Map(overrides?.map(o => [o.category_id, o.description]));
    const overridesPromoMap = new Map(overrides?.map(o => [o.category_id, o.promo_type]));
    const { data: countsData } = await supabaseAdmin
        .from('event_registrations')
        .select(`
            category_id,
            athlete_id,
            athlete:profiles!athlete_id(full_name)
        `)
        .eq('event_id', eventId)
        .in('status', ['pago', 'isento', 'confirmado'])
        .order('created_at', { ascending: true }); // Valid, confirmed statuses

    const countMap = new Map<string, number>();
    const previewMap = new Map<string, string[]>();
    const myEnrolledCategoryIds = new Set<string>();

    countsData?.forEach(row => {
        const catId = row.category_id;
        const name = (row.athlete as any)?.full_name || 'Competidor';

        // Add to count and previews
        countMap.set(catId, (countMap.get(catId) || 0) + 1);

        if (!previewMap.has(catId)) {
            previewMap.set(catId, []);
        }

        const previews = previewMap.get(catId)!;
        if (previews.length < 3) {
            const shortName = name.split(' ').slice(0, 2).join(' ');
            previews.push(shortName);
        }

        // Check if the current logged in user is already registered in this category
        if (profile && row.athlete_id === profile.id) {
            myEnrolledCategoryIds.add(catId);
        }
    });

    // 5. Match
    const rawResults = await Promise.all(categories.map(async (cat) => {
        const match = await isEligible(athlete, cat as any, event?.event_date || null);

        // Score de especificidade
        let score = 0;
        const masterLivre = await isMasterLivre(cat.divisao_idade, cat.peso_min_kg, cat.peso_max_kg);
        if (!masterLivre) {
            const ageRange = await parseAgeRangeFromText(cat.divisao_idade, cat.categoria_completa, cat.idade);
            if (ageRange.parse_ok && !ageRange.wildcard) score += 1;
            if (cat.peso_min_kg !== null || cat.peso_max_kg !== null) score += 1;
        }

        const price = overridesMap.get(cat.id) ?? tablePriceMap.get(cat.table_id) ?? 0;
        const registeredCount = countMap.get(cat.id) || 0;
        const previewAthletes = previewMap.get(cat.id) || [];

        return {
            ...cat,
            registration_fee: price,
            description: overridesDescMap.get(cat.id) || null,
            promo_type: overridesPromoMap.get(cat.id) || null,
            registered_count: registeredCount,
            preview_athletes: previewAthletes,
            match,
            score
        };
    }));

    // Filter out categories where the user is already successfully enrolled
    const results = rawResults.filter(r => !myEnrolledCategoryIds.has(r.id));

    const suggestions = results
        .filter(r => r.match.eligible)
        .sort((a, b) => b.score - a.score || a.categoria_completa.localeCompare(b.categoria_completa));

    // 6. Combo bundle ativo para este evento
    const { data: comboBundle } = await supabaseAdmin
        .from('event_combo_bundles')
        .select('bundle_total')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .maybeSingle();

    return {
        suggestions,
        all: categories.filter(c => !myEnrolledCategoryIds.has(c.id)), // Mantendo compatibilidade com itens invisíveis
        isIncomplete,
        profile: athlete,
        incompleteReasons,
        comboBundle: comboBundle ?? null,
    };
}

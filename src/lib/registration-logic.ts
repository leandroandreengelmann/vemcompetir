import { parseISO } from 'date-fns';

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
    categoria_peso?: string;
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
 * Ex: atleta nascido em Jul/1996 compete em Mar/2026 → tem 29 anos, mas
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
 * Parseia faixas múltiplas
 */
export async function parseBelts(input: string | null): Promise<string[]> {
    const text = await normalizeText(input);
    if (!text) return [];

    // Categorias combinadas: eventos pequenos agrupam faixas kids em uma única categoria.
    const COMBINED_BELT_CATEGORIES: Record<string, string[]> = {
        "cinza amarela": ["cinza", "cinza e branca", "cinza e preta"],
        "laranja verde": ["laranja", "laranja e branca", "laranja e preta", "verde", "verde e branca", "verde e preta"],
        "cinza amarela laranja": ["cinza", "cinza e branca", "cinza e preta", "amarela", "amarela e branca", "amarela e preta", "laranja", "laranja e branca", "laranja e preta"],
    };
    if (COMBINED_BELT_CATEGORIES[text]) {
        return COMBINED_BELT_CATEGORIES[text];
    }

    const compositeBelts = [
        "cinza e branca", "cinza e preta",
        "amarela e branca", "amarela e preta",
        "laranja e branca", "laranja e preta",
        "verde e branca", "verde e preta",
        "branca e amarela"
    ];

    let protectedText = text;
    compositeBelts.forEach((belt, index) => {
        const placeholder = `__BELT_${index}__`;
        protectedText = protectedText.split(belt).join(placeholder);
    });

    let parts = protectedText
        .split(/\s+e\s+|[,/|]|\s+-\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

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

function hasAnyNumber(text: string): boolean {
    return /\d+/.test(text);
}

/**
 * Parser de Range de Idade Robusto
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

    const fullText = await normalizeText(`${divisaoIdade} ${categoriaCompleta}`);
    const isYouth = /juvenil|infantil|mirim|sub|junior|kids|pre-mirim/i.test(fullText);
    const isSenior = /adulto|master|senior/i.test(fullText);

    for (const source of sources) {
        if (!source.val) continue;
        const text = source.val;

        const rangeMatch = text.match(/(\d+)\s*(?:-|–|a|ate)\s*(\d+)/i);
        if (rangeMatch) {
            const minNum = parseInt(rangeMatch[1]);
            const maxNum = parseInt(rangeMatch[2]);
            const isWildcard = (minNum <= 1 && maxNum >= 100);
            return { min: minNum, max: maxNum, wildcard: isWildcard, parse_ok: true, source: source.name };
        }

        const plusMatch = text.match(/(\d+)\s*(?:\+|anos\s+ou\s+mais)/i);
        if (plusMatch) {
            return { min: parseInt(plusMatch[1]), wildcard: false, parse_ok: true, source: source.name };
        }

        const exactMatch = text.match(/(\d+)/);
        if (exactMatch) {
            const val = parseInt(exactMatch[1]);
            if (val > 100) {
                return { wildcard: true, parse_ok: true, source: source.name };
            }
            if (isYouth && !isSenior) {
                return { max: val, wildcard: false, parse_ok: true, source: source.name };
            }
            return { min: val, wildcard: false, parse_ok: true, source: source.name };
        }
    }

    return { wildcard: false, parse_ok: false, source: "none" };
}

export async function isMasterLivre(divisaoIdade: string | null, pesoMin: number | null, pesoMax: number | null): Promise<boolean> {
    const text = await normalizeText(divisaoIdade);
    return text.includes("master") && !hasAnyNumber(text) && pesoMin === null && pesoMax === null;
}

/**
 * Elegibilidade Determinística
 */
export async function checkEligibility(
    athlete: AthleteProfile,
    category: CategoryRow,
    eventDate: string | null
): Promise<{ eligible: boolean; reasons: { sex: boolean; belt: boolean; age: boolean; weight: boolean } }> {
    const reasons = { sex: false, belt: false, age: false, weight: false };

    // 1. Sexo
    const catSex = await normalizeText(category.sexo);
    const athleteSex = await normalizeText(athlete.sexo);
    if (!catSex || catSex.includes("absoluto") || catSex.includes("misto")) {
        reasons.sex = true;
    } else {
        reasons.sex = catSex === athleteSex;
    }

    // 2. Faixa
    const athleteBelt = await normalizeText(athlete.belt_color);
    const validBelts = await parseBelts(category.faixa);
    reasons.belt = validBelts.includes(athleteBelt);

    // 3. Idade
    const masterLivre = await isMasterLivre(category.divisao_idade, category.peso_min_kg, category.peso_max_kg);
    const athleteAge = await computeAgeOnDate(athlete.birth_date, eventDate);

    if (masterLivre) {
        reasons.age = true;
    } else {
        const ageRange = await parseAgeRangeFromText(category.divisao_idade, category.categoria_completa, category.idade);
        if (athleteAge === null) {
            reasons.age = false;
        } else if (ageRange.wildcard) {
            reasons.age = true;
        } else if (!ageRange.parse_ok && (hasAnyNumber(category.divisao_idade || "") || hasAnyNumber(category.categoria_completa || ""))) {
            reasons.age = false;
        } else if (!ageRange.parse_ok) {
            reasons.age = true;
        } else {
            const minOk = ageRange.min === undefined || athleteAge >= ageRange.min;
            const maxOk = ageRange.max === undefined || athleteAge <= ageRange.max;
            reasons.age = minOk && maxOk;
        }
    }

    // 4. Peso
    if (masterLivre) {
        reasons.weight = true;
    } else {
        const isAbsolutoWeight = (category.peso_min_kg !== null && category.peso_min_kg <= 1) &&
            (category.peso_max_kg !== null && category.peso_max_kg >= 150);

        if (isAbsolutoWeight) {
            reasons.weight = true;
        } else if (athlete.weight === null) {
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

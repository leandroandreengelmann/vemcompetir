/**
 * Utilitários para formatação de categorias e ranges de peso.
 */

interface CategoryLike {
    categoria_completa?: string | null;
    faixa?: string | null;
    divisao?: string | null;
    peso?: string | null;
    categoria_peso?: string | null;
    peso_min_kg?: number | null;
    peso_max_kg?: number | null;
}

/**
 * Formata o range de peso de forma amigável.
 * Ex: 70kg a 76kg, Até 80kg, Acima de 100kg ou Peso Livre.
 */
export function formatWeightRange(cat: CategoryLike) {
    const min = cat.peso_min_kg;
    const max = cat.peso_max_kg;

    if (min !== null && min !== undefined && max !== null && max !== undefined) {
        if (min <= 1 && max >= 150) return 'Peso Livre';
        return `${min}kg a ${max}kg`;
    }
    if (max !== null && max !== undefined) {
        return `Até ${max}kg`;
    }
    if (min !== null && min !== undefined) {
        return `Acima de ${min}kg`;
    }
    return 'Peso a definir';
}

/**
 * Formata o título da categoria de forma limpa e fluida.
 * Remove pontos, termo "Kimono" e redundâncias.
 * Trata categorias "Absoluto" separadamente.
 */
export function formatCategoryTitle(cat: CategoryLike) {
    const title = cat?.categoria_completa || '';
    const pesoInfo = cat?.peso || '';
    const isAbsolute = pesoInfo.toLowerCase().includes('absoluto') || title.toLowerCase().includes('absoluto');

    if (isAbsolute) {
        // Formata a faixa: "AZUL E ROXA" -> "Azul e Roxa"
        let faixaStr = cat?.faixa || '';

        // Se a faixa não veio como campo separado, tenta pegar da categoria_completa (fallback)
        if (!faixaStr && title.includes('•')) {
            const parts = title.split('•').map(p => p.trim());
            // No banco as faixas costumam ser a 3ª ou 4ª parte: "Juvenil • Masculino • Azul • Médio"
            // Para Absoluto: "Adulto • Masculino • Azul • Absoluto"
            if (parts.length >= 3) {
                faixaStr = parts[2];
            }
        }

        const cleanFaixa = faixaStr.toLowerCase()
            .split(' ')
            .map(w => w === 'e' ? 'e' : w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        // Extrai o gênero
        let gender = '';
        const divisao = cat?.divisao || '';
        if (divisao.toLowerCase().includes('masculino') || title.toLowerCase().includes('masculino')) gender = 'Masculino';
        else if (divisao.toLowerCase().includes('feminino') || title.toLowerCase().includes('feminino')) gender = 'Feminino';

        return `Absoluto ${cleanFaixa}${gender ? ` ${gender}` : ''}`.trim();
    }

    // Para categorias regulares: Remover pontos, "Kimono" e o nome do peso
    const pesoName = cat.categoria_peso || cat.peso?.split(':')[0]?.trim() || '';

    let cleanTitle = title
        .replace(/•/g, ' ')
        .replace(/Kimono/gi, '')
        .replace(new RegExp(`\\b${pesoName}\\b`, 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim();

    return cleanTitle;
}

/**
 * Retorna o título formatado completo, incluindo o range de peso se não for absoluto.
 */
export function formatFullCategoryName(cat: CategoryLike) {
    const rawTitle = formatCategoryTitle(cat);
    const isAbsolute = (cat?.peso || '').toLowerCase().includes('absoluto') || (cat?.categoria_completa || '').toLowerCase().includes('absoluto');

    if (isAbsolute) return rawTitle;

    const weightRange = formatWeightRange(cat);
    return `${rawTitle} ${weightRange}`;
}

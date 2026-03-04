
// Mapeamento de Cores de Faixa (baseado em coresdefaixa.md)
export const BELT_COLORS = {
    branca: '#FDFDFD',
    cinza: '#61656C',
    amarela: '#FDB022',
    laranja: '#E62E05',
    azul: '#00359E',
    roxa: '#491C96',
    marrom: '#542C0D',
    verde: '#067647',
    preta: '#0A0D12',
    coral: '#FF4D4D', // Adicionado para compatibilidade com opções do select
    vermelha: '#FF0000', // Adicionado para compatibilidade com opções do select
} as const;

export type BeltColor = keyof typeof BELT_COLORS;

// Função para converter HEX para HSL (string formatada para CSS variable do Tailwind)
export function hexToHsl(hex: string): string {
    // Remove o hash se existir
    hex = hex.replace(/^#/, '');

    // Converte para RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Normaliza RGB
    r /= 255;
    g /= 255;
    b /= 255;

    // Encontra min e max
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    // Converte para graus e porcentagens
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    // Retorna no formato "deg s% l%" sem vírgulas, conforme padrão Shadcn/Tailwind v4 alpha
    return `${h} ${s}% ${l}%`;
}

// Função para obter a cor da faixa normalizada (para UI Principal)
export function getBeltColor(belt: string | undefined | null): string {
    if (!belt) return BELT_COLORS.branca;

    let normalizedBelt = belt.toLowerCase().trim();

    // Check for dual colors to extract the primary base color for UI
    const splitters = [' e ', ' / ', '-', '/'];
    for (const s of splitters) {
        if (normalizedBelt.includes(s)) {
            normalizedBelt = normalizedBelt.split(s)[0].trim();
            break;
        }
    }

    const key = normalizedBelt as BeltColor;
    return BELT_COLORS[key] || BELT_COLORS.branca;
}

/**
 * Retorna o objeto de estilo CSS para um Badge de faixa,
 * suportando cores sólidas ou degradês para faixas de duas cores.
 */
export function getBeltStyle(beltName: string) {
    if (!beltName) return {};

    const lowerName = beltName.toLowerCase().trim();

    // Check for dual colors (e.g. "Laranja e Branca", "Cinza / Branca")
    const splitters = [' e ', ' / ', '-', '/'];
    let parts: string[] = [];

    for (const s of splitters) {
        if (lowerName.includes(s)) {
            parts = lowerName.split(s).map(p => p.trim());
            break;
        }
    }

    if (parts.length === 2) {
        const c1 = BELT_COLORS[parts[0] as keyof typeof BELT_COLORS];
        const c2 = BELT_COLORS[parts[1] as keyof typeof BELT_COLORS];

        if (c1 && c2) {
            const lights = ['branca', 'amarela', 'white', 'yellow'];
            const isC1Light = lights.includes(parts[0]);
            const isC2Light = lights.includes(parts[1]);

            // If both are light, use dark text. Otherwise white text with shadow for contrast on both.
            const useDarkText = isC1Light && isC2Light;

            return {
                background: `linear-gradient(to right, ${c1}, ${c2})`,
                color: useDarkText ? '#0f172a' : '#ffffff',
                textShadow: useDarkText ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,0,0,0.1)'
            };
        }
    }

    const key = lowerName as keyof typeof BELT_COLORS;
    const color = BELT_COLORS[key];

    if (!color) return {};

    const isLight = (['branca', 'amarela'] as string[]).includes(key);

    return {
        backgroundColor: color,
        color: isLight ? '#0f172a' : '#ffffff',
        border: key === 'branca' ? '1px solid #cbd5e1' : '1px solid transparent'
    };
}

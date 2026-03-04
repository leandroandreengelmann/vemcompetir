'use client';

import { useEffect } from 'react';
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';

interface BeltThemeProviderProps {
    beltColor: string;
    children: React.ReactNode;
}

export function BeltThemeProvider({ beltColor, children }: BeltThemeProviderProps) {
    useEffect(() => {
        const normalizedBelt = beltColor.toLowerCase().trim();

        // Regra de Negócio:
        // Faixa Branca e Faixa Preta mantêm o tema PADRÃO do sistema (Preto/Branco).
        // Outras faixas (Azul, Roxa, Marrom, etc.) aplicam a cor da faixa como primária.
        if (normalizedBelt === 'branca' || normalizedBelt === 'preta') {
            // Remove qualquer estilo injetado anteriormente se mudar para uma dessas faixas
            const tag = document.getElementById('belt-theme-styles');
            if (tag) tag.remove();
            return;
        }

        // Pega o código HEX da faixa
        const hexColor = getBeltColor(beltColor);
        // Converte para HSL
        const hslColor = hexToHsl(hexColor);

        // Injeta as variáveis CSS no elemento raiz ou em um escopo específico
        const styleId = 'belt-theme-styles';
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        // Definindo as variáveis CSS para sobrescrever o tema padrão
        // Ajustamos tanto o modo light quanto dark para usarem a cor da faixa como primary
        let cssRules = `
      :root, .dark, [data-tenant="competir"], [data-tenant="competir"].dark {
        --primary: ${hslColor} !important;
        --ring: ${hslColor} !important;
        
        /* Brand colors */
        --brand-600: ${hslColor} !important;
        --brand-700: ${hslColor} !important;
        --brand-800: ${hslColor} !important;
        --brand-900: ${hslColor} !important;
        --brand-950: ${hslColor} !important;
      }
    `;

        styleTag.textContent = cssRules;

        // Cleanup ao desmontar (navegar para fora do painel do atleta)
        return () => {
            const tag = document.getElementById(styleId);
            if (tag) tag.remove();
        };
    }, [beltColor]);

    return <>{children}</>;
}

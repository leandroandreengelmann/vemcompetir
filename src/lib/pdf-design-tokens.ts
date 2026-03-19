/**
 * Shared design tokens for all PDF exports in the Competir platform.
 * Every PDF — scoring sheets and bracket exports — must use these values
 * to guarantee a consistent visual identity.
 */

export const PDF_COLORS = {
    // Brand
    brand:          '#1A2235',   // dark navy — matches --brand-800
    brandMid:       '#2D3A52',

    // Gold accent (separator line, organizer highlight)
    gold:           '#D4A017',

    // Medal fills
    medalGoldBg:      '#FEF3C7',
    medalGoldBorder:  '#D4A017',
    medalGoldText:    '#78350F',

    medalSilverBg:    '#F1F5F9',
    medalSilverBorder:'#8E9BAE',
    medalSilverText:  '#334155',

    medalBronzeBg:    '#FEF0E7',
    medalBronzeBorder:'#A0673A',
    medalBronzeText:  '#7C2D12',

    medal4thBg:       '#F3F4F6',
    medal4thBorder:   '#6B7280',
    medal4thText:     '#374151',

    // Text scale
    textDark:  '#0F1623',
    textMid:   '#4B5563',
    textFaint: '#9CA3AF',

    // Surfaces
    bgWhite: '#FFFFFF',
    bgAlt:   '#F8F9FB',
    border:  '#E4E7EC',
} as const;

export type MedalKey = 'OURO' | 'PRATA' | 'BRONZE' | '4 LUGAR';

export const MEDAL_STYLES: Record<MedalKey, { bg: string; border: string; text: string; label: string }> = {
    'OURO':    { bg: PDF_COLORS.medalGoldBg,   border: PDF_COLORS.medalGoldBorder,   text: PDF_COLORS.medalGoldText,   label: 'OURO' },
    'PRATA':   { bg: PDF_COLORS.medalSilverBg, border: PDF_COLORS.medalSilverBorder, text: PDF_COLORS.medalSilverText, label: 'PRATA' },
    'BRONZE':  { bg: PDF_COLORS.medalBronzeBg, border: PDF_COLORS.medalBronzeBorder, text: PDF_COLORS.medalBronzeText, label: 'BRONZE' },
    '4 LUGAR': { bg: PDF_COLORS.medal4thBg,    border: PDF_COLORS.medal4thBorder,    text: PDF_COLORS.medal4thText,    label: '4. LUGAR' },
};

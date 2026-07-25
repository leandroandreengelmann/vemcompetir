// Tipos e helpers dos patrocinadores/parceiros — seguro para client e server.

export interface Sponsor {
    id: string;
    name: string;
    slug: string;
    logo_path: string;
    link_url: string | null;
    description: string | null;
    whatsapp: string | null;
    sort_order: number;
    is_active: boolean;
}

/** Gera um slug seguro para URL a partir do nome (sem acento, minúsculo). */
export function slugifySponsor(name: string): string {
    return (name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/** Monta o link do WhatsApp a partir de um número livre. */
export function whatsappLink(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    // Sem código do país (10–11 dígitos) → assume Brasil (+55).
    if (digits.length <= 11) digits = `55${digits}`;
    return `https://wa.me/${digits}`;
}

export const SPONSORS_BUCKET = 'sponsor-logos';
export const SPONSORS_ENABLED_KEY = 'sponsors_enabled';
export const SPONSORS_TITLE_KEY = 'sponsors_title';
export const SPONSORS_DEFAULT_TITLE = 'Parceiros';

/** Tamanho recomendado para as logos (a caixa uniforme normaliza o resto). */
export const SPONSOR_LOGO_IDEAL = { width: 320, height: 160, maxFileMb: 2 };

/** URL pública de uma logo no bucket sponsor-logos. */
export function sponsorLogoUrl(path: string): string {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    return `${base}/storage/v1/object/public/${SPONSORS_BUCKET}/${path}`;
}

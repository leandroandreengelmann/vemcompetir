// Tipos e helpers dos banners da home — seguro para client e server.

export type HeroBannerOverlay = 'none' | 'light' | 'medium' | 'dark';

export interface HeroBanner {
    id: string;
    title: string | null;
    subtitle: string | null;
    image_path: string;
    image_path_mobile: string | null;
    link_url: string | null;
    overlay_style: HeroBannerOverlay;
    blur_image: boolean;
    sort_order: number;
    is_active: boolean;
}

export const HERO_BANNERS_BUCKET = 'hero-banners';
export const HERO_BANNERS_ENABLED_KEY = 'hero_banners_enabled';
export const HERO_BANNERS_INTERVAL_KEY = 'hero_banners_interval';

/** Intervalo de troca do carrossel, em segundos. */
export const HERO_BANNER_INTERVAL = { default: 5, min: 2, max: 30 };
export const HERO_BANNER_INTERVAL_OPTIONS = [2, 3, 5, 7, 10, 15, 20, 30];

/** Tamanho ideal recomendado para as imagens dos banners. */
export const HERO_BANNER_IDEAL = { width: 1920, height: 640, minWidth: 1280, maxFileMb: 5 };

/** Tamanho da imagem opcional para celular (quadrada). */
export const HERO_BANNER_IDEAL_MOBILE = { width: 1080, height: 1080, maxFileMb: 5 };

/** Classes do escurecimento sobre a imagem (compartilhadas entre home e preview do admin). */
export const HERO_OVERLAY_CLASSES: Record<HeroBannerOverlay, string | null> = {
    none: null,
    light: 'bg-black/20',
    medium: 'bg-black/40',
    dark: 'bg-gradient-to-t from-black/70 via-black/40 to-black/20',
};

export const HERO_OVERLAY_LABELS: Record<HeroBannerOverlay, string> = {
    none: 'Sem escurecimento',
    light: 'Leve',
    medium: 'Médio',
    dark: 'Escuro',
};

/** URL pública de uma imagem no bucket hero-banners. */
export function heroBannerImageUrl(path: string): string {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    return `${base}/storage/v1/object/public/${HERO_BANNERS_BUCKET}/${path}`;
}

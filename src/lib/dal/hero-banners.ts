import { createAdminClient } from '../supabase/admin';
import {
    HERO_BANNERS_ENABLED_KEY,
    HERO_BANNERS_INTERVAL_KEY,
    HERO_BANNER_INTERVAL,
    type HeroBanner,
} from '../hero-banners';

export interface HeroBannersHomeData {
    banners: HeroBanner[];
    /** Intervalo de troca do carrossel, em segundos. */
    intervalSeconds: number;
}

export function parseHeroInterval(raw: string | null | undefined): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return HERO_BANNER_INTERVAL.default;
    return Math.min(HERO_BANNER_INTERVAL.max, Math.max(HERO_BANNER_INTERVAL.min, Math.round(n)));
}

/**
 * Banners ativos para a home pública, respeitando o switch geral.
 * Degrada graciosamente: qualquer erro (ex.: tabela ainda não migrada)
 * ou flag desativada retorna [] e a home usa o hero estático padrão.
 */
export async function getHeroBannersForHome(): Promise<HeroBannersHomeData> {
    // Admin client: visitante anônimo não lê system_settings (RLS authenticated-only).
    const admin = createAdminClient();

    const [settingsRes, bannersRes] = await Promise.all([
        admin
            .from('system_settings')
            .select('key, value')
            .in('key', [HERO_BANNERS_ENABLED_KEY, HERO_BANNERS_INTERVAL_KEY]),
        admin
            .from('hero_banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
    ]);

    const empty: HeroBannersHomeData = { banners: [], intervalSeconds: HERO_BANNER_INTERVAL.default };

    if (settingsRes.error || bannersRes.error) {
        if (bannersRes.error && bannersRes.error.code !== '42P01') {
            console.error('Error fetching hero banners:', bannersRes.error);
        }
        return empty;
    }

    const settings = new Map(settingsRes.data?.map((s) => [s.key, s.value]));
    if (settings.get(HERO_BANNERS_ENABLED_KEY) !== 'true') return empty;

    return {
        banners: (bannersRes.data as HeroBanner[]) ?? [],
        intervalSeconds: parseHeroInterval(settings.get(HERO_BANNERS_INTERVAL_KEY)),
    };
}

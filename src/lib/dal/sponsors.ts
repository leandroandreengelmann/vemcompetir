import { createAdminClient } from '../supabase/admin';
import {
    SPONSORS_ENABLED_KEY,
    SPONSORS_TITLE_KEY,
    SPONSORS_DEFAULT_TITLE,
    type Sponsor,
} from '../sponsors';

export interface SponsorsHomeData {
    sponsors: Sponsor[];
    title: string;
}

/**
 * Patrocinadores ativos para a home pública, respeitando o switch geral.
 * Degrada graciosamente: qualquer erro (ex.: tabela ainda não migrada) ou
 * flag desativada retorna vazio e a seção simplesmente não aparece.
 */
export async function getSponsorsForHome(): Promise<SponsorsHomeData> {
    // Admin client: visitante anônimo não lê system_settings (RLS authenticated-only).
    const admin = createAdminClient();

    const empty: SponsorsHomeData = { sponsors: [], title: SPONSORS_DEFAULT_TITLE };

    const [settingsRes, sponsorsRes] = await Promise.all([
        admin
            .from('system_settings')
            .select('key, value')
            .in('key', [SPONSORS_ENABLED_KEY, SPONSORS_TITLE_KEY]),
        admin
            .from('sponsors')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
    ]);

    if (settingsRes.error || sponsorsRes.error) {
        if (sponsorsRes.error && sponsorsRes.error.code !== '42P01') {
            console.error('Error fetching sponsors:', sponsorsRes.error);
        }
        return empty;
    }

    const settings = new Map(settingsRes.data?.map((s) => [s.key, s.value]));
    if (settings.get(SPONSORS_ENABLED_KEY) !== 'true') return empty;

    return {
        sponsors: (sponsorsRes.data as Sponsor[]) ?? [],
        title: settings.get(SPONSORS_TITLE_KEY)?.trim() || SPONSORS_DEFAULT_TITLE,
    };
}

/** Busca um patrocinador ativo pelo slug (para a página pública de detalhe). */
export async function getSponsorBySlug(slug: string): Promise<Sponsor | null> {
    if (!slug) return null;
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('sponsors')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        if (error.code !== '42P01') console.error('Error fetching sponsor by slug:', error);
        return null;
    }
    return (data as Sponsor | null) ?? null;
}

/** Todos os patrocinadores (inclusive inativos) — para o painel admin. */
export async function getAllSponsors(): Promise<Sponsor[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('sponsors')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        if (error.code !== '42P01') console.error('Error fetching sponsors (admin):', error);
        return [];
    }
    return (data as Sponsor[]) ?? [];
}

import { createAdminClient } from '../supabase/admin';
import type { HomeProductCardData } from '@/components/home/HomeProductCard';

type ImgRow = { path: string; is_primary: boolean };
function pickImage(images: ImgRow[] | null | undefined): string | null {
    if (!images || images.length === 0) return null;
    return (images.find((i) => i.is_primary) ?? images[0]).path;
}

/**
 * Produtos da loja para a vitrine da home pública, respeitando o switch geral
 * da loja (`store_settings.is_enabled`). Prioriza destaques (`is_featured`);
 * se não houver nenhum, cai para todos os produtos ativos.
 * Degrada graciosamente: qualquer erro ou loja desativada retorna [] e a
 * seção simplesmente não aparece na home.
 */
export async function getStoreProductsForHome(): Promise<HomeProductCardData[]> {
    // Admin client: visitante anônimo não lê essas tabelas (RLS).
    const admin = createAdminClient();

    const { data: settings } = await admin
        .from('store_settings')
        .select('is_enabled')
        .limit(1)
        .maybeSingle();

    if (!settings?.is_enabled) return [];

    const { data: products, error } = await admin
        .from('store_products')
        .select('slug, name, price, promo_price, is_featured, sort_order, store_product_images(path, is_primary)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code !== '42P01') console.error('Error fetching store products for home:', error);
        return [];
    }

    const all: (HomeProductCardData & { is_featured: boolean })[] = (products ?? []).map((p: Record<string, unknown>) => ({
        slug: p.slug as string,
        name: p.name as string,
        price: Number(p.price),
        promo_price: p.promo_price != null ? Number(p.promo_price) : null,
        image: pickImage(p.store_product_images as ImgRow[]),
        is_featured: p.is_featured as boolean,
    }));

    const featured = all.filter((p) => p.is_featured);
    return featured.length > 0 ? featured : all;
}

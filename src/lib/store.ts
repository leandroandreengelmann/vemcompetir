// Tipos e helpers compartilhados da Loja Virtual.

export type StoreCategory = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_path: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type StoreProduct = {
    id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    promo_price: number | null;
    is_featured: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type StoreProductImage = {
    id: string;
    product_id: string;
    path: string;
    sort_order: number;
    is_primary: boolean;
    created_at: string;
};

export type StoreProductVariant = {
    id: string;
    product_id: string;
    size: string | null;
    color: string | null;
    sku: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
};

export type StoreSettings = {
    id: string;
    store_name: string | null;
    whatsapp_number: string | null;
    is_enabled: boolean;
    banner_path: string | null;
    updated_at: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** URL pública de uma imagem no bucket store-images. */
export function storeImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/store-images/${path}`;
}

/** Gera um slug amigável a partir de um texto. */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/** Formata um valor numérico como moeda BRL. */
export function formatBRL(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Preço efetivo: promocional se existir e for menor, senão o normal. */
export function effectivePrice(p: Pick<StoreProduct, 'price' | 'promo_price'>): number {
    if (p.promo_price != null && p.promo_price > 0 && p.promo_price < p.price) {
        return p.promo_price;
    }
    return p.price;
}

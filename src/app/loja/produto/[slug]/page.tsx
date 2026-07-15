import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { storeImageUrl, formatBRL, effectivePrice } from '@/lib/store';
import { BuyPanel, type BuyProduct } from './BuyPanel';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: product } = await supabase
        .from('store_products')
        .select('id, name, description, price, promo_price')
        .eq('slug', slug)
        .maybeSingle();

    if (!product) return { title: 'Produto não encontrado' };

    const { data: img } = await supabase
        .from('store_product_images')
        .select('path')
        .eq('product_id', product.id)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

    const image = storeImageUrl(img?.path);
    const price = effectivePrice({ price: Number(product.price), promo_price: product.promo_price != null ? Number(product.promo_price) : null });
    const description = product.description?.slice(0, 160) || `Disponível por ${formatBRL(price)}`;

    return {
        title: product.name,
        description,
        openGraph: {
            title: product.name,
            description,
            type: 'website',
            images: image ? [{ url: image, alt: product.name }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description,
            images: image ? [image] : [],
        },
    };
}

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: product } = await supabase
        .from('store_products')
        .select('id, slug, name, description, price, promo_price')
        .eq('slug', slug)
        .maybeSingle();

    if (!product) notFound();

    const [{ data: images }, { data: variants }] = await Promise.all([
        supabase.from('store_product_images').select('path, is_primary, sort_order').eq('product_id', product.id).order('is_primary', { ascending: false }).order('sort_order', { ascending: true }),
        supabase.from('store_product_variants').select('size, color').eq('product_id', product.id).order('sort_order', { ascending: true }),
    ]);

    const imageUrls = (images ?? []).map((i) => storeImageUrl(i.path)!).filter(Boolean);
    const sizes = Array.from(new Set((variants ?? []).map((v) => v.size).filter((s): s is string => !!s)));
    const colors = Array.from(new Set((variants ?? []).map((v) => v.color).filter((c): c is string => !!c)));

    const buyProduct: BuyProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        promo_price: product.promo_price != null ? Number(product.promo_price) : null,
        images: imageUrls,
        sizes,
        colors,
    };

    return (
        <div className="space-y-6">
            <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <CaretLeftIcon size={18} weight="bold" />
                Voltar à loja
            </Link>
            <BuyPanel product={buyProduct} />
        </div>
    );
}

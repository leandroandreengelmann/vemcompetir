import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { ProductCard, type ProductCardData } from '../_components/ProductCard';

type ImgRow = { path: string; is_primary: boolean };
function pickImage(images: ImgRow[] | null | undefined): string | null {
    if (!images || images.length === 0) return null;
    return (images.find((i) => i.is_primary) ?? images[0]).path;
}

export const dynamic = 'force-dynamic';

export default async function CategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
    const { categoria } = await params;
    const supabase = await createClient();

    const { data: category } = await supabase
        .from('store_categories')
        .select('id, name')
        .eq('slug', categoria)
        .maybeSingle();

    if (!category) notFound();

    const { data: products } = await supabase
        .from('store_products')
        .select('slug, name, price, promo_price, store_product_images(path, is_primary)')
        .eq('category_id', category.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    const rows: ProductCardData[] = (products ?? []).map((p: Record<string, unknown>) => ({
        slug: p.slug as string,
        name: p.name as string,
        price: Number(p.price),
        promo_price: p.promo_price != null ? Number(p.promo_price) : null,
        image: pickImage(p.store_product_images as ImgRow[]),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/loja" className="text-muted-foreground hover:text-foreground">
                    <CaretLeftIcon size={24} weight="bold" />
                </Link>
                <h1 className="text-2xl font-bold">{category.name}</h1>
            </div>

            {rows.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">Nenhum produto nesta categoria ainda.</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {rows.map((p) => <ProductCard key={p.slug} p={p} />)}
                </div>
            )}
        </div>
    );
}

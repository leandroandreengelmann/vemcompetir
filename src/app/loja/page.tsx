import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr';
import { storeImageUrl } from '@/lib/store';
import { ProductCard, type ProductCardData } from './_components/ProductCard';

type ImgRow = { path: string; is_primary: boolean };
function pickImage(images: ImgRow[] | null | undefined): string | null {
    if (!images || images.length === 0) return null;
    return (images.find((i) => i.is_primary) ?? images[0]).path;
}

export const dynamic = 'force-dynamic';

export default async function LojaHomePage() {
    const supabase = await createClient();

    const [{ data: categories }, { data: products }] = await Promise.all([
        supabase.from('store_categories').select('id, name, slug, image_path').order('sort_order', { ascending: true }),
        supabase
            .from('store_products')
            .select('slug, name, price, promo_price, is_featured, sort_order, store_product_images(path, is_primary)')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
    ]);

    const allProducts: (ProductCardData & { is_featured: boolean })[] = (products ?? []).map((p: Record<string, unknown>) => ({
        slug: p.slug as string,
        name: p.name as string,
        price: Number(p.price),
        promo_price: p.promo_price != null ? Number(p.promo_price) : null,
        image: pickImage(p.store_product_images as ImgRow[]),
        is_featured: p.is_featured as boolean,
    }));

    const featured = allProducts.filter((p) => p.is_featured);
    const showcase = featured.length > 0 ? featured : allProducts;

    return (
        <div className="space-y-10">
            {/* Categorias */}
            {(categories ?? []).length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-bold">Categorias</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {(categories ?? []).map((c) => {
                            const img = storeImageUrl(c.image_path as string | null);
                            return (
                                <Link
                                    key={c.id as string}
                                    href={`/loja/${c.slug}`}
                                    className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-xl border bg-muted"
                                >
                                    {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={img} alt={c.name as string} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <ImageIcon size={32} className="absolute inset-0 m-auto text-muted-foreground" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                    <span className="relative z-10 p-3 font-semibold text-white">{c.name as string}</span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Vitrine */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold">{featured.length > 0 ? 'Destaques' : 'Produtos'}</h2>
                {showcase.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground">Nenhum produto disponível ainda.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {showcase.map((p) => <ProductCard key={p.slug} p={p} />)}
                    </div>
                )}
            </section>
        </div>
    );
}

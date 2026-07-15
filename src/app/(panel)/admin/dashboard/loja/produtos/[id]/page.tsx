import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon, EyeIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProductForm } from '../ProductForm';
import { ProductImages } from '../ProductImages';
import { ProductVariants } from '../ProductVariants';
import type { StoreProduct, StoreProductImage, StoreProductVariant } from '@/lib/store';

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
    await requireRole('admin_geral');
    const { id } = await params;
    const admin = createAdminClient();

    const { data: product } = await admin.from('store_products').select('*').eq('id', id).maybeSingle();
    if (!product) notFound();

    const [{ data: categories }, { data: images }, { data: variants }] = await Promise.all([
        admin.from('store_categories').select('id, name').order('sort_order', { ascending: true }),
        admin.from('store_product_images').select('*').eq('product_id', id).order('sort_order', { ascending: true }),
        admin.from('store_product_variants').select('*').eq('product_id', id).order('created_at', { ascending: true }),
    ]);

    return (
        <div className="space-y-6">
            <SectionHeader
                title={product.name.length > 70 ? `${product.name.slice(0, 70)}…` : product.name}
                description="Edite os dados, fotos e variações do produto."
                rightElement={
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" pill className="gap-2">
                            <Link href="/admin/dashboard/loja/produtos">
                                <CaretLeftIcon size={20} weight="bold" />
                                Voltar
                            </Link>
                        </Button>
                        <Button asChild variant="outline" pill className="gap-2">
                            <Link href={`/loja/produto/${product.slug}`} target="_blank">
                                <EyeIcon size={18} weight="bold" />
                                Ver na loja
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <ProductForm categories={categories ?? []} product={product as StoreProduct} />
                    <ProductVariants productId={id} variants={(variants as StoreProductVariant[]) ?? []} />
                </div>
                <div className="lg:col-span-2">
                    <ProductImages productId={id} images={(images as StoreProductImage[]) ?? []} />
                </div>
            </div>
        </div>
    );
}

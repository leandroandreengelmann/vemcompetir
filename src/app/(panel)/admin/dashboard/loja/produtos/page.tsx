import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { CaretLeftIcon, PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProductsList } from './ProductsList';

export default async function LojaProdutosPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data: products } = await admin
        .from('store_products')
        .select('id, name, slug, price, promo_price, is_active, is_featured, category_id, store_categories(name)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    const { data: images } = await admin
        .from('store_product_images')
        .select('product_id, path')
        .eq('is_primary', true);

    const imgMap = new Map((images ?? []).map((i) => [i.product_id, i.path]));

    const rows = (products ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        price: Number(p.price),
        promo_price: p.promo_price != null ? Number(p.promo_price) : null,
        is_active: p.is_active as boolean,
        is_featured: p.is_featured as boolean,
        category_name: (p.store_categories as { name: string } | null)?.name ?? null,
        primary_image: imgMap.get(p.id as string) ?? null,
    }));

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Produtos"
                description="Cadastro de kimonos e artigos da loja."
                rightElement={
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" pill className="gap-2">
                            <Link href="/admin/dashboard/loja">
                                <CaretLeftIcon size={20} weight="bold" />
                                Voltar
                            </Link>
                        </Button>
                        <Button asChild pill className="gap-2">
                            <Link href="/admin/dashboard/loja/produtos/novo">
                                <PlusIcon size={18} weight="bold" />
                                Novo produto
                            </Link>
                        </Button>
                    </div>
                }
            />
            <ProductsList products={rows} />
        </div>
    );
}

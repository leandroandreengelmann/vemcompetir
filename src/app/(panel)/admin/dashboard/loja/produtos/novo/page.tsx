import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProductForm } from '../ProductForm';

export default async function NovoProdutoPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data: categories } = await admin
        .from('store_categories')
        .select('id, name')
        .order('sort_order', { ascending: true });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Novo Produto"
                description="Cadastre o produto. Depois adicione fotos e variações."
                rightElement={
                    <Button asChild variant="ghost" pill className="gap-2">
                        <Link href="/admin/dashboard/loja/produtos">
                            <CaretLeftIcon size={20} weight="bold" />
                            Voltar
                        </Link>
                    </Button>
                }
            />
            <div className="max-w-2xl">
                <ProductForm categories={categories ?? []} />
            </div>
        </div>
    );
}

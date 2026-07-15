import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { CategoriesManager } from './CategoriesManager';
import type { StoreCategory } from '@/lib/store';

export default async function LojaCategoriasPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data } = await admin
        .from('store_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Categorias da Loja"
                description="Organize os produtos em categorias."
                rightElement={
                    <Button asChild variant="ghost" pill className="gap-2">
                        <Link href="/admin/dashboard/loja">
                            <CaretLeftIcon size={20} weight="bold" />
                            Voltar
                        </Link>
                    </Button>
                }
            />
            <CategoriesManager categories={(data as StoreCategory[]) ?? []} />
        </div>
    );
}

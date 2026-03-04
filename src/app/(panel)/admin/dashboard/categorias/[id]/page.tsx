

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryTableDetails } from './components/category-table-details';
import { CategoryTableActions } from '../components/category-table-actions';
import { getCategoryRows, getCategoryTable } from '../../../actions/categories';

// We need data fetching. Since this is a client component (due to complex state interaction between table and form), 
// we should probably fetch data in a parent server component and pass it down, or use hooks.
// However, the prompt implies "Página B — Detalhe de uma Tabela".
// I'll make the main page server side, and a "CategoryManager" client component that holds the state "Edit Mode".

// Wait, I am writing `page.tsx`. It should be server component.
// I will fetch data here.
// But I need to pass data to a Client Component that manages the "Edit Form" state.
// So I'll creating `CategoryManager.tsx` in components and use it in `page.tsx`.

// Re-writing this file content to be `page.tsx` (Server Component) and creating `CategoryManager` separately?
// Or just make `page.tsx` a client component? Server components are better for initial data.
// I'll stick to Server Component `page.tsx` and Client Component `CategoryDetailsClient.tsx`.

export default async function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { table, rows } = await getCategoryTableDetails(id);

    if (!table) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/dashboard/categorias">
                    <Button variant="ghost" className="pl-0 gap-2 mb-2 text-ui text-muted-foreground hover:text-primary">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Categorias
                    </Button>
                </Link>
                <div className="flex items-center justify-between">
                    <SectionHeader
                        title={table.name}
                        description={table.description || "Gerencie as categorias desta tabela."}
                    />
                    <div className="flex items-center gap-2">
                        <CategoryTableActions table={table} />
                    </div>
                </div>
            </div>

            <CategoryTableDetails table={table} rows={rows} />
        </div>
    );
}

async function getCategoryTableDetails(id: string) {
    const table = await getCategoryTable(id);
    const rows = await getCategoryRows(id);

    return {
        table,
        rows
    };
}

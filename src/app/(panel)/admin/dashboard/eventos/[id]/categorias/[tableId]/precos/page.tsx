import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth-guards';
import { PricingManager } from '@/components/panel/PricingManager';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/SectionHeader";

export default async function AdminEventCategoryPricingPage(props: {
    params: Promise<{ id: string; tableId: string }>
}) {
    const params = await props.params;
    const { profile } = await requireRole('admin_geral');
    const supabase = await createClient();

    // Fetch Event Metadata
    const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', params.id)
        .single();

    if (!event) notFound();

    // Fetch Table Metadata
    const { data: table } = await supabase
        .from('category_tables')
        .select('name')
        .eq('id', params.tableId)
        .single();

    if (!table) notFound();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button pill variant="ghost" size="sm" asChild>
                    <Link href={`/admin/dashboard/eventos/${params.id}/categorias`}>
                        <CaretLeftIcon size={20} weight="duotone" className="mr-1" />
                        Voltar para Categorias
                    </Link>
                </Button>
            </div>

            <SectionHeader
                title={`Precificação: ${table.name}`}
                description={`Ajuste os valores de inscrição para o evento: ${event.title}`}
            />

            <PricingManager
                eventId={params.id}
                tableId={params.tableId}
                tableName={table.name}
            />
        </div>
    );
}

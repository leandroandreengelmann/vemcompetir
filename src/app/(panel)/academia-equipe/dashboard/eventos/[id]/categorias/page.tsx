import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EventCategoryManager } from '@/components/panel/EventCategoryManager';
import { requireTenantScope } from '@/lib/auth-guards';

export default async function AcademyEventCategoriesPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { profile, tenant_id } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') redirect('/login');

    const supabase = await createClient();
    const { data: event, error } = await supabase
        .from('events')
        .select('title, tenant_id')
        .eq('id', params.id)
        .eq('tenant_id', tenant_id)
        .single();

    if (error || !event) notFound();

    return (
        <div className="space-y-6">
            <Link
                href={`/academia-equipe/dashboard/eventos`}
                className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Link>

            <SectionHeader
                title={`Categorias do Evento: ${event.title}`}
                description="Selecione os grupos de categorias permitidos para este campeonato."
            />

            <EventCategoryManager eventId={params.id} />
        </div>
    );
}

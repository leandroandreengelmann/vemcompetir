import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EventCategoryManager } from '@/components/panel/EventCategoryManager';
import { ComboBundleManager } from '@/components/panel/ComboBundleManager';

export default async function AdminEventCategoriesPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();
    const { data: event, error } = await adminClient
        .from('events')
        .select('title, tenant_id')
        .eq('id', params.id)
        .single();

    if (error || !event) notFound();

    return (
        <div className="space-y-6">
            <Link
                href={`/admin/dashboard/eventos/${params.id}/editar`}
                className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
            >
                <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                Voltar para o evento
            </Link>

            <SectionHeader
                title={`Vincular Categorias: ${event.title}`}
                description="Associe grupos de categorias para habilitar a busca unificada neste evento."
            />

            <EventCategoryManager eventId={params.id} isSuperAdmin={true} />

            <ComboBundleManager eventId={params.id} />
        </div>
    );
}

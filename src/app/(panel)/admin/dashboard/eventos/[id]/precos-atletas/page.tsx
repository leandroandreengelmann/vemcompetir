import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { AthletePricingManager } from './AthletePricingManager';
import { getAthletePricings } from './actions';

export default async function PrecosAtletasPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') redirect('/login');

    const admin = createAdminClient();

    const { data: event } = await admin
        .from('events')
        .select('title')
        .eq('id', id)
        .single();

    if (!event) notFound();

    const pricings = await getAthletePricings(id);

    return (
        <div className="space-y-6">
            <Link
                href={`/admin/dashboard/eventos/${id}/editar`}
                className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
            >
                <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                Voltar para o evento
            </Link>

            <SectionHeader
                title={`Precos por Atleta: ${event.title}`}
                description="Configure valores diferenciados para atletas de academias ou mestres especificos. Categorias absolutas nao sao afetadas."
            />

            <AthletePricingManager
                eventId={id}
                initialPricings={pricings}
            />
        </div>
    );
}

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { TenantPricingManager } from './TenantPricingManager';
import { getTenantPricings } from './actions';

export default async function PrecosAcademiasPage({
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

    // Check if event has promo categories (to show promo price field)
    const { data: promoOverrides } = await admin
        .from('event_category_overrides')
        .select('id')
        .eq('event_id', id)
        .not('promo_type', 'is', null)
        .limit(1);

    const hasPromoCategories = (promoOverrides?.length ?? 0) > 0;

    const pricings = await getTenantPricings(id);

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
                title={`Preços por Academia: ${event.title}`}
                description="Configure valores diferenciados de inscrição para academias específicas. Quando ativo, a academia verá o preço diferenciado ao inscrever seus atletas."
            />

            <TenantPricingManager
                eventId={id}
                initialPricings={pricings}
                hasPromoCategories={hasPromoCategories}
            />
        </div>
    );
}

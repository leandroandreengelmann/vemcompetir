import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { PassportColorManager } from './PassportColorManager';

export default async function EventPassportePage({
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
        .select('id, title, passport_bg_from, passport_bg_via')
        .eq('id', id)
        .single();

    if (!event) notFound();

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-2xl space-y-10">
                <div className="space-y-6">
                    <Link
                        href={`/admin/dashboard/eventos/${id}/editar`}
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar para o evento
                    </Link>

                    <SectionHeader
                        title="Passaporte do Evento"
                        description={`Personalize a cor de fundo do passaporte de inscrição para "${event.title}".`}
                        className="text-center md:flex-col md:items-center"
                    />
                </div>

                <PassportColorManager
                    eventId={event.id}
                    eventTitle={event.title}
                    initialFrom={event.passport_bg_from ?? null}
                    initialVia={event.passport_bg_via ?? null}
                />
            </div>
        </div>
    );
}

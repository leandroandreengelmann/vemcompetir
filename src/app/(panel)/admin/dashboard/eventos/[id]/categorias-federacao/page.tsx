import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, FlaskIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { CategoriasFederacaoEditor } from './components/categorias-federacao-editor';

export default async function AdminEventCategoriasFederacaoPage(props: { params: Promise<{ id: string }> }) {
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
                Voltar
            </Link>

            <SectionHeader
                title={`Categorias por Federação: ${event.title}`}
                description="Editor novo (paralelo). Clone o template da federação, desative, mescle e edite categorias para este evento."
            />

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
                <FlaskIcon size={24} weight="duotone" className="text-amber-600 mt-0.5" />
                <div>
                    <p className="text-panel-sm font-semibold text-foreground">Tela em validação · Fase A (sem persistência)</p>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Esta é uma tela <strong>nova e isolada</strong>, ao lado da tela de "Categorias" que continua em uso. Aqui as
                        alterações ficam apenas em memória — nada é salvo no banco. Quando a UI for aprovada, será modelado o
                        banco em uma migração separada.
                    </p>
                </div>
            </div>

            <CategoriasFederacaoEditor eventId={params.id} eventTitle={event.title} />
        </div>
    );
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeftIcon, TicketIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { CreditInscreverForm } from './CreditInscreverForm';

interface Props {
    params: Promise<{ packageId: string }>;
}

export default async function CreditInscreverPage({ params }: Props) {
    const { packageId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile.tenant_id) {
        redirect('/academia-equipe/dashboard');
    }

    const adminClient = createAdminClient();

    const { data: pkg } = await adminClient
        .from('inscription_packages')
        .select(`
            id, total_credits, used_credits, excluded_divisions, notes,
            event:events!event_id (id, title, event_date),
            creator:tenants!created_by_tenant_id (name)
        `)
        .eq('id', packageId)
        .eq('assigned_to_tenant_id', profile.tenant_id)
        .single();

    if (!pkg) notFound();

    const event = Array.isArray(pkg.event) ? pkg.event[0] : pkg.event;
    const creator = Array.isArray(pkg.creator) ? pkg.creator[0] : pkg.creator;

    if (!event) notFound();

    const creditsLeft = pkg.total_credits - pkg.used_credits;
    if (creditsLeft <= 0) redirect('/academia-equipe/dashboard/creditos-inscricoes');

    const { data: athletes } = await supabase
        .from('profiles')
        .select('id, full_name, sexo, belt_color, birth_date, weight')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'atleta')
        .order('full_name');

    return (
        <div className="space-y-6 container mx-auto max-w-4xl">
            <div className="flex items-center gap-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href="/academia-equipe/dashboard/creditos-inscricoes">
                                <ArrowLeftIcon size={20} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para créditos</TooltipContent>
                </Tooltip>
                <div className="flex-1 min-w-0">
                    <SectionHeader
                        title={event.title}
                        description={`Inscrição via crédito • Cedido por ${creator?.name ?? '—'}`}
                    />
                </div>
                <Badge className="rounded-full font-bold tabular-nums bg-blue-500/10 text-blue-600 border-none shrink-0 gap-1.5 px-3 py-1.5">
                    <TicketIcon size={14} weight="duotone" />
                    {creditsLeft} / {pkg.total_credits} créditos
                </Badge>
            </div>

            <CreditInscreverForm
                pkg={{
                    id: pkg.id,
                    excluded_divisions: pkg.excluded_divisions ?? [],
                    notes: pkg.notes,
                }}
                event={{ id: event.id, title: event.title }}
                athletes={athletes ?? []}
                creditsLeft={creditsLeft}
            />
        </div>
    );
}

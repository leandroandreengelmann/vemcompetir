import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { TicketIcon } from '@phosphor-icons/react/dist/ssr';
import CreditRegistrationClient from './CreditRegistrationClient';

export default async function CreditosInscricoesPage() {
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

    const [{ data: packages }, { data: athletes }] = await Promise.all([
        adminClient
            .from('inscription_packages')
            .select(`
                id, total_credits, used_credits, excluded_divisions, notes, created_at,
                event:events!event_id (id, title, event_date),
                creator:tenants!created_by_tenant_id (name)
            `)
            .eq('assigned_to_tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false }),
        supabase
            .from('profiles')
            .select('id, full_name, belt_color, sexo, birth_date, weight')
            .eq('tenant_id', profile.tenant_id)
            .eq('role', 'atleta')
            .order('full_name'),
    ]);

    const allPackages = (packages ?? []).map((pkg: any) => ({
        ...pkg,
        event: Array.isArray(pkg.event) ? pkg.event[0] : pkg.event,
        creator: Array.isArray(pkg.creator) ? pkg.creator[0] : pkg.creator,
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-panel-lg font-black tracking-tight flex items-center gap-2">
                    <TicketIcon size={26} weight="duotone" className="text-primary" />
                    Créditos de Inscrição
                </h1>
                <p className="text-panel-sm text-muted-foreground mt-1">
                    Inscreva seus atletas usando os créditos recebidos, sem custo adicional.
                </p>
            </div>

            <CreditRegistrationClient
                packages={allPackages}
                athletes={athletes ?? []}
            />
        </div>
    );
}

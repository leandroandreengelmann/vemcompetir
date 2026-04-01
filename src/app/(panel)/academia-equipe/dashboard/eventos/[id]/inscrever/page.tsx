import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { RegistrationForm } from '../../components/registration-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSystemSettingsMap } from '@/lib/dal/system-settings';

interface SubscribePageProps {
    params: Promise<{ id: string }>;
}

export default async function SubscribePage(props: SubscribePageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');
    if (!profile.tenant_id) redirect('/academia-equipe/dashboard');

    // Fetch event details
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !event) {
        notFound();
    }

    // Fetch my athletes
    const { data: athletesRaw } = await supabase
        .from('profiles')
        .select('id, full_name, sexo, belt_color, birth_date, weight')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'atleta')
        .order('full_name', { ascending: true });

    // Fetch auth emails to determine if athlete has own account
    const adminClient = createAdminClient();
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    const athletes = (athletesRaw || []).map(a => {
        const authUser = authUsers.find(u => u.id === a.id);
        const email = authUser?.email || '';
        return {
            ...a,
            hasOwnAccount: !!email && !email.includes('@dummy.competir.com'),
        };
    });

    // Check ownership
    const isOwner = event.tenant_id === profile.tenant_id;

    // Fetch tax
    const specificTaxKey = `event_tax_${event.id}`;
    const globalTaxKey = 'own_event_registration_tax';

    const settingsMap = await getSystemSettingsMap([specificTaxKey, globalTaxKey]);

    const specificTaxVal = settingsMap.get(specificTaxKey);
    const globalTaxVal = settingsMap.get(globalTaxKey);

    let adminTax = 0;

    if (specificTaxVal) {
        adminTax = parseFloat(specificTaxVal.replace(',', '.'));
    } else if (globalTaxVal) {
        adminTax = parseFloat(globalTaxVal.replace(',', '.'));
    }

    return (
        <div className="space-y-6 container mx-auto max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href={`/academia-equipe/dashboard/eventos/disponiveis`}>
                                <ArrowLeftIcon size={20} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para eventos disponíveis</TooltipContent>
                </Tooltip>
                <div className="flex-1">
                    <SectionHeader
                        title="Nova Inscrição"
                        description={`Inscreva um atleta no evento ${event.title}`}
                    />
                </div>
            </div>

            <RegistrationForm
                event={event}
                athletes={athletes}
                isOwner={isOwner}
                adminTax={adminTax}
            />
        </div>
    );
}

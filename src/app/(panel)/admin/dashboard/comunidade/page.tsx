import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent } from "@/components/ui/card";
import { SuggestionsContent } from './components/suggestions-content';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CommunitySuggestionsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    // Fetch official gym names and master names to match
    const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('name');
    if (tenantsError) console.error("Error fetching tenants:", tenantsError);
    const registeredGyms = new Set(
        tenants?.map(t => t.name?.toLowerCase()).filter(Boolean)
    );

    const { data: masters, error: mastersError } = await supabase.from('profiles').select('full_name');
    if (mastersError) console.error("Error fetching masters:", mastersError);
    const registeredMasters = new Set(
        masters?.map(m => m.full_name?.toLowerCase()).filter(Boolean)
    );

    // Fetch all manual athletes
    const { data: rawData } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, belt_color, gym_name, master_name')
        .eq('role', 'atleta')
        .or('tenant_id.is.null,master_id.is.null');

    // Fetch their event registrations
    const athleteIds = rawData?.map(a => a.id) || [];
    let registrationsByAthlete: Record<string, string[]> = {};

    if (athleteIds.length > 0) {
        const { data: eventRegs } = await supabase
            .from('event_registrations')
            .select('athlete_id, events ( name )')
            .in('athlete_id', athleteIds);

        eventRegs?.forEach((reg: any) => {
            if (!registrationsByAthlete[reg.athlete_id]) {
                registrationsByAthlete[reg.athlete_id] = [];
            }
            if (reg.events?.name) {
                registrationsByAthlete[reg.athlete_id].push(reg.events.name);
            }
        });
    }

    // Agrupar por gym_name
    const grouped = (rawData || []).reduce((acc: any, curr) => {
        const gymKey = curr.gym_name || 'Sem Academia';
        const masterKey = curr.master_name || 'Sem Mestre';
        const groupKey = `${gymKey.trim().toLowerCase()}|${masterKey.trim().toLowerCase()}`;

        if (!acc[groupKey]) {
            acc[groupKey] = {
                gym_name: curr.gym_name || '',
                master_name: curr.master_name || '',
                count: 0,
                isGymRegistered: curr.gym_name ? registeredGyms.has(curr.gym_name.trim().toLowerCase()) : false,
                isMasterRegistered: curr.master_name ? registeredMasters.has(curr.master_name.trim().toLowerCase()) : false,
                athletes: []
            };
        }

        acc[groupKey].athletes.push({
            id: curr.id,
            full_name: curr.full_name,
            cpf: curr.cpf,
            belt_color: curr.belt_color,
            events: registrationsByAthlete[curr.id] || []
        });

        acc[groupKey].count += 1;
        return acc;
    }, {});

    const displaySuggestions = Object.values(grouped).sort((a: any, b: any) => b.count - a.count);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Sugestões da Comunidade"
                description="Academias e Mestres citados manualmente pelos atletas."
                rightElement={
                    <Button variant="outline" pill asChild className="gap-2 font-semibold">
                        <Link href="/admin/dashboard">
                            <CaretLeftIcon size={20} weight="bold" />
                            Voltar ao Painel
                        </Link>
                    </Button>
                }
            />

            <Card className="bg-primary/5 border-primary/10">
                <CardContent className="pt-6">
                    <p className="text-panel-sm text-primary/80 leading-relaxed">
                        Esta lista mostra as academias e mestres que atletas digitaram <strong>manualmente</strong> no perfil.
                        Isso acontece quando eles não encontram a opção oficial. Use estes dados para identificar novas academias que deveriam ter um cadastro oficial no sistema.
                    </p>
                </CardContent>
            </Card>

            <SuggestionsContent suggestions={displaySuggestions as any} />
        </div>
    );
}

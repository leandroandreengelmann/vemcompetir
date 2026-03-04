import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { SuggestionsContent } from './components/suggestions-content';

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
        <div className="space-y-8">
            {/* Header */}
            <div>
                <Link
                    href="/admin/dashboard"
                    className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit mb-2"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-h1 tracking-tight">Sugestões da Comunidade</h1>
                        <p className="text-ui text-muted-foreground">Academias e Mestres citados manualmente pelos atletas.</p>
                    </div>
                </div>
            </div>

            {/* Informação */}
            <Card className="bg-primary/5 border-primary/10">
                <CardContent className="pt-6">
                    <p className="text-ui text-primary/80 leading-relaxed">
                        Esta lista mostra as academias e mestres que atletas digitaram <strong>manualmente</strong> no perfil.
                        Isso acontece quando eles não encontram a opção oficial. Use estes dados para identificar novas academias que deveriam ter um cadastro oficial no sistema.
                    </p>
                </CardContent>
            </Card>

            {/* Tabela Interativa e Modal Baseados no Cliente */}
            <SuggestionsContent suggestions={displaySuggestions as any} />
        </div>
    );
}

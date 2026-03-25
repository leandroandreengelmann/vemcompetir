import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardKPIs } from "./actions";
import { RevenueCards } from "./components/revenue-cards";
import { SectionHeader } from "@/components/layout/SectionHeader";

export default async function AdminDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') redirect('/login');

    const kpis = await getDashboardKPIs();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Painel Administrativo"
                description="Visão geral financeira da plataforma COMPETIR"
            />
            <RevenueCards
                receitaTotalBruta={kpis.receitaTotalBruta}
                receitaConfirmada={kpis.receitaConfirmada}
                receitaPendente={kpis.receitaPendente}
            />
        </div>
    );
}


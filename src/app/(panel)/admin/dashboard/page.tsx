import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardKPIs } from "./actions";
import { RevenueCards } from "./components/revenue-cards";

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
        <div className="max-w-5xl mx-auto space-y-8 p-4">
            <RevenueCards
                receitaTotalBruta={kpis.receitaTotalBruta}
                receitaConfirmada={kpis.receitaConfirmada}
                receitaPendente={kpis.receitaPendente}
            />
        </div>
    );
}


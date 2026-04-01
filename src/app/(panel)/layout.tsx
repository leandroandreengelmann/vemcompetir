import { requireRole } from "@/lib/auth-guards";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { PanelSidebar } from "@/components/layout/PanelSidebar";
import React from 'react';
import { PanelLayoutClient } from "@/components/layout/PanelLayoutClient";
import { createClient } from "@/lib/supabase/server";

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile } = await requireRole(['admin_geral', 'academia/equipe']);
    const userEmail = user.email || "";

    let canRegisterAcademies = false;
    let hasActiveCredits = false;
    let hasOwnedEvents = false;
    let hasTokenManagement = false;
    let tokenBalance = 0;

    if (profile.role === 'academia/equipe' && profile.tenant_id) {
        const supabase = await createClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // usado no filtro de ownedEvents

        const [{ data: tenant }, { data: credits }, { data: ownedEvents }] = await Promise.all([
            supabase
                .from('tenants')
                .select('can_register_academies, token_management_enabled, inscription_token_balance')
                .eq('id', profile.tenant_id)
                .single(),
            supabase
                .from('inscription_packages')
                .select('id, used_credits, total_credits')
                .eq('assigned_to_tenant_id', profile.tenant_id)
                .limit(20),
            supabase
                .from('events')
                .select('id')
                .eq('tenant_id', profile.tenant_id)
                .gte('event_date', today.toISOString())
                .limit(1),
        ]);

        canRegisterAcademies = tenant?.can_register_academies ?? false;
        hasActiveCredits = (credits ?? []).some((pkg: any) => pkg.used_credits < pkg.total_credits);
        hasOwnedEvents = (ownedEvents ?? []).length > 0;
        hasTokenManagement = tenant?.token_management_enabled ?? false;
        tokenBalance = tenant?.inscription_token_balance ?? 0;
    }

    return (
        <PanelLayoutClient
            sidebar={<PanelSidebar role={profile.role} canRegisterAcademies={canRegisterAcademies} hasActiveCredits={hasActiveCredits} hasOwnedEvents={hasOwnedEvents} hasTokenManagement={hasTokenManagement} tokenBalance={tokenBalance} />}
            header={<PanelHeader user={{ ...profile, email: userEmail }} role={profile.role} />}
        >
            {children}
        </PanelLayoutClient>
    );
}

import { requireRole } from "@/lib/auth-guards";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { PanelSidebar } from "@/components/layout/PanelSidebar";
import React from 'react';
import { PanelLayoutClient } from "@/components/layout/PanelLayoutClient";
import { TokenCriticalBanner } from "@/components/layout/TokenCriticalBanner";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRITICAL_BALANCE_THRESHOLD } from "@/lib/token-utils";

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
    let hasFinancialModule = false;
    let tokenBalance = 0;
    let banner: React.ReactNode = null;

    if (profile.role === 'academia/equipe' && profile.tenant_id) {
        const supabase = await createClient();

        const [{ data: tenant }, { data: credits }, { data: ownedEvents }] = await Promise.all([
            supabase
                .from('tenants')
                .select('can_register_academies, token_management_enabled, inscription_token_balance, financial_module_enabled')
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
                .limit(1),
        ]);

        canRegisterAcademies = tenant?.can_register_academies ?? false;
        hasActiveCredits = (credits ?? []).some((pkg: any) => pkg.used_credits < pkg.total_credits);
        hasOwnedEvents = (ownedEvents ?? []).length > 0;
        hasTokenManagement = tenant?.token_management_enabled ?? false;
        hasFinancialModule = tenant?.financial_module_enabled ?? false;
        tokenBalance = tenant?.inscription_token_balance ?? 0;

        if (hasTokenManagement && tokenBalance <= CRITICAL_BALANCE_THRESHOLD) {
            banner = <TokenCriticalBanner variant="organizer" balance={tokenBalance} />;
        }
    }

    if (profile.role === 'admin_geral') {
        const adminClient = createAdminClient();
        const { data: lowBalanceTenants } = await adminClient
            .from('tenants')
            .select('id, name, inscription_token_balance')
            .eq('token_management_enabled', true)
            .lte('inscription_token_balance', CRITICAL_BALANCE_THRESHOLD)
            .order('inscription_token_balance', { ascending: true })
            .limit(20);

        const academies = (lowBalanceTenants ?? []).map(t => ({
            id: t.id,
            name: t.name,
            balance: t.inscription_token_balance,
        }));

        if (academies.length > 0) {
            banner = <TokenCriticalBanner variant="admin" academies={academies} />;
        }
    }

    return (
        <PanelLayoutClient
            sidebar={<PanelSidebar role={profile.role} canRegisterAcademies={canRegisterAcademies} hasActiveCredits={hasActiveCredits} hasOwnedEvents={hasOwnedEvents} hasTokenManagement={hasTokenManagement} hasFinancialModule={hasFinancialModule} tokenBalance={tokenBalance} />}
            header={<PanelHeader user={{ ...profile, email: userEmail }} role={profile.role} />}
            banner={banner}
        >
            {children}
        </PanelLayoutClient>
    );
}

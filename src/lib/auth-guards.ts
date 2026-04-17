import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = 'admin_geral' | 'academia' | 'organizador' | 'atleta' | 'academia/equipe';

/**
 * Ensures the user is authenticated. 
 * Redirects to login if not.
 */
export async function requireAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return user;
}

/**
 * Ensures the user has a specific role.
 * Redirects to login/unauthorized if not.
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]) {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, tenant_id, full_name, gym_name, belt_color, weight, birth_date, master_name, master_id, avatar_url, cpf, phone, sexo')
        .eq('id', user.id)
        .single();

    if (error) {
        // Silently handle or use a logger in production
    }

    const activeRole = (profile?.role || user.user_metadata?.role) as UserRole;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!activeRole || !roles.includes(activeRole)) {
        // If they are allowed in SOME dashboard, send them there instead of / to break the loop
        if (activeRole === 'atleta') redirect("/atleta/dashboard");
        if (activeRole === 'organizador') redirect("/organizador/dashboard");
        if (activeRole === 'academia' || activeRole === 'academia/equipe') redirect("/academia-equipe/dashboard");
        if (activeRole === 'admin_geral') redirect("/admin/dashboard");

        // Fallback to root but only if not already coming from there
        redirect("/");
    }

    return {
        user,
        profile: profile || {
            id: user.id,
            role: activeRole,
            tenant_id: null,
            full_name: user.user_metadata?.full_name,
            gym_name: user.user_metadata?.gym_name,
            belt_color: null,
            weight: null,
            birth_date: null,
            avatar_url: null,
            master_id: null,
            sexo: null,
            cpf: null,
            phone: null,
            master_name: null,
        }
    };
}

/**
 * Ensures the user is tied to a tenant.
 */
export async function requireTenantScope() {
    const { user, profile } = await requireRole(['academia', 'organizador', 'academia/equipe', 'admin_geral']);

    if (profile.role !== 'admin_geral' && !profile.tenant_id) {
        redirect("/");
    }

    return { user, profile, tenant_id: profile.tenant_id };
}

/**
 * Gates access to the Financial Module feature.
 * Requires the tenant to have `financial_module_enabled = true`.
 * Redirects to dashboard if not enabled.
 */
export async function requireFinancialModule() {
    const { user, profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('financial_module_enabled')
        .eq('id', tenant_id)
        .single();

    if (!tenant?.financial_module_enabled) {
        redirect('/academia-equipe/dashboard');
    }

    return { user, profile, tenant_id };
}

export async function isFinancialModuleEnabled(tenantId: string | null | undefined): Promise<boolean> {
    if (!tenantId) return false;
    const supabase = await createClient();
    const { data } = await supabase
        .from('tenants')
        .select('financial_module_enabled')
        .eq('id', tenantId)
        .single();
    return !!data?.financial_module_enabled;
}

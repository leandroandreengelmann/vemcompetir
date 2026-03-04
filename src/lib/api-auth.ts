import { createClient } from "@/lib/supabase/server";
import { UserRole } from "./auth-guards";

export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Validates session for API routes without redirecting.
 * Returns the Supabase user if authenticated, otherwise throws ApiError.
 */
export async function verifyApiAuth() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new ApiError(401, "Unauthorized: Valid session required.");
    }

    return user;
}

/**
 * Validates that the authenticated user has one of the allowed roles.
 * Returns user and profile data.
 */
export async function verifyApiRole(allowedRoles: UserRole | UserRole[]) {
    const user = await verifyApiAuth();
    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, tenant_id')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new ApiError(500, "Internal Server Error while fetching profile.");
    }

    const activeRole = (profile?.role || user.user_metadata?.role) as UserRole;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!activeRole || !roles.includes(activeRole)) {
        throw new ApiError(403, "Forbidden: Insufficient permissions.");
    }

    return { user, profile: profile || { role: activeRole, tenant_id: null } };
}

/**
 * Verifies if the user is a global admin.
 */
export async function verifyAdminApi() {
    return verifyApiRole('admin_geral');
}

/**
 * Verifies if the user is a tenant manager (academia/organizador) or global admin,
 * and returns their tenant scope.
 */
export async function verifyTenantApi() {
    const { user, profile } = await verifyApiRole(['academia', 'organizador', 'academia/equipe', 'admin_geral']);

    // Global admins might not have a tenant_id, but they bypass this check usually
    // Strict tenants must have a tenant_id
    if (profile.role !== 'admin_geral' && !profile.tenant_id) {
        throw new ApiError(403, "Forbidden: Tenant scope required.");
    }

    return { user, profile, tenantId: profile.tenant_id };
}

/**
 * Utility to catch ApiErrors in Route Handlers and return standardized NextResponse
 */
import { NextResponse } from "next/server";

export function handleApiError(error: unknown) {
    if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("API Error unhandled:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

import { requireRole } from "@/lib/auth-guards";
import { cookies } from "next/headers";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { IMP_ACTIVE, IMP_LABEL } from "@/lib/impersonation-constants";

export default async function AcademiaEquipeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole(['academia/equipe', 'admin_geral']);

    const cookieStore = await cookies();
    const impersonating = cookieStore.get(IMP_ACTIVE)?.value === '1';
    const label = cookieStore.get(IMP_LABEL)?.value || 'esta conta';

    return (
        <>
            {impersonating && <ImpersonationBanner label={label} />}
            {children}
        </>
    );
}

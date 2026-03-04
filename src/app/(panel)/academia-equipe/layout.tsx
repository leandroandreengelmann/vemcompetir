import { requireRole } from "@/lib/auth-guards";

export default async function AcademiaEquipeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole(['academia/equipe', 'admin_geral']);
    return <>{children}</>;
}

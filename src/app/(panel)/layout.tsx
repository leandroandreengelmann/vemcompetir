import { requireRole } from "@/lib/auth-guards";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { PanelSidebar } from "@/components/layout/PanelSidebar";
import React from 'react';
import { PanelLayoutClient } from "@/components/layout/PanelLayoutClient";

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile } = await requireRole(['admin_geral', 'academia/equipe']);
    const userEmail = user.email || "";

    return (
        <PanelLayoutClient
            sidebar={<PanelSidebar role={profile.role} />}
            header={<PanelHeader user={{ ...profile, email: userEmail }} role={profile.role} />}
        >
            {children}
        </PanelLayoutClient>
    );
}

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
        <PanelLayoutClient>
            <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
                <PanelSidebar role={profile.role} />
                <div className="flex flex-col flex-1 min-w-0">
                    <PanelHeader user={{ ...profile, email: userEmail }} role={profile.role} />
                    <main className="flex-1 p-4 md:p-6 bg-muted/30">
                        {children}
                    </main>
                </div>
            </div>
        </PanelLayoutClient>
    );
}

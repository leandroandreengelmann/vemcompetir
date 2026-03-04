'use client';

import { SidebarProvider } from "@/hooks/use-sidebar";

export function PanelLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            {children}
        </SidebarProvider>
    );
}

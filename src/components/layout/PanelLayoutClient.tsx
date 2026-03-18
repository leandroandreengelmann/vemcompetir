'use client';

import { SidebarProvider } from "@/hooks/use-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function PanelLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider delayDuration={300}>
            <SidebarProvider>
                {children}
            </SidebarProvider>
        </TooltipProvider>
    );
}

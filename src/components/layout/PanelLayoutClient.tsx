'use client';

import React from 'react';
import { SidebarProvider } from "@/hooks/use-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface PanelLayoutClientProps {
    sidebar: React.ReactNode;
    header: React.ReactNode;
    children: React.ReactNode;
}

export function PanelLayoutClient({ sidebar, header, children }: PanelLayoutClientProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <SidebarProvider>
                <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
                    {sidebar}
                    <div className="flex flex-col flex-1 min-w-0">
                        {header}
                        <main className="flex-1 p-4 md:p-6 bg-muted/30">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </TooltipProvider>
    );
}

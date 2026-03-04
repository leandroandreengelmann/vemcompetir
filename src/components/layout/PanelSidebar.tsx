'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, Users, Calendar, User, ChevronLeft, ChevronRight, Building2, MessageSquareQuote, Layers, Settings, Plug, Wallet, Landmark, HandCoins } from "lucide-react";
import { useState } from "react";
import { useSidebar } from "@/hooks/use-sidebar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PanelSidebarProps {
    role: string;
}

export function PanelSidebar({ role }: PanelSidebarProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { isCollapsed, toggleSidebar } = useSidebar();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: role === 'admin_geral' ? "/admin/dashboard" : "/academia-equipe/dashboard",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Equipes / Academias",
            icon: Building2,
            href: "/admin/dashboard/equipes-academias",
            roles: ['admin_geral'],
        },
        {
            label: "Sugestões",
            icon: MessageSquareQuote,
            href: "/admin/dashboard/comunidade",
            roles: ['admin_geral'],
        },

        {
            label: role === 'academia/equipe' ? "Meus Eventos" : "Eventos",
            icon: Calendar,
            href: role === 'admin_geral' ? "/admin/dashboard/eventos" : "/academia-equipe/dashboard/eventos",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Categorias",
            icon: Layers,
            href: "/admin/dashboard/categorias",
            roles: ['admin_geral'],
        },
        {
            label: "Atletas",
            icon: Users,
            href: "/academia-equipe/dashboard/atletas",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Eventos Disponíveis",
            icon: Calendar,
            href: "/academia-equipe/dashboard/eventos/disponiveis",
            roles: ['academia/equipe'],
        },
        {
            label: "Financeiro Asaas",
            icon: Wallet,
            href: "/academia-equipe/dashboard/financeiro/asaas",
            roles: ['academia/equipe'],
        },

        {
            label: "Cobrança Integral",
            icon: HandCoins,
            href: "/admin/dashboard/cobranca-integral",
            roles: ['admin_geral'],
        },
        {
            label: "Configurações",
            icon: Settings,
            href: "/admin/dashboard/configuracoes",
            roles: ['admin_geral'],
        },
        {
            label: "Integrações",
            icon: Plug,
            href: "/admin/dashboard/integracoes/asaas",
            roles: ['admin_geral'],
        },
    ];

    const filteredRoutes = routes.filter((route) => route.roles.includes(role));

    const sidebarContent = (isMobile = false) => (
        <div className="flex flex-col gap-2 py-2">
            {filteredRoutes.map((route) => {
                const isDashboard = route.href.endsWith('/dashboard');
                let isActive = isDashboard
                    ? pathname === route.href
                    : pathname === route.href || pathname.startsWith(route.href + '/');

                // Special case to prevent "Meus Eventos" from highlighting when inside "Eventos Disponíveis"
                if (route.href.endsWith('/eventos') && pathname.startsWith(route.href + '/disponiveis')) {
                    isActive = false;
                }

                // Collapsed Item (Desktop Only)
                if (isCollapsed && !isMobile) {
                    return (
                        <TooltipProvider key={route.href} delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "relative size-11 px-0 mx-auto transition-all duration-200",
                                            "hover:bg-muted/40 hover:text-foreground",
                                            isActive && "bg-muted/60 rounded-xl text-foreground shadow-sm",
                                            isActive && "before:absolute before:left-0 before:w-[3px] before:h-6 before:rounded-full before:bg-foreground/70"
                                        )}
                                        asChild
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <Link href={route.href} aria-label={route.label}>
                                            <route.icon
                                                className={cn(
                                                    "size-5 transition-colors",
                                                    isActive ? "text-foreground" : "text-muted-foreground"
                                                )}
                                                strokeWidth={1.8}
                                            />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium">
                                    {route.label}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                // Expanded Item (Desktop & Mobile)
                return (
                    <Button
                        key={route.href}
                        variant="ghost"
                        className={cn(
                            "relative justify-start gap-3 h-11 px-3 transition-all duration-200",
                            "hover:bg-muted/40 hover:text-foreground",
                            isActive && "bg-muted/60 rounded-xl font-semibold text-foreground",
                            isActive && "before:absolute before:left-0 before:w-[3px] before:h-6 before:rounded-full before:bg-foreground/70"
                        )}
                        asChild
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => isMobile && setOpen(false)}
                    >
                        <Link href={route.href}>
                            <route.icon
                                className={cn(
                                    "size-5 transition-colors",
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                )}
                                strokeWidth={1.8}
                            />
                            {(!isCollapsed || isMobile) && <span>{route.label}</span>}
                        </Link>
                    </Button>
                );
            })}
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div
                className={cn(
                    "hidden bg-sidebar md:block min-h-screen transition-all duration-300 ease-in-out border-r border-sidebar-border",
                    isCollapsed ? "w-[64px]" : "w-[240px]"
                )}
            >
                <div className={cn(
                    "flex h-14 items-center border-b border-sidebar-border lg:h-[60px]",
                    isCollapsed ? "justify-center px-0" : "px-6 justify-between text-foreground"
                )}>
                    {!isCollapsed ? (
                        <div className="flex items-center gap-2">
                            <img src="/logo-camaleao-black.png" alt="COMPETIR" className="h-8 w-auto object-contain dark:hidden" />
                            <img src="/logo-camaleao-white.png" alt="COMPETIR" className="h-8 w-auto object-contain hidden dark:block" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-2">
                            <img
                                src="/simbolo-camaleao-black.png"
                                alt="COMPETIR"
                                className="w-8 h-8 object-contain dark:hidden"
                            />
                            <img
                                src="/simbolo-camaleao-white.png"
                                alt="COMPETIR"
                                className="w-8 h-8 object-contain hidden dark:block"
                            />
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className={cn("h-8 w-8", isCollapsed ? "hidden" : "ml-auto")}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                </div>

                <div className="p-3 flex flex-col h-[calc(100vh-60px)]">
                    {sidebarContent()}

                    {/* Botão de expandir quando recolhido */}
                    {isCollapsed && (
                        <div className="mt-auto flex justify-center pt-4 border-t border-sidebar-border/50">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="size-9 hover:bg-muted/40 text-muted-foreground transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

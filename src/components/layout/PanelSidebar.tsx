'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    SquaresFourIcon,
    UsersIcon,
    CalendarIcon,
    UserIcon,
    CaretLeftIcon,
    CaretRightIcon,
    BuildingsIcon,
    ChatCenteredIcon,
    StackSimpleIcon,
    GearIcon,
    PlugIcon,
    WalletIcon,
    FileTextIcon,
    ScalesIcon,
    TicketIcon,
    ArrowsClockwiseIcon,
    TreeStructureIcon,
    CurrencyCircleDollarIcon,
    CoinsIcon,
} from "@phosphor-icons/react";
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
    canRegisterAcademies?: boolean;
    hasActiveCredits?: boolean;
    hasOwnedEvents?: boolean;
    hasTokenManagement?: boolean;
    tokenBalance?: number;
}

export function PanelSidebar({ role, canRegisterAcademies = false, hasActiveCredits = false, hasOwnedEvents = false, hasTokenManagement = false, tokenBalance = 0 }: PanelSidebarProps) {
    const pathname = usePathname();
    const [, setOpen] = useState(false);
    const { isCollapsed, toggleSidebar } = useSidebar();

    const routes = [
        {
            label: "Dashboard",
            icon: SquaresFourIcon,
            href: role === 'admin_geral' ? "/admin/dashboard" : "/academia-equipe/dashboard",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Equipes / Academias",
            icon: BuildingsIcon,
            href: "/admin/dashboard/equipes-academias",
            roles: ['admin_geral'],
        },
        {
            label: "Sugestões",
            icon: ChatCenteredIcon,
            href: "/admin/dashboard/comunidade",
            roles: ['admin_geral'],
        },
        {
            label: role === 'academia/equipe' ? "Meus Eventos" : "Eventos",
            icon: CalendarIcon,
            href: role === 'admin_geral' ? "/admin/dashboard/eventos" : "/academia-equipe/dashboard/eventos",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Categorias",
            icon: StackSimpleIcon,
            href: "/admin/dashboard/categorias",
            roles: ['admin_geral'],
        },
        {
            label: "Central V/S",
            icon: UsersIcon,
            href: "/admin/dashboard/atletas",
            roles: ['admin_geral'],
        },
        {
            label: "Gestão de Atletas",
            icon: UsersIcon,
            href: "/academia-equipe/dashboard/atletas",
            roles: ['admin_geral'],
        },
        {
            label: "Atletas",
            icon: UsersIcon,
            href: "/academia-equipe/dashboard/atletas",
            roles: ['academia/equipe'],
        },
        {
            label: "Cortesias",
            icon: TicketIcon,
            href: "/academia-equipe/dashboard/cortesias",
            roles: ['academia/equipe'],
            isNew: true,
        },
        {
            label: "Checagem",
            icon: ArrowsClockwiseIcon,
            href: "/academia-equipe/dashboard/trocar-categoria",
            roles: ['academia/equipe'],
            isNew: true,
        },
        ...(canRegisterAcademies ? [{
            label: "Academias Afiliadas",
            icon: TreeStructureIcon,
            href: "/academia-equipe/dashboard/academias-afiliadas",
            roles: ['academia/equipe'] as string[],
            isNew: true,
            isExclusive: true,
        }] : []),
        ...(hasOwnedEvents ? [{
            label: "Pacotes de Inscrição",
            icon: CurrencyCircleDollarIcon,
            href: "/academia-equipe/dashboard/pacotes-inscricoes",
            roles: ['academia/equipe'] as string[],
            isNew: true,
        }] : []),
        ...(hasActiveCredits ? [{
            label: "Créditos",
            icon: TicketIcon,
            href: "/academia-equipe/dashboard/creditos-inscricoes",
            roles: ['academia/equipe'] as string[],
            isNew: true,
            accent: true,
        }] : []),
        ...(hasTokenManagement ? [{
            label: "Tokens",
            icon: CoinsIcon,
            href: "/academia-equipe/dashboard/tokens",
            roles: ['academia/equipe'] as string[],
            tokenCount: tokenBalance,
            tokenLow: tokenBalance <= 10,
        }] : []),
        {
            label: "Eventos Disponíveis",
            icon: CalendarIcon,
            href: "/academia-equipe/dashboard/eventos/disponiveis",
            roles: ['academia/equipe'],
        },
        {
            label: "Financeiro Asaas",
            icon: WalletIcon,
            href: "/academia-equipe/dashboard/financeiro/asaas",
            roles: ['academia/equipe'],
        },
        {
            label: "Meu Perfil",
            icon: UserIcon,
            href: "/academia-equipe/dashboard/perfil",
            roles: ['academia/equipe'],
        },
        {
            label: "Termos de Uso",
            icon: FileTextIcon,
            href: "/admin/dashboard/termos",
            roles: ['admin_geral'],
        },
        {
            label: "Jurídico",
            icon: ScalesIcon,
            href: "/admin/dashboard/juridico",
            roles: ['admin_geral'],
        },
        {
            label: "Configurações",
            icon: GearIcon,
            href: "/admin/dashboard/configuracoes",
            roles: ['admin_geral'],
        },
        {
            label: "Tokens",
            icon: CoinsIcon,
            href: "/admin/dashboard/pacotes-tokens",
            roles: ['admin_geral'],
        },
        {
            label: "Integrações",
            icon: PlugIcon,
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

                if (route.href.endsWith('/eventos') && pathname.startsWith(route.href + '/disponiveis')) {
                    isActive = false;
                }

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
                                                size={24}
                                                weight="duotone"
                                                className={cn(
                                                    "transition-colors size-6",
                                                    isActive ? "text-foreground" : (route as any).accent ? "text-blue-500" : "text-muted-foreground"
                                                )}
                                            />
                                            {(route as any).isNew && (
                                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                                            )}
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

                const hasBadges = (route as any).isNew || (route as any).isExclusive;
                return (
                    <Button
                        key={route.href}
                        variant="ghost"
                        className={cn(
                            "relative justify-start gap-3 px-3 transition-all duration-200",
                            hasBadges ? "h-auto py-2" : "h-11",
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
                                size={24}
                                weight="duotone"
                                className={cn(
                                    "transition-colors size-6",
                                    isActive ? "text-foreground" : (route as any).accent ? "text-blue-500" : "text-muted-foreground"
                                )}
                            />
                            {(!isCollapsed || isMobile) && (
                                <span className="flex flex-col flex-1 min-w-0">
                                    <span className={cn(
                                        "flex items-center gap-2",
                                        !isActive && (route as any).accent && "text-blue-600 font-medium"
                                    )}>
                                        {route.label}
                                        {(route as any).tokenCount !== undefined && (
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full tabular-nums",
                                                (route as any).tokenLow
                                                    ? "bg-destructive/20 text-destructive"
                                                    : "bg-blue-500/20 text-blue-600"
                                            )}>
                                                {(route as any).tokenCount}
                                            </span>
                                        )}
                                    </span>
                                    {((route as any).isNew || (route as any).isExclusive) && (
                                        <span className="flex items-center gap-1 mt-0.5">
                                            {(route as any).isNew && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500 text-white leading-none">
                                                    Novo
                                                </span>
                                            )}
                                            {(route as any).isExclusive && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-orange-500 text-white leading-none">
                                                    Exclusivo
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </span>
                            )}
                        </Link>
                    </Button>
                );
            })}
        </div>
    );

    return (
        <>
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
                            <img src="/simbolo-camaleao-black.png" alt="COMPETIR" className="w-8 h-8 object-contain dark:hidden" />
                            <img src="/simbolo-camaleao-white.png" alt="COMPETIR" className="w-8 h-8 object-contain hidden dark:block" />
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className={cn("h-10 w-10", isCollapsed ? "hidden" : "ml-auto")}
                    >
                        {isCollapsed ? <CaretRightIcon size={18} className="size-[18px]" weight="duotone" /> : <CaretLeftIcon size={18} className="size-[18px]" weight="duotone" />}
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                </div>

                <div className="p-3 flex flex-col h-[calc(100vh-60px)]">
                    {sidebarContent()}

                    {isCollapsed && (
                        <div className="mt-auto flex justify-center pt-4 border-t border-sidebar-border/50">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="size-10 hover:bg-muted/40 text-muted-foreground transition-all"
                            >
                                <CaretRightIcon size={18} className="size-[18px]" weight="duotone" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

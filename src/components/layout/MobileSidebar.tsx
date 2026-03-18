'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ListIcon, SquaresFourIcon, UsersIcon, CalendarIcon, StackSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface MobileSidebarProps {
    role: string;
}

export function MobileSidebar({ role }: MobileSidebarProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const routes = [
        {
            label: "Dashboard",
            icon: SquaresFourIcon,
            href: "/academia-equipe/dashboard",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Equipes / Academias",
            icon: UsersIcon,
            href: "/admin/dashboard/organizadores",
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
            label: "Atletas",
            icon: UsersIcon,
            href: "/academia-equipe/dashboard/atletas",
            roles: ['admin_geral', 'academia/equipe'],
        },
        {
            label: "Eventos Disponíveis",
            icon: CalendarIcon,
            href: "/academia-equipe/dashboard/eventos/disponiveis",
            roles: ['academia/equipe'],
        },
    ];

    const filteredRoutes = routes.filter((route) => route.roles.includes(role));

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <ListIcon size={24} className="size-6" weight="duotone" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-4">
                <div className="mb-6 px-2 text-panel-md font-bold">COMPETIR</div>
                <div className="flex flex-col gap-2 py-2">
                    {filteredRoutes.map((route) => {
                        const isDashboard = route.href.endsWith('/dashboard');
                        let isActive = isDashboard
                            ? pathname === route.href
                            : pathname === route.href || pathname.startsWith(route.href + '/');

                        if (route.href.endsWith('/eventos') && pathname.startsWith(route.href + '/disponiveis')) {
                            isActive = false;
                        }

                        return (
                            <Button
                                key={route.href}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn("justify-start gap-2", isActive && "bg-secondary")}
                                asChild
                                onClick={() => setOpen(false)}
                            >
                                <Link href={route.href}>
                                    <route.icon size={24} className="size-6" weight="duotone" />
                                    {route.label}
                                </Link>
                            </Button>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
}

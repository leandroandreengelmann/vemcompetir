'use client'

import { usePathname } from "next/navigation"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const routeMap: Record<string, string> = {
    'admin': 'Admin',
    'dashboard': 'Dashboard',
    'eventos': 'Eventos',
    'categorias': 'Categorias',
    'equipes-academias': 'Equipes & Academias',
    'comunidade': 'Comunidade',
    'configuracoes': 'Configurações',
    'academia-equipe': 'Academia/Equipe',
    'atletas': 'Atletas',
}

export function PanelBreadcrumbs() {
    const pathname = usePathname()
    const pathSegments = pathname.split('/').filter(segment => segment !== '')

    return (
        <Breadcrumb className="max-w-full">
            <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-hidden items-center gap-1 sm:gap-2">
                {pathSegments.map((segment, index) => {
                    let href = `/${pathSegments.slice(0, index + 1).join('/')}`
                    const isLast = index === pathSegments.length - 1
                    const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

                    // Correção para evitar 404 em segmentos de agrupamento
                    if (segment === 'academia-equipe') href = '/academia-equipe/dashboard'
                    if (segment === 'admin' && pathSegments[index + 1] !== 'dashboard') href = '/admin/dashboard'

                    // No mobile, escondemos TUDO que não seja o último item para poupar espaço
                    const isHiddenOnMobile = !isLast;

                    return (
                        <React.Fragment key={`${index}-${segment}`}>
                            {/* No mobile, só mostramos o último. Se for o último, ele herda a visibilidade padrão. */}
                            <BreadcrumbItem className={cn(isHiddenOnMobile && "hidden sm:inline-flex")}>
                                {isLast ? (
                                    <BreadcrumbPage className="font-bold max-w-[180px] sm:max-w-none truncate text-foreground">
                                        {label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground transition-colors">
                                        <Link href={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator className={cn(isHiddenOnMobile && "hidden sm:block")} />}
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}

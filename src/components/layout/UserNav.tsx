'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface UserNavProps {
    user: {
        full_name?: string | null;
        gym_name?: string | null;
        email?: string | null;
        role?: string | null;
    };
}

export function UserNav({ user }: UserNavProps) {
    const router = useRouter();
    const supabase = createClient();

    const getInitials = () => {
        const name = user.full_name || user.gym_name;
        if (!name) return "??";

        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button pill variant="ghost" className="relative h-10 w-10">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={user.full_name || user.gym_name || ""} />
                        <AvatarFallback className="bg-black text-white">{getInitials()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5">
                        <p className="text-base font-semibold leading-none">{user.full_name || user.gym_name}</p>
                        <p className="text-sm leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                {user.role === 'admin_geral' ? (
                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-muted focus:text-foreground">
                        <Link href="/admin/dashboard/configuracoes">
                            <UserIcon size={16} weight="duotone" className="mr-2" />
                            <span>Perfil</span>
                        </Link>
                    </DropdownMenuItem>
                ) : user.role === 'academia/equipe' ? (
                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-muted focus:text-foreground">
                        <Link href="/academia-equipe/dashboard/perfil">
                            <UserIcon size={16} weight="duotone" className="mr-2" />
                            <span>Perfil</span>
                        </Link>
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-muted focus:text-foreground">
                        <Link href="/atleta/dashboard/perfil">
                            <UserIcon size={16} weight="duotone" className="mr-2" />
                            <span>Perfil</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-muted">
                    <SignOutIcon size={16} weight="duotone" className="mr-2" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

import { UserNav } from "./UserNav";
import { MobileSidebar } from "./MobileSidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { CartTrigger } from "@/components/panel-layout/CartTrigger";
import { CartSheet } from "@/components/panel-layout/CartSheet";

import { PanelBreadcrumbs } from "./PanelBreadcrumbs";

interface PanelHeaderProps {
    user: any;
    role: string;
}

export function PanelHeader({ user, role }: PanelHeaderProps) {
    return (
        <header className="flex h-14 items-center gap-1 sm:gap-4 border-b bg-background px-4 sm:px-6 lg:h-[60px]">
            <MobileSidebar role={role} />
            <div className="flex-1 flex items-center min-w-0">
                <PanelBreadcrumbs />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                {role === 'academia/equipe' && user?.gym_name && (
                    <span className="hidden md:inline-block text-lg font-bold text-foreground mr-3 truncate max-w-[300px]">
                        {user.gym_name}
                    </span>
                )}
                <CartTrigger />
                <CartSheet />
                <AnimatedThemeToggler
                    className="inline-flex items-center justify-center rounded-md text-ui font-medium transition-colors hover:bg-muted hover:text-foreground h-9 w-9 cursor-pointer"
                />
                <UserNav user={user} />
            </div>
        </header>
    );
}

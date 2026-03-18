'use client';

import { Button } from "@/components/ui/button";
import { useRegistrationCart } from "@/hooks/use-registration-cart";
import { ShoppingBagIcon } from "@phosphor-icons/react";

export function CartTrigger() {
    const { items, setOpen } = useRegistrationCart();

    if (items.length === 0) return null;

    return (
        <Button
            variant="ghost"
            size="icon"
            pill
            className="relative h-11 w-11 bg-muted/30 dark:bg-muted/10 hover:bg-accent border-2 border-foreground shadow-sm"
            onClick={() => setOpen(true)}
        >
            <ShoppingBagIcon size={32} weight="duotone" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-panel-sm font-bold text-primary-foreground animate-in zoom-in shadow-sm">
                {items.length}
            </span>
        </Button>
    );
}

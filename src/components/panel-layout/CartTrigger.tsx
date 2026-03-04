'use client';

import { Button } from "@/components/ui/button";
import { useRegistrationCart } from "@/hooks/use-registration-cart";
import { ShoppingBag } from "lucide-react";

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
            <ShoppingBag className="h-8 w-8" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in shadow-sm">
                {items.length}
            </span>
        </Button>
    );
}

'use client';

import { useAthleteCart } from '@/hooks/use-athlete-cart';
import { Button } from '@/components/ui/button';
import { ShoppingBagIcon } from '@phosphor-icons/react';

export function AthleteCartTrigger() {
    const { items, setOpen, isOpen } = useAthleteCart();

    const cartCount = items.filter(i => i.status === 'carrinho').length;
    const pendingCount = items.filter(i => i.status === 'aguardando_pagamento').length;

    if ((cartCount === 0 && pendingCount === 0) || isOpen) return null;

    const hasOnlyPending = cartCount === 0 && pendingCount > 0;
    const displayCount = cartCount + pendingCount;

    const btnClasses = hasOnlyPending
        ? "relative h-11 w-11 bg-background hover:bg-amber-50 border-2 border-amber-500 transition-colors shadow-sm"
        : "relative h-11 w-11 bg-background hover:bg-primary/5 border-2 border-primary transition-colors shadow-sm";

    const iconClasses = hasOnlyPending ? "text-amber-500" : "text-primary";

    const badgeClasses = hasOnlyPending
        ? "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-panel-sm font-bold text-white animate-in zoom-in shadow-sm"
        : "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-panel-sm font-bold text-primary-foreground animate-in zoom-in shadow-sm";

    return (
        <Button pill variant="outline"
            size="icon"
            className={btnClasses}
            onClick={() => setOpen(true)}
        >
            <ShoppingBagIcon size={20} weight="duotone" className={iconClasses} />
            <span className={badgeClasses}>
                {displayCount}
            </span>
        </Button>
    );
}

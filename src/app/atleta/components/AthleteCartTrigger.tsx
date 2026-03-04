'use client';

import { useAthleteCart } from '@/hooks/use-athlete-cart';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export function AthleteCartTrigger() {
    const { items, setOpen, isOpen } = useAthleteCart();

    // Filter only carrinho items for the badge count
    const cartCount = items.filter(i => i.status === 'carrinho').length;

    if (cartCount === 0 || isOpen) return null;

    return (
        <Button pill variant="outline"
            size="icon"
            className="relative h-11 w-11 bg-background hover:bg-primary/5 border-2 border-primary transition-colors shadow-sm"
            onClick={() => setOpen(true)}
        >
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in shadow-sm">
                {cartCount}
            </span>
        </Button>
    );
}

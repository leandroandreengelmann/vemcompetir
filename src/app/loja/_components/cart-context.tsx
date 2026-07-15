'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartItem = {
    productId: string;
    slug: string;
    name: string;
    price: number;
    image: string | null;
    size: string | null;
    color: string | null;
    qty: number;
};

type StoreInfo = { whatsapp: string | null; storeName: string | null };

type CartContextValue = {
    items: CartItem[];
    count: number;
    total: number;
    store: StoreInfo;
    add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
    remove: (key: string) => void;
    setQty: (key: string, qty: number) => void;
    clear: () => void;
    keyOf: (i: Pick<CartItem, 'productId' | 'size' | 'color'>) => string;
    isOpen: boolean;
    setOpen: (v: boolean) => void;
};

const STORAGE_KEY = 'vc-store-cart';
const CartContext = createContext<CartContextValue | null>(null);

function keyOf(i: Pick<CartItem, 'productId' | 'size' | 'color'>) {
    return `${i.productId}::${i.size ?? ''}::${i.color ?? ''}`;
}

export function CartProvider({ store, children }: { store: StoreInfo; children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setItems(JSON.parse(raw));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
        }
    }, [items, hydrated]);

    const value = useMemo<CartContextValue>(() => {
        const count = items.reduce((s, i) => s + i.qty, 0);
        const total = items.reduce((s, i) => s + i.qty * i.price, 0);
        return {
            items, count, total, store, keyOf, isOpen, setOpen,
            add: (item, qty = 1) => {
                setItems((prev) => {
                    const k = keyOf(item);
                    const idx = prev.findIndex((p) => keyOf(p) === k);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
                        return next;
                    }
                    return [...prev, { ...item, qty }];
                });
                setOpen(true);
            },
            remove: (k) => setItems((prev) => prev.filter((p) => keyOf(p) !== k)),
            setQty: (k, qty) => setItems((prev) =>
                prev.map((p) => (keyOf(p) === k ? { ...p, qty: Math.max(1, qty) } : p))),
            clear: () => setItems([]),
        };
    }, [items, store, isOpen]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
    return ctx;
}

/** Monta a URL do WhatsApp com a mensagem do pedido (inclui link de cada produto). */
export function buildWhatsAppUrl(whatsapp: string, items: CartItem[], total: number): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const blocks = items.map((i) => {
        const variant = [i.size, i.color].filter(Boolean).join(', ');
        const label = variant ? `${i.name} (${variant})` : i.name;
        const qty = i.qty > 1 ? `${i.qty}x ` : '';
        const link = `${origin}/loja/produto/${i.slug}`;
        return `• ${qty}${label} — ${brl(i.price)}\n${link}`;
    });

    const msg = `Olá! Tenho interesse nos seguintes produtos:\n\n${blocks.join('\n\n')}\n\nTotal: ${brl(total)}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
}

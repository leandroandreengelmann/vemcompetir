'use client';

import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCartIcon, TrashIcon, WhatsappLogoIcon, PlusIcon, MinusIcon, StorefrontIcon } from '@phosphor-icons/react';
import { useCart, buildWhatsAppUrl } from './cart-context';

function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function StoreHeader() {
    const { count, store } = useCart();
    const { setOpen } = useCart();

    return (
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
                <Link href="/loja" className="flex items-center gap-2 font-bold text-lg">
                    <StorefrontIcon size={26} weight="duotone" className="text-primary" />
                    <span className="truncate">{store.storeName || 'Loja'}</span>
                </Link>
                <Button variant="outline" pill className="relative gap-2" onClick={() => setOpen(true)}>
                    <ShoppingCartIcon size={20} weight="bold" />
                    <span className="hidden sm:inline">Carrinho</span>
                    {count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                            {count}
                        </span>
                    )}
                </Button>
            </div>
            <CartDrawer />
        </header>
    );
}

function CartDrawer() {
    const { items, total, isOpen, setOpen, remove, setQty, keyOf, clear, store } = useCart();

    const canCheckout = items.length > 0 && !!store.whatsapp;
    const waUrl = store.whatsapp ? buildWhatsAppUrl(store.whatsapp, items, total) : '#';

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <ShoppingCartIcon size={22} weight="bold" /> Seu carrinho
                    </SheetTitle>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ShoppingCartIcon size={48} weight="thin" />
                        <p>Seu carrinho está vazio.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 space-y-3 overflow-y-auto py-2">
                            {items.map((i) => {
                                const k = keyOf(i);
                                const variant = [i.size, i.color].filter(Boolean).join(' · ');
                                return (
                                    <div key={k} className="flex gap-3 rounded-lg border p-2">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                                            {i.image && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-sm font-medium">{i.name}</p>
                                            {variant && <p className="text-xs text-muted-foreground">{variant}</p>}
                                            <p className="text-sm font-semibold text-primary">{formatBRL(i.price)}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-between">
                                            <button onClick={() => remove(k)} className="text-muted-foreground hover:text-destructive" title="Remover">
                                                <TrashIcon size={16} weight="bold" />
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setQty(k, i.qty - 1)} className="rounded border p-1 hover:bg-muted"><MinusIcon size={12} weight="bold" /></button>
                                                <span className="w-6 text-center text-sm">{i.qty}</span>
                                                <button onClick={() => setQty(k, i.qty + 1)} className="rounded border p-1 hover:bg-muted"><PlusIcon size={12} weight="bold" /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-3 border-t pt-3">
                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>{formatBRL(total)}</span>
                            </div>
                            {!store.whatsapp && (
                                <p className="text-xs text-destructive">Loja sem WhatsApp configurado. Não é possível finalizar.</p>
                            )}
                            <Button asChild pill className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1eb457]" disabled={!canCheckout}>
                                <a href={canCheckout ? waUrl : undefined} target="_blank" rel="noopener noreferrer">
                                    <WhatsappLogoIcon size={22} weight="fill" />
                                    Finalizar no WhatsApp
                                </a>
                            </Button>
                            <button onClick={clear} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                                Esvaziar carrinho
                            </button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

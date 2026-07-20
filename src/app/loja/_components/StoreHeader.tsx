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
    const { items, count, total, isOpen, setOpen, remove, setQty, keyOf, clear, store } = useCart();

    const canCheckout = items.length > 0 && !!store.whatsapp;
    const waUrl = store.whatsapp ? buildWhatsAppUrl(store.whatsapp, items, total) : '#';

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-4 py-4 pr-14">
                    <SheetTitle className="flex items-center gap-2">
                        <ShoppingCartIcon size={22} weight="bold" />
                        Seu carrinho
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground">
                        {count === 0
                            ? 'Nenhum item por enquanto'
                            : `${count} ${count === 1 ? 'item' : 'itens'} · ${formatBRL(total)}`}
                    </p>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                        <ShoppingCartIcon size={56} weight="thin" className="text-muted-foreground/50" />
                        <div className="space-y-1">
                            <p className="font-medium">Seu carrinho está vazio</p>
                            <p className="text-sm text-muted-foreground">
                                Escolha seus kimonos e artigos e eles aparecem aqui.
                            </p>
                        </div>
                        <Button asChild variant="outline" pill className="gap-2">
                            <Link href="/loja" onClick={() => setOpen(false)}>
                                <StorefrontIcon size={18} weight="bold" />
                                Ver produtos
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                            {items.map((i) => {
                                const k = keyOf(i);
                                const variant = [i.size, i.color].filter(Boolean).join(' · ');
                                return (
                                    <div key={k} className="flex gap-3 rounded-xl border bg-card p-3">
                                        <Link
                                            href={`/loja/produto/${i.slug}`}
                                            onClick={() => setOpen(false)}
                                            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                                        >
                                            {i.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                    <StorefrontIcon size={22} weight="thin" />
                                                </div>
                                            )}
                                        </Link>

                                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                                            <div className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        href={`/loja/produto/${i.slug}`}
                                                        onClick={() => setOpen(false)}
                                                        className="line-clamp-2 text-sm font-medium hover:underline"
                                                    >
                                                        {i.name}
                                                    </Link>
                                                    {variant && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">{variant}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => remove(k)}
                                                    title="Remover"
                                                    aria-label={`Remover ${i.name}`}
                                                    className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <TrashIcon size={16} weight="bold" />
                                                </button>
                                            </div>

                                            <div className="flex items-end justify-between gap-2">
                                                <div className="flex items-center rounded-full border">
                                                    <button
                                                        onClick={() => setQty(k, i.qty - 1)}
                                                        disabled={i.qty <= 1}
                                                        aria-label="Diminuir quantidade"
                                                        className="rounded-l-full px-2.5 py-1.5 transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                                                    >
                                                        <MinusIcon size={12} weight="bold" />
                                                    </button>
                                                    <span className="w-7 text-center text-sm font-medium tabular-nums">{i.qty}</span>
                                                    <button
                                                        onClick={() => setQty(k, i.qty + 1)}
                                                        aria-label="Aumentar quantidade"
                                                        className="rounded-r-full px-2.5 py-1.5 transition-colors hover:bg-muted"
                                                    >
                                                        <PlusIcon size={12} weight="bold" />
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    {i.qty > 1 && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {formatBRL(i.price)} cada
                                                        </p>
                                                    )}
                                                    <p className="text-sm font-semibold text-primary tabular-nums">
                                                        {formatBRL(i.price * i.qty)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-3 border-t bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {count} {count === 1 ? 'item' : 'itens'}
                                </span>
                                <span className="text-xl font-bold tabular-nums">{formatBRL(total)}</span>
                            </div>

                            {!store.whatsapp && (
                                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    Loja sem WhatsApp configurado. Não é possível finalizar o pedido.
                                </p>
                            )}

                            {canCheckout ? (
                                <Button asChild pill className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1eb457]">
                                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                        <WhatsappLogoIcon size={22} weight="fill" />
                                        Finalizar no WhatsApp
                                    </a>
                                </Button>
                            ) : (
                                <Button pill disabled className="w-full gap-2">
                                    <WhatsappLogoIcon size={22} weight="fill" />
                                    Finalizar no WhatsApp
                                </Button>
                            )}

                            <p className="text-center text-sm text-muted-foreground">
                                O pedido é combinado direto com a loja pelo WhatsApp.
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Continuar comprando
                                </button>
                                <button
                                    onClick={clear}
                                    className="rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    Esvaziar carrinho
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

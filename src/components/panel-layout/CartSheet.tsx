
'use client';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useRegistrationCart } from "@/hooks/use-registration-cart";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CircleNotchIcon, TrashIcon, ShoppingBagIcon, InfoIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { PixModal } from "./PixModal";
import { cancelPendingCartItemAction } from "@/app/(panel)/academia-equipe/dashboard/eventos/cart-actions";
import { CancelRegistrationButton } from "@/app/atleta/dashboard/inscricoes/CancelRegistrationButton";
import { formatCPF } from "@/lib/validation";

export function CartSheet() {
    const { isOpen, setOpen, items, removeItem, fetchCart, checkout, isLoading, reactivateItem } = useRegistrationCart();

    // Fetch cart on mount and when opening
    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    useEffect(() => {
        if (isOpen) {
            fetchCart();
        }
    }, [isOpen, fetchCart]);

    const [submitting, setSubmitting] = useState(false);
    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [cpf, setCpf] = useState("");
    const router = useRouter();

    // Filter only items in carrinho
    const cartItems = items.filter(i => i.status === 'carrinho');
    const pendingItems = items.filter(i => i.status === 'aguardando_pagamento');

    // Group cart items by event
    const groupedItems = cartItems.reduce((acc, item) => {
        if (!acc[item.eventId]) {
            acc[item.eventId] = {
                title: item.eventTitle || 'Evento Desconhecido',
                items: []
            };
        }
        acc[item.eventId].items.push(item);
        return acc;
    }, {} as Record<string, { title: string, items: typeof cartItems }>);

    const events = Object.entries(groupedItems);
    const total = items.reduce((acc, item) => acc + item.price, 0);

    const handlePay = async (eventId: string) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/payments/create-event-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId, payer_type: 'ACADEMY', cpf: cpf.replace(/\D/g, '') }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'Organizador do evento não possui conta Asaas aprovada.') {
                    toast.custom((t) => (
                        <div className="flex items-center gap-3 w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2 z-[100]">
                            <InfoIcon size={24} weight="duotone" className="shrink-0" />
                            <p className="text-panel-sm font-bold">{data.error}</p>
                        </div>
                    ), { duration: 6000 });
                } else {
                    toast.error(data.error || 'Erro ao criar pagamento.');
                }
                return;
            }

            if (data.free) {
                toast.success(data.message || 'Inscrições confirmadas!');
                await fetchCart();
                router.refresh();
                return;
            }

            setPixData(data);
            setPixModalOpen(true);
            await fetchCart();
        } catch (error) {
            toast.error('Erro ao processar pagamento.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-background/95 backdrop-blur-sm p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/5 p-2 rounded-full border-2 border-foreground">
                                <ShoppingBagIcon size={20} weight="duotone" className="text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <SheetTitle className="text-panel-md font-semibold">Cesta</SheetTitle>
                                <p className="text-panel-sm text-muted-foreground">
                                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} na cesta
                                    {pendingItems.length > 0 && ` • ${pendingItems.length} aguardando pagamento`}
                                </p>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden relative">
                    {cartItems.length === 0 && pendingItems.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-muted p-6 rounded-full">
                                <ShoppingBagIcon size={40} weight="duotone" className="text-muted-foreground/50" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-panel-sm font-semibold text-foreground">Sua cesta está vazia</h3>
                                <p className="text-panel-sm text-muted-foreground max-w-[200px] mx-auto">
                                    Seus itens pendentes aparecerão aqui.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setOpen(false)} className="mt-4">
                                Voltar
                            </Button>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="px-4 sm:px-6 py-4 space-y-8">
                                {/* Pending payments section */}
                                {pendingItems.length > 0 && (
                                    <div className="space-y-3 pb-6 border-b">
                                        <div className="flex items-center gap-2 py-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                                            </span>
                                            <h3 className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wide">
                                                Aguardando Pagamento ({pendingItems.length})
                                            </h3>
                                        </div>
                                        <div className="bg-muted/50 border border-border/60 rounded-lg p-3 text-panel-sm font-semibold text-foreground leading-relaxed mb-3 shadow-sm">
                                            Clique no botão <strong>Refazer</strong> para devolver a inscrição à cesta e tentar realizar o pagamento novamente.
                                        </div>
                                        {pendingItems.map((item) => (
                                            <div key={item.id} className="relative p-4 rounded-xl border border-border/50 bg-card overflow-hidden flex flex-col sm:flex-row gap-4 sm:items-center justify-between shadow-sm group">
                                                <div className="space-y-1 pl-2">
                                                    <p className="text-panel-sm font-bold leading-tight text-foreground">{item.eventTitle}</p>
                                                    <p className="text-panel-sm font-medium text-muted-foreground">{item.athleteName} - {item.categoryTitle}</p>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                    <Button
                                                        size="sm"
                                                        disabled={isLoading || submitting}
                                                        onClick={() => reactivateItem(item.id)}
                                                        className="flex-1 sm:flex-[0_auto] h-9 text-panel-sm font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 px-4 transition-colors rounded-full"
                                                    >
                                                        <ArrowCounterClockwiseIcon size={14} weight="duotone" className="mr-2" />
                                                        Refazer
                                                    </Button>
                                                    <CancelRegistrationButton
                                                        className="h-9 w-9"
                                                        onSuccess={fetchCart}
                                                        onConfirm={() => cancelPendingCartItemAction(item.id)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {events.map(([eventId, group]) => {
                                    const eventSubtotal = group.items.reduce((acc, item) => acc + item.price, 0);

                                    return (
                                        <div key={eventId} className="space-y-5 pb-6 border-b last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <h3 className="text-panel-sm font-bold text-foreground line-clamp-1">{group.title}</h3>
                                                    <p className="text-panel-sm text-muted-foreground font-medium">{group.items.length} {group.items.length === 1 ? 'item' : 'itens'}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <AnimatePresence initial={false} mode="popLayout">
                                                    {group.items.map((item) => (
                                                        <motion.div
                                                            key={item.id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border border-border shadow-sm bg-card hover:border-primary/50 transition-all"
                                                        >
                                                            <div className="flex flex-col gap-3">
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <div className="space-y-1 min-w-0 flex-1">
                                                                        <h4 className="text-panel-sm font-bold leading-tight text-foreground truncate">{item.athleteName}</h4>
                                                                        <p className="text-panel-sm text-foreground font-semibold line-clamp-2">{item.categoryTitle}</p>
                                                                    </div>
                                                                    <div className="flex-none">
                                                                        <Button pill variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10  transition-colors"
                                                                            onClick={() => removeItem(item.id)}
                                                                        >
                                                                            <TrashIcon size={16} weight="duotone" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                                                    <span className="text-panel-sm font-black text-foreground uppercase tracking-wide">Valor</span>
                                                                    <span className="text-panel-sm font-black text-primary">
                                                                        {item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'A definir'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>

                                            <div className="pt-2 space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-panel-sm font-bold text-muted-foreground uppercase">Subtotal</span>
                                                    <span className="text-panel-lg font-black tracking-tight text-foreground">
                                                        R$ {eventSubtotal.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="space-y-2 px-2">
                                                    <Label htmlFor={`cpf-${eventId}`} className="text-panel-sm font-black uppercase tracking-wide text-muted-foreground">CPF do Pagador (Obrigatório Asaas)</Label>
                                                    <Input
                                                        id={`cpf-${eventId}`}
                                                        placeholder="000.000.000-00"
                                                        value={cpf}
                                                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                                                        maxLength={14}
                                                        className="rounded-xl h-10 text-panel-sm bg-background"
                                                    />
                                                </div>

                                                <Button pill size="lg"
                                                    className="w-full font-bold shadow-md hover:shadow-lg transition-all h-12 text-panel-sm px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => handlePay(eventId)}
                                                    disabled={submitting || isLoading || !cpf}
                                                >
                                                    {submitting ? <CircleNotchIcon size={20} weight="bold" className="animate-spin" /> : (
                                                        <span className="truncate">Pagar {group.title}</span>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {(cartItems.length > 0 || pendingItems.length > 0) && (
                    <div className="flex-none p-6 bg-background border-t">
                        <Button pill variant="outline"
                            className="w-full  h-12 font-semibold"
                            onClick={() => setOpen(false)}
                        >
                            Continuar Comprando
                        </Button>
                    </div>
                )}
            </SheetContent>

            <PixModal
                open={pixModalOpen}
                onClose={() => {
                    setPixModalOpen(false);
                    fetchCart();
                    router.refresh(); // Refresh page data on close
                }}
                pixData={pixData}
            />
        </Sheet>
    );
}

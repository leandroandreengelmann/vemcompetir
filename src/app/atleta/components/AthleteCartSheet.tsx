'use client';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAthleteCart } from "@/hooks/use-athlete-cart";
import { TrashIcon, ShoppingBagIcon, CreditCardIcon, InfoIcon, ArrowCounterClockwiseIcon, GiftIcon, PackageIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { showToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { PixModal } from "@/components/panel-layout/PixModal";
import { CancelRegistrationButton } from "@/app/atleta/dashboard/inscricoes/CancelRegistrationButton";
import { cancelPendingRegistrationAction } from "@/app/atleta/dashboard/campeonatos/athlete-cart-actions";
import { TermsAcceptanceModal } from "@/components/terms/TermsAcceptanceModal";
import { checkTermsAcceptanceAction } from "@/app/atleta/components/terms-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

export function AthleteCartSheet() {
    const { isOpen, setOpen, items, removeItem, reactivateItem, fetchCart, isLoading } = useAthleteCart();

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    useEffect(() => {
        if (isOpen) fetchCart();
    }, [isOpen, fetchCart]);

    const [submitting, setSubmitting] = useState(false);
    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [confirmComboRemoveId, setConfirmComboRemoveId] = useState<string | null>(null);
    const [termsEventId, setTermsEventId] = useState<string | null>(null);
    const router = useRouter();

    // Filter only items in carrinho (exclude aguardando_pagamento)
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

    const doPayment = async (eventId: string) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/payments/create-event-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId, payer_type: 'ATHLETE' }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'Organizador do evento não possui conta Asaas aprovada.') {
                    showToast.warning(
                        'Pagamento indisponível',
                        'O organizador deste evento ainda não concluiu o cadastro Asaas. Tente mais tarde ou fale com o organizador.'
                    );
                } else {
                    showToast.error('Não foi possível criar o pagamento', data.error);
                }
                return;
            }

            if (data.free) {
                showToast.success('Inscrições confirmadas', data.message);
                await fetchCart();
                router.refresh();
                return;
            }

            setPixData(data);
            setPixModalOpen(true);
            await fetchCart();
        } catch (error) {
            showToast.error('Falha ao processar pagamento', 'Verifique sua conexão e tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePay = async (eventId: string) => {
        const hasAccepted = await checkTermsAcceptanceAction(eventId);
        if (!hasAccepted) {
            setTermsEventId(eventId);
            return;
        }
        await doPayment(eventId);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-background/95 backdrop-blur-sm p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-background border-2 border-primary shrink-0">
                                <ShoppingBagIcon size={20} weight="duotone" className="text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <SheetTitle className="text-panel-lg">Minha Cesta</SheetTitle>
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
                                <h3 className="font-semibold text-foreground">Sua cesta está vazia</h3>
                                <p className="text-panel-sm text-muted-foreground max-w-[200px] mx-auto">
                                    Explore os campeonatos e adicione categorias à sua cesta.
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
                                            <h3 className="font-bold text-panel-sm text-muted-foreground uppercase tracking-wide">
                                                Aguardando Pagamento ({pendingItems.length})
                                            </h3>
                                        </div>
                                        <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-blue-800">
                                            <InfoIcon size={16} weight="duotone" className="shrink-0 mt-0.5 text-blue-500" />
                                            <p className="text-panel-sm font-semibold leading-relaxed">
                                                Clique em <strong>Refazer</strong> para devolver a inscrição à cesta e tentar o pagamento novamente.
                                            </p>
                                        </div>
                                        {pendingItems.some(i => i.promoTypeApplied === 'combo_bundle') && (
                                            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800">
                                                <InfoIcon size={16} weight="duotone" className="shrink-0 mt-0.5 text-amber-500" />
                                                <p className="text-panel-sm font-semibold leading-relaxed">
                                                    Você tem categorias do <strong>Combo 4x1</strong> aguardando. Se reativar apenas algumas delas, o desconto será cancelado e todas voltarão ao valor cheio.
                                                </p>
                                            </div>
                                        )}
                                        {pendingItems.some(i => i.promoSourceId) && (
                                            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800">
                                                <InfoIcon size={16} weight="duotone" className="shrink-0 mt-0.5 text-amber-500" />
                                                <p className="text-panel-sm font-semibold leading-relaxed">
                                                    Você tem uma categoria gratuita aguardando. Para reativar os dois itens de uma vez, clique em <strong>Refazer</strong> na categoria Absoluto correspondente.
                                                </p>
                                            </div>
                                        )}
                                        {pendingItems.map((item) => (
                                            <div key={item.id} className="relative p-4 rounded-xl border border-border/50 bg-card overflow-hidden flex flex-col sm:flex-row gap-4 sm:items-center justify-between shadow-sm group">
                                                <div className="space-y-1 pl-2">
                                                    <p className="text-panel-sm font-bold leading-tight text-foreground">{item.eventTitle}</p>
                                                    <p className="text-panel-sm font-medium text-muted-foreground">{item.categoryTitle}</p>
                                                    {item.promoSourceId && (
                                                        <span className="inline-flex items-center gap-1 text-panel-sm font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                            <GiftIcon size={12} weight="duotone" /> Grátis com Absoluto
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    {!item.promoSourceId && (
                                                        <Button
                                                            size="sm"
                                                            disabled={isLoading || submitting}
                                                            onClick={() => reactivateItem(item.id)}
                                                            className="flex-1 sm:flex-none h-9 text-panel-sm font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 px-4 transition-colors"
                                                        >
                                                            <ArrowCounterClockwiseIcon size={14} weight="duotone" className="mr-2" />
                                                            Refazer
                                                        </Button>
                                                    )}
                                                    <CancelRegistrationButton
                                                        className="h-9 w-9"
                                                        onSuccess={fetchCart}
                                                        onConfirm={() => cancelPendingRegistrationAction(item.id)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Cart items by event */}
                                {events.map(([eventId, group]) => {
                                    const eventSubtotal = group.items.reduce((acc, item) => acc + item.price, 0);
                                    const hasCompanion = group.items.some(i => i.promoSourceId);
                                    const hasCombo = group.items.some(i => i.promoTypeApplied === 'combo_bundle');

                                    return (
                                        <div key={eventId} className="space-y-5 pb-6 border-b last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <h3 className="font-bold text-panel-md text-foreground line-clamp-1">{group.title}</h3>
                                                    <p className="text-panel-sm text-muted-foreground font-medium">
                                                        {group.items.length} {group.items.length === 1 ? 'inscrição' : 'inscrições'}
                                                    </p>
                                                </div>
                                            </div>

                                            {hasCompanion && (
                                                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-emerald-800">
                                                    <GiftIcon size={16} weight="duotone" className="shrink-0 mt-0.5 text-emerald-500" />
                                                    <p className="text-panel-sm font-semibold leading-relaxed">
                                                        Uma categoria foi adicionada <strong>gratuitamente</strong> com sua inscrição no Absoluto. Se você remover o Absoluto, o benefício também será removido.
                                                    </p>
                                                </div>
                                            )}

                                            {hasCombo && (
                                                <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-indigo-800">
                                                    <PackageIcon size={16} weight="duotone" className="shrink-0 mt-0.5 text-indigo-500" />
                                                    <p className="text-panel-sm font-semibold leading-relaxed">
                                                        <strong>Combo 4 categorias ativado!</strong> Você está pagando o valor promocional em todas as 4 categorias. Se remover qualquer uma delas, o desconto será desfeito.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <AnimatePresence initial={false} mode="popLayout">
                                                    {group.items.map((item) => (
                                                        <motion.div
                                                            key={item.id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border shadow-sm bg-card hover:border-primary/50 transition-all"
                                                        >
                                                            <div className="flex flex-col gap-3">
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <div className="space-y-1 min-w-0 flex-1">
                                                                        <p className="text-panel-sm text-foreground font-semibold line-clamp-2">{item.categoryTitle}</p>
                                                                        {item.promoTypeApplied === 'free_second_registration' && (
                                                                            <span className="inline-flex items-center gap-1 text-panel-sm font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                                <GiftIcon size={12} weight="duotone" /> Grátis com Absoluto
                                                                            </span>
                                                                        )}
                                                                        {item.promoTypeApplied === 'combo_bundle' && (
                                                                            <span className="inline-flex items-center gap-1 text-panel-sm font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                                                <PackageIcon size={12} weight="duotone" /> Combo 4x1
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-none">
                                                                        {item.promoSourceId ? (
                                                                            <TooltipProvider delayDuration={200}>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Button pill variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                                            onClick={() => setConfirmRemoveId(item.id)}
                                                                                        >
                                                                                            <TrashIcon size={16} weight="duotone" />
                                                                                        </Button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent side="left" className="max-w-[200px] text-center">
                                                                                        Você perderá o benefício grátis ao remover esta categoria
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        ) : item.promoTypeApplied === 'combo_bundle' ? (
                                                                            <Button pill variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                                onClick={() => setConfirmComboRemoveId(item.id)}
                                                                            >
                                                                                <TrashIcon size={16} weight="duotone" />
                                                                            </Button>
                                                                        ) : (
                                                                            <Button pill variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                                onClick={() => removeItem(item.id)}
                                                                            >
                                                                                <TrashIcon size={16} weight="duotone" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                                                    <span className="text-panel-sm font-bold text-foreground uppercase tracking-wide">Valor</span>
                                                                    <span className={`text-panel-sm font-bold ${
                                                                        item.promoTypeApplied === 'free_second_registration'
                                                                            ? 'text-emerald-600'
                                                                            : item.promoTypeApplied === 'combo_bundle'
                                                                                ? 'text-indigo-600'
                                                                                : 'text-primary'
                                                                    }`}>
                                                                        {item.promoTypeApplied === 'free_second_registration'
                                                                            ? 'GRÁTIS'
                                                                            : item.promoTypeApplied === 'combo_bundle'
                                                                                ? `R$ ${item.price.toFixed(2)} (Combo)`
                                                                                : item.price > 0
                                                                                    ? `R$ ${item.price.toFixed(2)}`
                                                                                    : 'A definir'}
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
                                                    <span className="text-panel-lg font-bold tracking-tight text-foreground">
                                                        R$ {eventSubtotal.toFixed(2)}
                                                    </span>
                                                </div>

                                                <Button pill size="lg"
                                                    className="w-full font-bold shadow-md hover:shadow-lg transition-all h-12 text-panel-sm px-2 text-white"
                                                    onClick={() => handlePay(eventId)}
                                                    disabled={submitting || isLoading}
                                                >
                                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
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
                            Continuar Vendo Campeonatos
                        </Button>
                    </div>
                )}
            </SheetContent>

            <TermsAcceptanceModal
                open={!!termsEventId}
                eventId={termsEventId ?? ''}
                onAccepted={async () => {
                    const id = termsEventId!;
                    setTermsEventId(null);
                    await doPayment(id);
                }}
                onCancel={() => setTermsEventId(null)}
            />

            <PixModal
                open={pixModalOpen}
                onClose={() => {
                    setPixModalOpen(false);
                    fetchCart();
                    router.refresh();
                }}
                pixData={pixData}
            />

            <Dialog open={!!confirmComboRemoveId} onOpenChange={(open) => { if (!open) setConfirmComboRemoveId(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackageIcon size={20} weight="duotone" className="text-indigo-500" />
                            Perder o desconto combo?
                        </DialogTitle>
                        <DialogDescription className="text-panel-sm leading-relaxed pt-1">
                            Ao remover esta categoria, o <strong>Combo 4x1 será desfeito</strong> e todas as outras categorias voltarão ao valor cheio de inscrição.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmComboRemoveId(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (confirmComboRemoveId) removeItem(confirmComboRemoveId);
                                setConfirmComboRemoveId(null);
                            }}
                        >
                            Sim, remover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmRemoveId} onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GiftIcon size={20} weight="duotone" className="text-emerald-500" />
                            Remover categoria gratuita?
                        </DialogTitle>
                        <DialogDescription className="text-panel-sm leading-relaxed pt-1">
                            Esta categoria foi adicionada <strong>gratuitamente</strong> ao comprar a categoria Absoluto. Ao removê-la, você abre mão do benefício. O Absoluto permanece na sua sacola.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (confirmRemoveId) removeItem(confirmRemoveId);
                                setConfirmRemoveId(null);
                            }}
                        >
                            Sim, remover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}

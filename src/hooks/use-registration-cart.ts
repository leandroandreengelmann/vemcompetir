import { create } from 'zustand';
import { addToCartAction, removeFromCartAction, getCartItemsAction, checkoutCartAction, reactivateCartItemAction } from '@/app/(panel)/academia-equipe/dashboard/eventos/cart-actions';
import { formatFullCategoryName } from '@/lib/category-utils';
import { toast } from 'sonner';

export interface CartItem {
    id: string; // registration id
    eventId: string;
    eventTitle?: string;
    athleteId: string;
    athleteName: string;
    categoryId: string;
    categoryTitle: string;
    price: number;
    status: string;
    promoTypeApplied?: string | null;
    promoSourceId?: string | null;
}

interface RegistrationCartState {
    items: CartItem[];
    isOpen: boolean;
    isLoading: boolean;
    setOpen: (open: boolean) => void;
    fetchCart: () => Promise<void>;
    addItem: (item: Omit<CartItem, 'id' | 'status'>) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    checkout: (eventIds?: string[]) => Promise<void>;
    reactivateItem: (id: string) => Promise<void>;
}

export const useRegistrationCart = create<RegistrationCartState>((set, get) => ({
    items: [],
    isOpen: false,
    isLoading: false,
    setOpen: (open) => set({ isOpen: open }),

    fetchCart: async () => {
        set({ isLoading: true });
        try {
            const data = await getCartItemsAction();
            // Map DB data to CartItem. 
            // Note: Price is missing from DB currently. We might need to fetch it or default to 0.
            // For now, we'll map what we have.
            const items: CartItem[] = data.map((d: any) => ({
                id: d.id,
                eventId: d.event_id,
                eventTitle: d.event?.title,
                athleteId: d.athlete_id || '',
                athleteName: d.athlete?.full_name || 'Desconhecido',
                categoryId: d.category_id || '',
                categoryTitle: d.category ? formatFullCategoryName({
                    categoria_completa: d.category.categoria_completa,
                    faixa: d.category.faixa,
                    divisao: d.category.divisao_idade,
                    peso: d.category.categoria_peso,
                    categoria_peso: d.category.categoria_peso,
                    peso_min_kg: d.category.peso_min_kg,
                    peso_max_kg: d.category.peso_max_kg
                }) : 'Categoria Desconhecida',
                price: Number(d.price) || 0, // Read price from DB
                status: d.status,
                promoTypeApplied: d.promo_type_applied ?? null,
                promoSourceId: d.promo_source_id ?? null,
            }));
            set({ items });
        } catch (error) {
            console.error('Failed to fetch cart', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addItem: async (item) => {
        set({ isLoading: true });
        try {
            const result = await addToCartAction({
                eventId: item.eventId,
                athleteId: item.athleteId,
                categoryId: item.categoryId,
                price: item.price
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            await get().fetchCart(); // Refresh cart
            set({ isOpen: true });

            if ((result as any).companionAdded) {
                toast.success(`Categoria gratuita adicionada: ${(result as any).companionName}`);
            } else if ((result as any).companionWarning) {
                toast.warning((result as any).companionWarning);
            }
        } catch (error) {
            toast.error('Erro ao adicionar');
        } finally {
            set({ isLoading: false });
        }
    },

    removeItem: async (id) => {
        // Optimistic update — also remove any companion granted by this item
        const currentItems = get().items;
        set({ items: currentItems.filter(i => i.id !== id && i.promoSourceId !== id) });

        try {
            const result = await removeFromCartAction(id);
            if (result.error) {
                toast.error(result.error);
                set({ items: currentItems }); // Revert
                return;
            }
        } catch (error) {
            toast.error('Erro ao remover');
            set({ items: currentItems }); // Revert
        }
    },

    checkout: async (eventIds) => {
        set({ isLoading: true });
        try {
            const result = await checkoutCartAction(eventIds);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success('Inscrições realizadas com sucesso!');
            await get().fetchCart();
            set({ isOpen: false });
        } catch (error) {
            toast.error('Erro ao finalizar');
        } finally {
            set({ isLoading: false });
        }
    },

    reactivateItem: async (id) => {
        set({ isLoading: true });
        try {
            const result = await reactivateCartItemAction(id);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            await get().fetchCart();
        } catch (error) {
            toast.error('Erro ao reativar item');
        } finally {
            set({ isLoading: false });
        }
    }
}));

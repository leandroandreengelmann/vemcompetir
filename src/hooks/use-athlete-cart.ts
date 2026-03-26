import { create } from 'zustand';
import {
    getAthleteCartAction,
    addToAthleteCartAction,
    removeFromAthleteCartAction,
    reactivateAthleteCartItemAction,
} from '@/app/atleta/dashboard/campeonatos/athlete-cart-actions';
import { formatFullCategoryName } from '@/lib/category-utils';

interface AthleteCartItem {
    id: string;
    eventId: string;
    eventTitle: string;
    athleteId: string;
    categoryId: string;
    categoryTitle: string;
    price: number;
    status: string;
    promoTypeApplied: string | null;
    promoSourceId: string | null;
}

interface AthleteCartState {
    items: AthleteCartItem[];
    isOpen: boolean;
    isLoading: boolean;
    setOpen: (open: boolean) => void;
    fetchCart: () => Promise<void>;
    addItem: (item: { eventId: string; categoryId: string; price: number }) => Promise<void>;
    removeItem: (registrationId: string) => Promise<void>;
    reactivateItem: (registrationId: string) => Promise<void>;
}

export const useAthleteCart = create<AthleteCartState>((set, get) => ({
    items: [],
    isOpen: false,
    isLoading: false,
    setOpen: (open) => set({ isOpen: open }),

    fetchCart: async () => {
        set({ isLoading: true });
        try {
            const data = await getAthleteCartAction();
            const items: AthleteCartItem[] = data.map((d: any) => ({
                id: d.id,
                eventId: d.event_id,
                eventTitle: d.event?.title || 'Evento Desconhecido',
                athleteId: d.athlete_id || '',
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
                price: Number(d.price) || 0,
                status: d.status,
                promoTypeApplied: d.promo_type_applied || null,
                promoSourceId: d.promo_source_id || null,
            }));
            set({ items });
        } catch (error) {
            console.error('Failed to fetch athlete cart', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addItem: async (item) => {
        try {
            const result = await addToAthleteCartAction(item);
            await get().fetchCart();
            // Surface companion warning to the caller (UI can toast it)
            if (result?.companionWarning) {
                throw Object.assign(new Error(result.companionWarning), { isWarning: true });
            }
        } catch (error: any) {
            if (error?.isWarning) throw error;
            console.error('Failed to add to athlete cart', error);
            throw error;
        }
    },

    removeItem: async (registrationId) => {
        // Optimistically remove the item AND any companion sponsored by it
        set((state) => ({
            items: state.items.filter(
                (i) => i.id !== registrationId && i.promoSourceId !== registrationId
            ),
        }));
        try {
            await removeFromAthleteCartAction(registrationId);
            await get().fetchCart();
        } catch (error) {
            console.error('Failed to remove from athlete cart', error);
            await get().fetchCart();
        }
    },

    reactivateItem: async (registrationId) => {
        set({ isLoading: true });
        try {
            await reactivateAthleteCartItemAction(registrationId);
            await get().fetchCart();
        } catch (error) {
            console.error('Failed to reactivate athlete cart item', error);
            set({ isLoading: false });
            throw error;
        }
    },
}));

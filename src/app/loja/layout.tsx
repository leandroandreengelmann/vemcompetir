import { createClient } from '@/lib/supabase/server';
import { StorefrontIcon } from '@phosphor-icons/react/dist/ssr';
import { CartProvider } from './_components/cart-context';
import { StoreHeader } from './_components/StoreHeader';

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: settings } = await supabase
        .from('store_settings')
        .select('store_name, whatsapp_number, is_enabled')
        .limit(1)
        .maybeSingle();

    const enabled = !!settings?.is_enabled;

    if (!enabled) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                <StorefrontIcon size={56} weight="duotone" className="text-muted-foreground" />
                <h1 className="text-2xl font-bold">Loja em breve</h1>
                <p className="max-w-sm text-muted-foreground">
                    Nossa loja está sendo preparada. Volte em instantes!
                </p>
            </div>
        );
    }

    return (
        <CartProvider store={{ whatsapp: settings?.whatsapp_number ?? null, storeName: settings?.store_name ?? null }}>
            <div className="min-h-screen bg-muted/20">
                <StoreHeader />
                <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
                <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-muted-foreground">
                    {settings?.store_name || 'Loja'} · Vem Competir
                </footer>
            </div>
        </CartProvider>
    );
}

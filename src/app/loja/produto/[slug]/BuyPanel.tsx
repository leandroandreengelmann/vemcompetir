'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, ShoppingCartIcon, WhatsappLogoIcon } from '@phosphor-icons/react';
import { formatBRL } from '@/lib/store';
import { useCart, buildWhatsAppUrl } from '../../_components/cart-context';

export type BuyProduct = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price: number;
    promo_price: number | null;
    images: string[];
    sizes: string[];
    colors: string[];
};

export function BuyPanel({ product }: { product: BuyProduct }) {
    const { add, store } = useCart();
    const [mainImg, setMainImg] = useState(product.images[0] ?? null);
    const [size, setSize] = useState<string | null>(null);
    const [color, setColor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const eff = useMemo(() => {
        if (product.promo_price != null && product.promo_price > 0 && product.promo_price < product.price) {
            return product.promo_price;
        }
        return product.price;
    }, [product]);
    const hasPromo = eff < product.price;

    function validate(): boolean {
        if (product.sizes.length > 0 && !size) { setError('Selecione o tamanho.'); return false; }
        if (product.colors.length > 0 && !color) { setError('Selecione a cor.'); return false; }
        setError(null);
        return true;
    }

    function cartItem() {
        return {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: eff,
            image: product.images[0] ?? null,
            size,
            color,
        };
    }

    function addToCart() {
        if (!validate()) return;
        add(cartItem());
    }

    function buyNow() {
        if (!validate()) return;
        if (!store.whatsapp) { setError('Loja sem WhatsApp configurado.'); return; }
        const url = buildWhatsAppUrl(store.whatsapp, [{ ...cartItem(), qty: 1 }], eff);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Galeria */}
            <div className="space-y-3">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-muted">
                    {mainImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainImg} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                        <ImageIcon size={56} className="absolute inset-0 m-auto text-muted-foreground" />
                    )}
                </div>
                {product.images.length > 1 && (
                    <div className="grid grid-cols-5 gap-2">
                        {product.images.map((src) => (
                            <button
                                key={src}
                                onClick={() => setMainImg(src)}
                                className={`aspect-square overflow-hidden rounded-lg border-2 ${mainImg === src ? 'border-primary' : 'border-transparent'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt="" className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info + compra */}
            <div className="space-y-5">
                <div>
                    <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
                    <div className="mt-2 flex items-baseline gap-3">
                        {hasPromo && <span className="text-lg text-muted-foreground line-through">{formatBRL(product.price)}</span>}
                        <span className="text-3xl font-extrabold text-primary">{formatBRL(eff)}</span>
                    </div>
                </div>

                {product.sizes.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Tamanho</p>
                        <div className="flex flex-wrap gap-2">
                            {product.sizes.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setSize(s); setError(null); }}
                                    className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${size === s ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {product.colors.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Cor</p>
                        <div className="flex flex-wrap gap-2">
                            {product.colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setError(null); }}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${color === c ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button size="lg" pill variant="outline" className="flex-1 gap-2" onClick={addToCart}>
                        <ShoppingCartIcon size={20} weight="bold" />
                        Adicionar
                    </Button>
                    <Button size="lg" pill className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#1eb457]" onClick={buyNow}>
                        <WhatsappLogoIcon size={22} weight="fill" />
                        Comprar
                    </Button>
                </div>

                {product.description && (
                    <div className="space-y-1 border-t pt-4">
                        <p className="text-sm font-medium">Descrição</p>
                        <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

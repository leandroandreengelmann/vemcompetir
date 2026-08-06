import Link from 'next/link';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr';
import { storeImageUrl, formatBRL, effectivePrice } from '@/lib/store';

export type ProductCardData = {
    slug: string;
    name: string;
    price: number;
    promo_price: number | null;
    image: string | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
    const img = storeImageUrl(p.image);
    const eff = effectivePrice(p);
    const hasPromo = eff < p.price;

    return (
        <Link
            href={`/loja/produto/${p.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/40"
        >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={img}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                )}
                <ImageIcon size={40} className={`absolute inset-0 m-auto text-muted-foreground ${img ? 'hidden' : ''}`} />
                {hasPromo && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                        Promoção
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</h3>
                <div className="mt-auto pt-1">
                    {hasPromo && <span className="mr-2 text-xs text-muted-foreground line-through">{formatBRL(p.price)}</span>}
                    <span className={`text-base font-bold ${hasPromo ? 'text-primary' : ''}`}>{formatBRL(eff)}</span>
                </div>
            </div>
        </Link>
    );
}

import Link from 'next/link';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { storeImageUrl, formatBRL, effectivePrice, type StoreProduct } from '@/lib/store';

export type HomeProductCardData = Pick<StoreProduct, 'slug' | 'name' | 'price' | 'promo_price'> & {
    image: string | null;
};

/**
 * Card de produto para a vitrine da home pública — mesma linguagem visual
 * do EventCard (grid de eventos): imagem quadrada com zoom no hover,
 * cantos quase retos, sombra que cresce no hover e CTA em pílula.
 */
export function HomeProductCard({ p }: { p: HomeProductCardData }) {
    const img = storeImageUrl(p.image);
    const eff = effectivePrice(p);
    const hasPromo = eff < p.price;

    return (
        <Link href={`/loja/produto/${p.slug}`} className="block h-full">
            <Card className="overflow-hidden group flex flex-col h-full border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 rounded-[7px] p-0 gap-0 bg-white cursor-pointer">
                <CardHeader className="p-0 border-0">
                    <div className="relative aspect-square w-full overflow-hidden bg-muted/50">
                        {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={img}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        )}
                        <ImageIcon size={40} className={`absolute inset-0 m-auto text-muted-foreground/20 ${img ? 'hidden' : ''}`} />
                        {hasPromo && (
                            <div className="absolute top-3 left-3 inline-flex items-center px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg">
                                Promoção
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 flex-1 space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-primary transition-colors duration-300">
                        {p.name}
                    </h3>
                    <div className="flex items-baseline gap-2 pt-1">
                        {hasPromo && (
                            <span className="text-xs sm:text-sm text-muted-foreground line-through">{formatBRL(p.price)}</span>
                        )}
                        <span className={`text-lg sm:text-xl font-black tabular-nums ${hasPromo ? 'text-primary' : 'text-foreground'}`}>
                            {formatBRL(eff)}
                        </span>
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 sm:p-5 sm:pt-0">
                    <Button
                        variant="outline"
                        pill
                        className="h-9 sm:h-10 text-sm font-bold w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all gap-1.5"
                    >
                        Ver produto
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { StorefrontIcon } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HomeProductCard, type HomeProductCardData } from './HomeProductCard';

interface ProductsCarouselProps {
    products: HomeProductCardData[];
}

/**
 * Vitrine de produtos da loja na home pública.
 * Mostra vários produtos por vez (4 no desktop, 2 no tablet, 1 no celular)
 * e passa sozinha — mesma mecânica de arrastar/pausar/dots do HeroBanners,
 * com os cards no mesmo padrão visual do grid de eventos.
 */
export function ProductsCarousel({ products }: ProductsCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
        Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }),
    ]);
    const [selected, setSelected] = useState(0);
    const [snapCount, setSnapCount] = useState(0);

    useEffect(() => {
        if (!emblaApi) return;
        const onChange = () => {
            setSelected(emblaApi.selectedScrollSnap());
            setSnapCount(emblaApi.scrollSnapList().length);
        };
        onChange();
        emblaApi.on('select', onChange);
        emblaApi.on('reInit', onChange);
        return () => { emblaApi.off('select', onChange); emblaApi.off('reInit', onChange); };
    }, [emblaApi]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

    if (products.length === 0) return null;

    const showControls = snapCount > 1;

    return (
        <section className="bg-muted/30 border-y border-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 sm:mb-12">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-primary font-bold text-xs sm:text-sm uppercase tracking-widest">
                            <StorefrontIcon size={20} weight="duotone" />
                            Loja oficial
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                            Equipamentos pra você competir
                        </h2>
                    </div>

                    <Button asChild variant="outline" pill className="h-10 sm:h-11 font-bold shrink-0 gap-1.5 w-fit">
                        <Link href="/loja">
                            Ver loja completa
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <div className="relative">
                    <div ref={emblaRef} className="overflow-hidden">
                        <div className="flex -ml-4 sm:-ml-6">
                            {products.map((p) => (
                                <div
                                    key={p.slug}
                                    className="min-w-0 shrink-0 grow-0 basis-[78%] sm:basis-1/2 lg:basis-1/4 pl-4 sm:pl-6"
                                >
                                    <HomeProductCard p={p} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {showControls && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-lg"
                                pill
                                onClick={scrollPrev}
                                aria-label="Produtos anteriores"
                                className="hidden sm:flex absolute left-0 top-[38%] -translate-y-1/2 -translate-x-5 bg-white shadow-lg border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-lg"
                                pill
                                onClick={scrollNext}
                                aria-label="Próximos produtos"
                                className="hidden sm:flex absolute right-0 top-[38%] -translate-y-1/2 translate-x-5 bg-white shadow-lg border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                </div>

                {showControls && (
                    <div className="flex justify-center gap-2 mt-8 sm:mt-10">
                        {Array.from({ length: snapCount }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => scrollTo(i)}
                                aria-label={`Ir para o grupo ${i + 1}`}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    i === selected ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-primary/40',
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

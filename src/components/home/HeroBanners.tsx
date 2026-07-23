'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { HERO_OVERLAY_CLASSES, type HeroBannerOverlay } from '@/lib/hero-banners';

export interface HeroBannerSlide {
    id: string;
    title: string | null;
    subtitle: string | null;
    imageUrl: string;
    /** Imagem quadrada (1080×1080) exibida no celular; sem ela, usa a de desktop. */
    imageUrlMobile: string | null;
    linkUrl: string | null;
    overlayStyle: HeroBannerOverlay;
}

function Slide({ banner, isFirst }: { banner: HeroBannerSlide; isFirst: boolean }) {
    const overlay = HERO_OVERLAY_CLASSES[banner.overlayStyle];
    const TitleTag = isFirst ? 'h1' : 'h2';

    const hasMobile = !!banner.imageUrlMobile;

    const content = (
        <div
            className={cn(
                'relative w-full overflow-hidden bg-primary',
                // Com imagem de celular: quadrado no mobile, 3:1 do sm pra cima. Sem ela: sempre 3:1.
                hasMobile ? 'aspect-square sm:aspect-[3/1]' : 'aspect-[3/1]',
            )}
        >
            {hasMobile && (
                <Image
                    src={banner.imageUrlMobile!}
                    alt={banner.title || 'Banner'}
                    fill
                    sizes="100vw"
                    priority={isFirst}
                    className="object-cover sm:hidden"
                />
            )}
            <Image
                src={banner.imageUrl}
                alt={banner.title || 'Banner'}
                fill
                sizes="100vw"
                priority={isFirst && !hasMobile}
                className={cn('object-cover', hasMobile && 'hidden sm:block')}
            />
            {overlay && <div className={cn('absolute inset-0', overlay)} aria-hidden="true" />}
            {(banner.title || banner.subtitle) && (
                <div className="absolute inset-x-0 bottom-0 pb-3 sm:pb-8 md:pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="max-w-3xl space-y-1 sm:space-y-3 md:space-y-4">
                            {banner.title && (
                                <TitleTag className="text-lg sm:text-4xl md:text-6xl font-bold tracking-tight sm:tracking-tighter leading-tight sm:leading-[1.05] text-white drop-shadow-md">
                                    {banner.title}
                                </TitleTag>
                            )}
                            {banner.subtitle && (
                                <p className="text-xs sm:text-lg md:text-2xl text-white/85 max-w-2xl leading-snug sm:leading-relaxed drop-shadow line-clamp-2">
                                    {banner.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (banner.linkUrl) {
        return (
            <Link href={banner.linkUrl} className="block" aria-label={banner.title || 'Banner'}>
                {content}
            </Link>
        );
    }
    return content;
}

function Carousel({ banners, intervalMs }: { banners: HeroBannerSlide[]; intervalMs: number }) {
    // stopOnInteraction: false → interações (setas, dots, arrastar) apenas reiniciam o
    // cronômetro; o carrossel nunca para de vez. Hover pausa e retoma ao sair.
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
        Autoplay({ delay: intervalMs, stopOnInteraction: false, stopOnMouseEnter: true }),
    ]);
    const [selected, setSelected] = useState(0);

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect); };
    }, [emblaApi]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

    return (
        <div className="relative">
            <div ref={emblaRef} className="overflow-hidden">
                <div className="flex">
                    {banners.map((banner, i) => (
                        <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
                            <Slide banner={banner} isFirst={i === 0} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Setas (desktop) */}
            <button
                type="button"
                onClick={scrollPrev}
                aria-label="Banner anterior"
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            >
                <CaretLeftIcon size={20} weight="bold" />
            </button>
            <button
                type="button"
                onClick={scrollNext}
                aria-label="Próximo banner"
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            >
                <CaretRightIcon size={20} weight="bold" />
            </button>

            {/* Dots */}
            <div className="absolute inset-x-0 bottom-2.5 sm:bottom-4 flex justify-center gap-2">
                {banners.map((banner, i) => (
                    <button
                        key={banner.id}
                        type="button"
                        onClick={() => scrollTo(i)}
                        aria-label={`Ir para banner ${i + 1}`}
                        className={cn(
                            'h-1.5 rounded-full transition-all',
                            i === selected ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70',
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

export function HeroBanners({ banners, intervalSeconds = 5 }: { banners: HeroBannerSlide[]; intervalSeconds?: number }) {
    if (banners.length === 0) return null;

    return (
        <section
            data-testid="hero-banners"
            aria-roledescription="carousel"
            aria-label="Destaques"
            className="pt-16 sm:pt-[var(--header-height,90px)]"
        >
            {banners.length === 1
                ? <Slide banner={banners[0]} isFirst />
                : <Carousel banners={banners} intervalMs={intervalSeconds * 1000} />}
        </section>
    );
}

import Link from 'next/link';
import { sponsorLogoUrl, type Sponsor } from '@/lib/sponsors';

interface SponsorsProps {
    title: string;
    sponsors: Sponsor[];
}

/**
 * Bloco público de parceiros/patrocinadores na home.
 * Cada logo entra numa caixa de tamanho IDÊNTICO; a imagem usa object-contain,
 * então ajusta-se sem distorcer, deixando todas visualmente uniformes
 * independentemente das dimensões do arquivo enviado.
 */
export function Sponsors({ title, sponsors }: SponsorsProps) {
    if (!sponsors.length) return null;

    return (
        <section className="border-t border-border/50 bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 sm:mb-10">
                    {title}
                </h2>

                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                    {sponsors.map((s) => {
                        const box = (
                            <div className="flex h-40 w-full items-center justify-center rounded-xl bg-white p-4 transition-transform hover:scale-105 sm:h-52 md:h-60">
                                <img
                                    src={sponsorLogoUrl(s.logo_path)}
                                    alt={s.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        );

                        // Largura fixa por logo → quebra linha e centraliza a última fila.
                        const itemWidth = 'w-[calc(50%-0.5rem)] sm:w-64 md:w-72 lg:w-80';

                        return (
                            <Link
                                key={s.id}
                                href={`/parceiros/${s.slug}`}
                                title={s.name}
                                className={`block ${itemWidth}`}
                            >
                                {box}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

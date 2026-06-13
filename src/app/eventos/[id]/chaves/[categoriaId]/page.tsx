import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { GeBracket } from '@/components/gestao-evento/GeBracket';
import { getEventoPublico, getChavePublica } from '@/lib/public/chaves-publicas';

export const revalidate = 30;

interface PageProps {
    params: Promise<{ id: string; categoriaId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id, categoriaId } = await params;
    const categoryName = decodeURIComponent(categoriaId);
    const evento = await getEventoPublico(id);
    return {
        title: evento ? `${categoryName} — ${evento.title}` : categoryName,
    };
}

export default async function ChavePublicaPage({ params }: PageProps) {
    const { id, categoriaId } = await params;
    const categoryName = decodeURIComponent(categoriaId);

    const [evento, chave] = await Promise.all([
        getEventoPublico(id),
        getChavePublica(id, categoryName),
    ]);

    if (!evento || !chave) notFound();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PublicHeader />
            <main className="flex-1 pt-24 sm:pt-32 pb-16 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto w-full">
                    <Link
                        href={`/eventos/${id}/chaves`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar às categorias
                    </Link>

                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight">
                        {categoryName}
                    </h1>
                    {chave.pesoRangeLabel && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                            <Scale className="h-4 w-4" />
                            {chave.pesoRangeLabel}
                        </p>
                    )}

                    <div className="mt-5">
                        <GeBracket
                            title={categoryName}
                            result={chave.result}
                            athletes={chave.athletes}
                            mode="oficial"
                            athleteDetails={chave.athleteDetails}
                        />
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground text-center">
                        Visualização somente leitura · arraste para navegar e use os controles de zoom.
                    </p>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}

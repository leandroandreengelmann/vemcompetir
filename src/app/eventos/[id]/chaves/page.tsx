import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ChavesPublicasBrowser } from '@/components/chaves-publicas/ChavesPublicasBrowser';
import { getEventoPublico, listarChavesPublicas } from '@/lib/public/chaves-publicas';

export const revalidate = 30;

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const evento = await getEventoPublico(id);
    return {
        title: evento ? `Chaves — ${evento.title}` : 'Chaves do evento',
        description: 'Consulte as categorias sorteadas e o cronograma do evento.',
    };
}

export default async function ChavesPublicasPage({ params }: PageProps) {
    const { id } = await params;
    const [evento, chaves] = await Promise.all([
        getEventoPublico(id),
        listarChavesPublicas(id),
    ]);

    if (!evento) notFound();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PublicHeader />
            <main className="flex-1 pt-24 sm:pt-32 pb-16">
                <ChavesPublicasBrowser eventId={id} eventTitle={evento.title} chaves={chaves} />
            </main>
            <PublicFooter />
        </div>
    );
}

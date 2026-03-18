'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, TrophyIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { getCategoryBracketAthletes } from '../../../../../actions/event-reports';
import { CategoryBracket } from '@/components/panel/CategoryBracket';
import Link from 'next/link';

export default function ChaveamentoCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const searchParams = useSearchParams();
    const categoriaName = searchParams.get('categoria');

    const [athletes, setAthletes] = useState<{ name: string; team: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoriaName) return;
        load();
    }, [eventId, categoriaName]);

    async function load() {
        setLoading(true);
        try {
            const res = await getCategoryBracketAthletes(eventId, categoriaName!);
            setAthletes(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Chaveamento"
                description={categoriaName || ''}
                rightElement={
                    <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm" asChild>
                        <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias`}>
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar
                        </Link>
                    </Button>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <CircleNotchIcon size={32} weight="bold" className="animate-spin text-muted-foreground" />
                </div>
            ) : (
                <CategoryBracket
                    athletes={athletes}
                    title={categoriaName || 'Categoria'}
                />
            )}
        </div>
    );
}

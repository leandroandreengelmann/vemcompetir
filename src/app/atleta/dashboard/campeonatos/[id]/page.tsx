import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import AthleteEventDetail from '../components/AthleteEventDetail';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';

import { AthletePageHeader } from '../../components/athlete-page-header';

const EVENT_CATEGORY_GROUPING_NOTICES: Record<string, { groups: string[] }> = {
    // 22ª COPA NORTE NORTÃO
    'db5d7cbb-a571-4b4f-9d79-ecb111406760': {
        groups: ['Cinza + Amarela', 'Laranja + Verde'],
    },
};

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { profile } = await requireRole('atleta');
    const supabase = await createClient();

    // Fetch event - ensure it's published for athletes
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('status', 'publicado')
        .single();

    if (error || !event) notFound();

    const groupingNotice = EVENT_CATEGORY_GROUPING_NOTICES[params.id];

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFAFA] p-4 md:p-8 md:max-w-5xl md:mx-auto w-full">
            <AthletePageHeader
                title={event.title}
                description="Confira os detalhes e realize sua inscrição."
                backHref="/atleta/dashboard/campeonatos"
                beltColor={profile?.belt_color}
            />
            {groupingNotice && (
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-3 mb-4 md:mb-6">
                    <WarningIcon size={24} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1.5">
                        <p className="text-base font-bold text-amber-900 leading-snug">
                            Categorias agrupadas neste evento
                        </p>
                        <p className="text-sm font-medium text-amber-900 leading-snug">
                            Atenção: nas categorias <span className="font-bold">infantis</span>, as faixas abaixo foram agrupadas e competirão juntas:
                        </p>
                        <ul className="text-sm font-semibold text-amber-900 list-disc list-inside space-y-0.5">
                            {groupingNotice.groups.map((g) => (
                                <li key={g}>{g}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            <AthleteEventDetail event={event} beltColor={(profile as any)?.belt_color} />
        </div>
    );
}

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import AthleteEventDetail from '../components/AthleteEventDetail';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

import { AthletePageHeader } from '../../components/athlete-page-header';

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

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFAFA] p-4 md:p-8 md:max-w-5xl md:mx-auto w-full">
            <AthletePageHeader
                title={event.title}
                description="Confira os detalhes e realize sua inscrição."
                backHref="/atleta/dashboard/campeonatos"
                // @ts-expect-error - belt_color might be missing on profile type
                beltColor={profile?.belt_color}
            />
            <AthleteEventDetail event={event} beltColor={(profile as any)?.belt_color} />
        </div>
    );
}

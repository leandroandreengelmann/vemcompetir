'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

interface Props {
    registrationId: string;
    event: {
        id: string;
        event_date: string;
        category_change_deadline_days?: number;
    } | null;
}

export function ChangeCategoryButton({ registrationId, event }: Props) {
    const router = useRouter();

    if (!event) return null;

    const deadlineDays = event.category_change_deadline_days ?? 0;
    if (deadlineDays === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.event_date);
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - deadlineDays);
    if (today > deadline) return null;

    return (
        <Button
            variant="outline"
            className="h-10 px-5 text-panel-sm font-bold uppercase tracking-wider rounded-full border-red-200 text-red-600 hover:bg-red-600 hover:text-white active:bg-red-700 transition-colors"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/atleta/dashboard/inscricoes/${registrationId}/trocar-categoria`);
            }}
        >
            <ArrowsClockwiseIcon size={18} weight="duotone" className="mr-2" />
            Trocar Categoria
        </Button>
    );
}

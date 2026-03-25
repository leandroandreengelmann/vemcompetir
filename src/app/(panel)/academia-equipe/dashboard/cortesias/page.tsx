import { redirect } from 'next/navigation';
import { requireTenantScope } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getAcademyEventsForCourtesyAction, getCourtesyRegistrationsAction } from './actions';
import { CourtesyClient } from './CourtesyClient';

export default async function CortesiasPage() {
    const { profile } = await requireTenantScope();

    if (profile.role !== 'academia/equipe') redirect('/login');

    const [eventsResult, courtesiesResult] = await Promise.all([
        getAcademyEventsForCourtesyAction(),
        getCourtesyRegistrationsAction(),
    ]);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Inscrições de Cortesia"
                description="Inscreva atletas e árbitros nos seus eventos sem cobrança."
            />

            <CourtesyClient
                events={eventsResult.data ?? []}
                initialCourtesies={(courtesiesResult.data as any[]) ?? []}
            />
        </div>
    );
}

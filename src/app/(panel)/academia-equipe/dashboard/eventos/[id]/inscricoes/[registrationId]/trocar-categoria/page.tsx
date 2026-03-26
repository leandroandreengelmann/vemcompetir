import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { requireTenantScope } from '@/lib/auth-guards';
import ChangeCategoryForm from './ChangeCategoryForm';

interface Props {
    params: Promise<{ id: string; registrationId: string }>;
}

export default async function TrocarCategoriaPage(props: Props) {
    const { id: eventId, registrationId } = await props.params;

    const { profile, tenant_id } = await requireTenantScope();
    if (!profile) redirect('/login');

    const adminClient = createAdminClient();

    // Load registration
    const { data: reg } = await adminClient
        .from('event_registrations')
        .select(`
            id,
            status,
            athlete_id,
            category_id,
            tenant_id,
            event_id,
            athlete:profiles!athlete_id (
                id,
                full_name,
                sexo,
                belt_color,
                birth_date,
                weight
            ),
            category:category_rows!category_id (
                id,
                categoria_completa,
                faixa,
                divisao_idade,
                categoria_peso,
                sexo
            )
        `)
        .eq('id', registrationId)
        .eq('event_id', eventId)
        .single();

    if (!reg) notFound();

    // Load event
    const { data: event } = await adminClient
        .from('events')
        .select('id, title, event_date, category_change_deadline_days, tenant_id')
        .eq('id', eventId)
        .single();

    if (!event) notFound();

    // Permission check: must be registration's tenant OR event organizer
    const isRegistrationTenant = reg.tenant_id === tenant_id;
    const isOrganizer = event.tenant_id === tenant_id;
    if (!isRegistrationTenant && !isOrganizer) redirect('/academia-equipe/dashboard/eventos');

    // Must be paid
    const paidStatuses = ['pago', 'paga', 'confirmado', 'isento'];
    if (!paidStatuses.includes(reg.status)) {
        redirect(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
    }

    // Check deadline
    const deadlineDays = event.category_change_deadline_days ?? 0;
    if (deadlineDays === 0) {
        redirect(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
    }
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);
    if (today > deadlineDate) {
        redirect(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
    }

    // Load eligible categories for this athlete in this event
    const supabase = await createClient();

    const { data: linkedTables } = await supabase
        .from('event_category_tables')
        .select('category_table_id')
        .eq('event_id', eventId);

    const tableIds = (linkedTables || []).map((lt: any) => lt.category_table_id);

    const { data: allCategories } = await adminClient
        .from('category_rows')
        .select('id, categoria_completa, faixa, divisao_idade, categoria_peso, sexo, peso_min_kg, peso_max_kg')
        .in('table_id', tableIds)
        .order('categoria_completa', { ascending: true });

    const athlete = Array.isArray(reg.athlete) ? reg.athlete[0] : reg.athlete;
    const currentCategory = Array.isArray(reg.category) ? reg.category[0] : reg.category;

    // Filter out current category
    const availableCategories = (allCategories || []).filter((c: any) => c.id !== reg.category_id);

    return (
        <ChangeCategoryForm
            registrationId={registrationId}
            eventId={eventId}
            eventTitle={event.title}
            athleteName={athlete?.full_name || ''}
            currentCategory={currentCategory}
            availableCategories={availableCategories}
            deadlineDate={deadlineDate.toLocaleDateString('pt-BR')}
        />
    );
}

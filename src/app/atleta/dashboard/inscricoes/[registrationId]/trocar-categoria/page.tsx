import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-guards';
import AthleteChangeCategoryForm from './AthleteChangeCategoryForm';
import { getEligibleCategories } from '@/app/atleta/dashboard/campeonatos/lib/eligible-categories';

interface Props {
    params: Promise<{ registrationId: string }>;
}

export default async function AthleteChangeCategoryPage(props: Props) {
    const { registrationId } = await props.params;
    const { user, profile } = await requireRole('atleta');

    const adminClient = createAdminClient();

    const { data: reg } = await adminClient
        .from('event_registrations')
        .select(`
            id,
            status,
            athlete_id,
            category_id,
            event_id,
            category:category_rows!category_id (
                id,
                categoria_completa,
                faixa,
                divisao_idade,
                categoria_peso,
                sexo,
                peso_min_kg,
                peso_max_kg
            )
        `)
        .eq('id', registrationId)
        .single();

    if (!reg || reg.athlete_id !== user.id) notFound();

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, event_date, category_change_deadline_days')
        .eq('id', reg.event_id)
        .single();

    if (!event) notFound();

    const paidStatuses = ['pago', 'paga', 'confirmado', 'isento'];
    if (!paidStatuses.includes(reg.status)) redirect('/atleta/dashboard/inscricoes');

    const deadlineDays = event.category_change_deadline_days ?? 0;
    if (deadlineDays === 0) redirect('/atleta/dashboard/inscricoes');

    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);
    if (today > deadlineDate) redirect('/atleta/dashboard/inscricoes');

    const currentCategory = Array.isArray(reg.category) ? reg.category[0] : reg.category;

    const eligibleData = await getEligibleCategories(reg.event_id);
    const allCategories = (eligibleData as any).allWithMeta || [];

    const { data: rawHistory } = await adminClient
        .from('registration_category_changes')
        .select(`
            id,
            created_at,
            old_category:category_rows!old_category_id (id, categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            new_category:category_rows!new_category_id (id, categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            changed_by_profile:profiles!changed_by (full_name)
        `)
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false });

    const history = (rawHistory || []).map((h: any) => ({
        id: h.id,
        created_at: h.created_at,
        old_category: Array.isArray(h.old_category) ? h.old_category[0] : h.old_category,
        new_category: Array.isArray(h.new_category) ? h.new_category[0] : h.new_category,
        changed_by_name: Array.isArray(h.changed_by_profile)
            ? h.changed_by_profile[0]?.full_name
            : h.changed_by_profile?.full_name,
    }));

    const athleteAge = profile?.birth_date
        ? (() => {
            const birth = new Date(profile.birth_date as string);
            const eventYear = new Date(event.event_date).getFullYear();
            return eventYear - birth.getFullYear();
        })()
        : null;

    return (
        <AthleteChangeCategoryForm
            registrationId={registrationId}
            eventId={reg.event_id}
            eventTitle={event.title}
            athleteName={profile?.full_name || ''}
            beltColor={profile?.belt_color || 'branca'}
            athleteAge={athleteAge}
            currentCategory={currentCategory}
            allCategories={allCategories}
            deadlineDate={deadlineDate.toLocaleDateString('pt-BR')}
            history={history}
        />
    );
}

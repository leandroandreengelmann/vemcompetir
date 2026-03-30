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
                sexo,
                peso_min_kg,
                peso_max_kg
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

    // Sort all categories by peso_min_kg (nulls last), then alphabetically
    const sorted = [...(allCategories || [])].sort((a, b) => {
        const aW = a.peso_min_kg ?? 99999;
        const bW = b.peso_min_kg ?? 99999;
        if (aW !== bW) return aW - bW;
        return (a.categoria_completa || '').localeCompare(b.categoria_completa || '');
    });

    // Find position of current category in sorted list
    const currentIndex = sorted.findIndex((c) => c.id === reg.category_id);

    // Take 2 before and 2 after (excluding current)
    const neighbors: typeof sorted = [];
    for (let offset = -2; offset <= 2; offset++) {
        if (offset === 0) continue;
        const idx = currentIndex + offset;
        if (idx >= 0 && idx < sorted.length) {
            neighbors.push(sorted[idx]);
        }
    }

    // Pass sorted neighbors AND their positions relative to current for visual display
    const categoriesWithPosition = neighbors.map((cat) => {
        const idx = sorted.findIndex((c) => c.id === cat.id);
        return { ...cat, relativePosition: idx - currentIndex };
    });

    // Fetch confirmed athletes per category (current + neighbors)
    const categoryIds = [reg.category_id, ...neighbors.map((c) => c.id)];
    const { data: confirmedRegs } = await adminClient
        .from('event_registrations')
        .select(`
            category_id,
            athlete:profiles!athlete_id (full_name, belt_color)
        `)
        .eq('event_id', eventId)
        .in('category_id', categoryIds)
        .in('status', ['pago', 'paga', 'confirmado', 'isento']);

    // Group athletes by category_id
    const athletesByCategory: Record<string, { full_name: string; belt_color?: string }[]> = {};
    for (const r of confirmedRegs || []) {
        const catId = r.category_id;
        const ath = Array.isArray(r.athlete) ? r.athlete[0] : r.athlete;
        if (!ath) continue;
        if (!athletesByCategory[catId]) athletesByCategory[catId] = [];
        athletesByCategory[catId].push(ath as any);
    }

    // Fetch change history for this registration
    const { data: rawHistory } = await adminClient
        .from('registration_category_changes')
        .select(`
            id,
            created_at,
            old_category_id,
            new_category_id,
            changed_by,
            old_category:category_rows!old_category_id (id, categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            new_category:category_rows!new_category_id (id, categoria_completa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg),
            changed_by_profile:profiles!changed_by (full_name)
        `)
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false });

    const history = (rawHistory || []).map((h: any) => ({
        id: h.id,
        created_at: h.created_at,
        old_category_id: h.old_category_id,
        new_category_id: h.new_category_id,
        old_category: Array.isArray(h.old_category) ? h.old_category[0] : h.old_category,
        new_category: Array.isArray(h.new_category) ? h.new_category[0] : h.new_category,
        changed_by_name: Array.isArray(h.changed_by_profile)
            ? h.changed_by_profile[0]?.full_name
            : h.changed_by_profile?.full_name,
    }));

    return (
        <ChangeCategoryForm
            registrationId={registrationId}
            eventId={eventId}
            eventTitle={event.title}
            athleteName={athlete?.full_name || ''}
            currentCategory={currentCategory}
            availableCategories={categoriesWithPosition}
            deadlineDate={deadlineDate.toLocaleDateString('pt-BR')}
            athletesByCategory={athletesByCategory}
            history={history}
        />
    );
}

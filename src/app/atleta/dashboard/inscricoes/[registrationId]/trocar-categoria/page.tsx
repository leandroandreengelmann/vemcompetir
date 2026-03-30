import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth-guards';
import AthleteChangeCategoryForm from './AthleteChangeCategoryForm';

interface Props {
    params: Promise<{ registrationId: string }>;
}

// Belt progression — adults
const ADULT_BELT_ORDER = ['branca', 'azul', 'roxa', 'marrom', 'preta'];
// Belt progression — kids
const KIDS_BELT_ORDER = [
    'branca', 'cinza e branca', 'cinza', 'cinza e preta',
    'amarela e branca', 'amarela', 'amarela e preta',
    'laranja e branca', 'laranja', 'laranja e preta',
    'verde e branca', 'verde', 'verde e preta',
];

function isKidsDivision(divisaoIdade: string): boolean {
    const lower = (divisaoIdade || '').toLowerCase();
    return lower.includes('infantil') || lower.includes('juvenil') || lower.includes('sub-') || lower.includes('mini');
}

function getNextBelt(currentFaixa: string, divisaoIdade: string): string | null {
    const lower = (currentFaixa || '').toLowerCase().trim();
    if (isKidsDivision(divisaoIdade)) {
        const kidsIdx = KIDS_BELT_ORDER.indexOf(lower);
        if (kidsIdx !== -1) {
            return kidsIdx < KIDS_BELT_ORDER.length - 1 ? KIDS_BELT_ORDER[kidsIdx + 1] : null;
        }
    }
    const adultIdx = ADULT_BELT_ORDER.indexOf(lower);
    if (adultIdx !== -1) {
        return adultIdx < ADULT_BELT_ORDER.length - 1 ? ADULT_BELT_ORDER[adultIdx + 1] : null;
    }
    return null;
}

export default async function AthleteChangeCategoryPage(props: Props) {
    const { registrationId } = await props.params;
    const { user, profile } = await requireRole('atleta');

    const adminClient = createAdminClient();

    // Load registration — must belong to this athlete
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

    // Load event
    const { data: event } = await adminClient
        .from('events')
        .select('id, title, event_date, category_change_deadline_days')
        .eq('id', reg.event_id)
        .single();

    if (!event) notFound();

    // Must be paid
    const paidStatuses = ['pago', 'paga', 'confirmado', 'isento'];
    if (!paidStatuses.includes(reg.status)) redirect('/atleta/dashboard/inscricoes');

    // Check deadline
    const deadlineDays = event.category_change_deadline_days ?? 0;
    if (deadlineDays === 0) redirect('/atleta/dashboard/inscricoes');

    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);
    if (today > deadlineDate) redirect('/atleta/dashboard/inscricoes');

    // Load all categories for this event
    const { data: linkedTables } = await adminClient
        .from('event_category_tables')
        .select('category_table_id')
        .eq('event_id', reg.event_id);

    const tableIds = (linkedTables || []).map((lt: any) => lt.category_table_id);

    const { data: allCategories } = await adminClient
        .from('category_rows')
        .select('id, categoria_completa, faixa, divisao_idade, categoria_peso, sexo, peso_min_kg, peso_max_kg')
        .in('table_id', tableIds);

    const currentCategory = Array.isArray(reg.category) ? reg.category[0] : reg.category;
    const cats = allCategories || [];


    // Deduplicate categories by logical key (same faixa+age+gender+weight = same slot)
    function dedupeBySlot(list: typeof cats) {
        const seen = new Set<string>();
        return list.filter((c) => {
            const key = `${c.faixa}|${c.divisao_idade}|${c.sexo}|${c.peso_min_kg}|${c.peso_max_kg}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // ── 1. Weight options: same faixa + divisao_idade + sexo, all weights except current ──
    const weightNeighbors = dedupeBySlot(
        cats.filter((c) =>
            c.id !== reg.category_id &&
            c.faixa === currentCategory.faixa &&
            c.divisao_idade === currentCategory.divisao_idade &&
            c.sexo === currentCategory.sexo
        ).sort((a, b) => Number(a.peso_min_kg ?? 0) - Number(b.peso_min_kg ?? 0))
    );

    // ── 2. Belt upgrade: next belt + same divisao_idade + sexo, all weights ──
    const nextBelt = getNextBelt(currentCategory.faixa || '', currentCategory.divisao_idade || '');
    const beltUpgrades = nextBelt
        ? dedupeBySlot(
            cats.filter((c) =>
                c.faixa?.toLowerCase().trim() === nextBelt &&
                c.divisao_idade === currentCategory.divisao_idade &&
                c.sexo === currentCategory.sexo
            ).sort((a, b) => Number(a.peso_min_kg ?? 0) - Number(b.peso_min_kg ?? 0))
        )
        : [];

    // ── Athletes per relevant category ──
    const relevantIds = [
        reg.category_id,
        ...weightNeighbors.map((c) => c.id),
        ...beltUpgrades.map((c) => c.id),
    ];

    const { data: confirmedRegs } = await adminClient
        .from('event_registrations')
        .select('category_id, athlete:profiles!athlete_id (full_name, belt_color)')
        .eq('event_id', reg.event_id)
        .in('category_id', relevantIds)
        .in('status', ['pago', 'paga', 'confirmado', 'isento']);

    const athletesByCategory: Record<string, { full_name: string; belt_color?: string }[]> = {};
    for (const r of confirmedRegs || []) {
        const catId = r.category_id;
        const ath = Array.isArray(r.athlete) ? r.athlete[0] : r.athlete;
        if (!ath) continue;
        if (!athletesByCategory[catId]) athletesByCategory[catId] = [];
        athletesByCategory[catId].push(ath as any);
    }

    // ── Change history ──
    const { data: rawHistory } = await adminClient
        .from('registration_category_changes')
        .select(`
            id,
            created_at,
            old_category_id,
            new_category_id,
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
        <AthleteChangeCategoryForm
            registrationId={registrationId}
            eventTitle={event.title}
            athleteName={profile?.full_name || ''}
            beltColor={profile?.belt_color || 'branca'}
            currentCategory={currentCategory}
            weightNeighbors={weightNeighbors}
            beltUpgrades={beltUpgrades}
            deadlineDate={deadlineDate.toLocaleDateString('pt-BR')}
            athletesByCategory={athletesByCategory}
            history={history}
        />
    );
}

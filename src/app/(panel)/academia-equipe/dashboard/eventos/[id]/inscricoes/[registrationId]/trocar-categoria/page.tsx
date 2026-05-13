import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import { requireTenantScope } from '@/lib/auth-guards';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Badge } from '@/components/ui/badge';
import { formatFullCategoryName } from '@/lib/category-utils';
import TrocarCategoriaClient from './TrocarCategoriaClient';

interface Props {
    params: Promise<{ id: string; registrationId: string }>;
}

function BeltBadge({ belt }: { belt?: string }) {
    if (!belt) return null;
    const lower = belt.toLowerCase();
    let cls = 'bg-muted text-muted-foreground border-border';
    if (lower.includes('branca')) cls = 'bg-white text-slate-800 border-slate-200';
    else if (lower.includes('azul')) cls = 'bg-blue-500 text-white border-blue-600';
    else if (lower.includes('roxa')) cls = 'bg-purple-500 text-white border-purple-600';
    else if (lower.includes('marrom')) cls = 'bg-amber-800 text-white border-amber-900';
    else if (lower.includes('preta')) cls = 'bg-slate-900 text-white border-slate-950';
    else if (lower.includes('cinza')) cls = 'bg-gray-400 text-white border-gray-500';
    else if (lower.includes('amarela')) cls = 'bg-yellow-400 text-yellow-950 border-yellow-500';
    else if (lower.includes('laranja')) cls = 'bg-orange-500 text-white border-orange-600';
    else if (lower.includes('verde')) cls = 'bg-green-600 text-white border-green-700';
    return (
        <Badge variant="outline" className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 ${cls}`}>
            {belt}
        </Badge>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
    );
}

export default async function TrocarCategoriaPage(props: Props) {
    const { id: eventId, registrationId } = await props.params;

    const { tenant_id } = await requireTenantScope();

    const adminClient = createAdminClient();

    const { data: reg } = await adminClient
        .from('event_registrations')
        .select(`
            id,
            status,
            tenant_id,
            event_id,
            athlete_id,
            athlete:profiles!athlete_id (
                full_name,
                sexo,
                belt_color,
                birth_date,
                weight,
                phone,
                cpf,
                tenant_id
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

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, tenant_id')
        .eq('id', eventId)
        .single();

    if (!event) notFound();

    const athlete = Array.isArray(reg.athlete) ? reg.athlete[0] : reg.athlete;

    const isRegistrationTenant = reg.tenant_id === tenant_id;
    const isOrganizer = event.tenant_id === tenant_id;
    const isAthleteOfTenant = athlete?.tenant_id === tenant_id;
    if (!isRegistrationTenant && !isOrganizer && !isAthleteOfTenant) {
        redirect('/academia-equipe/dashboard/trocar-categoria');
    }
    const category = Array.isArray(reg.category) ? reg.category[0] : reg.category;

    const age = athlete?.birth_date
        ? new Date().getFullYear() - new Date(athlete.birth_date).getFullYear()
        : null;

    const weightStr = athlete?.weight ? `${athlete.weight} kg` : null;
    const ageStr = age ? `${age} anos` : null;
    const sexoStr = athlete?.sexo === 'M' ? 'Masculino' : athlete?.sexo === 'F' ? 'Feminino' : athlete?.sexo ?? null;

    // Histórico de trocas
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

    return (
        <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-lg space-y-8">

                <div className="space-y-5">
                    <Link
                        href="/academia-equipe/dashboard/trocar-categoria"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit gap-2"
                    >
                        <ArrowLeftIcon size={16} weight="duotone" />
                        Voltar para checagem
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight">Dados do Atleta</h1>
                </div>

                {/* Athlete card */}
                <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-muted/30 border-b flex items-center justify-between gap-3">
                        <p className="text-lg font-black text-foreground">{athlete?.full_name || '—'}</p>
                        <BeltBadge belt={athlete?.belt_color} />
                    </div>
                    <div className="px-5 py-1">
                        <InfoRow label="Sexo" value={sexoStr} />
                        <InfoRow label="Idade" value={ageStr} />
                        <InfoRow label="Peso" value={weightStr} />
                        <InfoRow label="CPF" value={athlete?.cpf} />
                        <InfoRow label="Telefone" value={athlete?.phone} />
                    </div>
                </div>

                {/* Category card */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Categoria inscrita</p>
                    <div className="flex items-center gap-3 px-5 py-4 bg-primary/5 border-2 border-primary rounded-2xl">
                        <p className="text-base font-black text-foreground flex-1">
                            {category ? formatFullCategoryName(category) : '—'}
                        </p>
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 shrink-0">
                            Atual
                        </Badge>
                    </div>
                </div>

                {/* Category search */}
                <TrocarCategoriaClient
                    registrationId={registrationId}
                    eventId={eventId}
                    athleteId={reg.athlete_id}
                    currentCategory={category}
                    athleteAge={age}
                    history={history}
                />

            </div>
        </div>
    );
}

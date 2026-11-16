import { requireFinancialModule } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ChartPieSliceIcon } from '@phosphor-icons/react/dist/ssr';
import { PeriodFilter } from '../_components/PeriodFilter';
import { resolvePeriod, periodToIsoFilter } from '../_components/period';
import { listTenantEventsForFinanceiro } from '../actions';
import { getFinanceiroDetalhamento } from './actions';
import { DetalhamentoView } from './_components/DetalhamentoView';
import { ConferenciaAsaas } from './_components/ConferenciaAsaas';
import { ListaAsaas } from './_components/ListaAsaas';
import { listAsaasPayments } from './lista-actions';
import { EventFilter } from './_components/EventFilter';

export const dynamic = 'force-dynamic';

export default async function DetalhamentoFinanceiroPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string; from?: string; to?: string; eventId?: string; origem?: string }>;
}) {
    const { profile } = await requireFinancialModule();
    // Somente o dono da academia vê esta tela.
    if (!['academia', 'organizador', 'academia/equipe', 'admin_geral'].includes(profile.role)) redirect('/academia-equipe/dashboard/financeiro');

    const sp = await searchParams;
    const period = resolvePeriod(sp);
    const filters = { eventId: sp.eventId || null, ...periodToIsoFilter(period) };
    const focus = sp.origem === 'asaas' || sp.origem === 'taxa' ? sp.origem : null;
    const [events, data, asaasRows] = await Promise.all([
        listTenantEventsForFinanceiro(),
        getFinanceiroDetalhamento(filters),
        focus ? listAsaasPayments(filters) : Promise.resolve(null),
    ]);
    const linkBase = new URLSearchParams(
        Object.entries({ preset: sp.preset, from: sp.from, to: sp.to, eventId: sp.eventId }).filter(([, v]) => !!v) as [string, string][],
    ).toString();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Detalhamento financeiro"
                description={`Para onde foi o dinheiro — ${period.label.toLowerCase()}.`}
                icon={ChartPieSliceIcon as any}
                rightElement={<PeriodFilter />}
            />
            <EventFilter events={events.map((e: any) => ({ id: e.id, title: e.title }))} value={sp.eventId ?? ''} />
            <DetalhamentoView data={data} linkBase={linkBase} />
            {focus && asaasRows && (
                <ListaAsaas rows={asaasRows} focus={focus} cardTotalCents={data.asaasGrossCents} cardFeeCents={data.asaasFeeCents} />
            )}
            <ConferenciaAsaas />
        </div>
    );
}

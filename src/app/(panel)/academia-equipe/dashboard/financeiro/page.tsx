import { requireFinancialModule } from '@/lib/auth-guards';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import {
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    ArrowsClockwiseIcon,
    ChartLineUpIcon,
    CaretRightIcon,
    CalendarCheckIcon,
} from '@phosphor-icons/react/dist/ssr';
import { PeriodFilter } from './_components/PeriodFilter';
import { resolvePeriod, periodToIsoFilter } from './_components/period';
import { getFinanceiroHubKpis } from './actions';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const dynamic = 'force-dynamic';

export default async function FinanceiroHubPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
    await requireFinancialModule();
    const sp = await searchParams;
    const period = resolvePeriod(sp);
    const kpis = await getFinanceiroHubKpis(periodToIsoFilter(period));

    const stats = [
        {
            label: 'Receita confirmada',
            value: formatCurrency(kpis.totalRevenue),
            caption: `${kpis.paidCount} inscrição(ões) paga(s)`,
            icon: CurrencyCircleDollarIcon,
            accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
        },
        {
            label: 'Agendado',
            value: formatCurrency(kpis.agendadoAmount),
            caption: `${kpis.agendadoCount} inscrição(ões) agendada(s)`,
            icon: CalendarCheckIcon,
            accent: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
        },
        {
            label: 'Recibos emitidos',
            value: String(kpis.receiptCount),
            caption: `Total: ${formatCurrency(kpis.receiptsAmount)}`,
            icon: ReceiptIcon,
            accent: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
        },
    ];

    const sections = [
        {
            title: 'Transações',
            description: 'Todas as movimentações financeiras da academia.',
            href: '/academia-equipe/dashboard/financeiro/transacoes',
            icon: ChartLineUpIcon,
            accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
        },
        {
            title: 'Recibos',
            description: 'Emita e gerencie recibos das transações.',
            href: '/academia-equipe/dashboard/financeiro/recibos',
            icon: ReceiptIcon,
            accent: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
        },
        {
            title: 'Histórico de Status',
            description: 'Alterações de status das inscrições com trilha de auditoria.',
            href: '/academia-equipe/dashboard/financeiro/status',
            icon: ArrowsClockwiseIcon,
            accent: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
        },
    ];

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Módulo Financeiro"
                description={`Visão geral — ${period.label.toLowerCase()}.`}
                icon={CurrencyCircleDollarIcon as any}
                rightElement={<PeriodFilter />}
            />

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="rounded-2xl border border-border/50 p-5 bg-background flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-panel-sm text-muted-foreground">{s.label}</span>
                                        <span className="text-2xl font-bold">{s.value}</span>
                                        <span className="text-panel-sm text-muted-foreground">{s.caption}</span>
                                    </div>
                                    <div className={`p-2.5 rounded-xl border ${s.accent}`}>
                                        <Icon size={22} weight="duotone" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            return (
                                <Link key={section.href} href={section.href} className="group">
                                    <div className="h-full rounded-2xl border border-border/50 p-5 bg-background transition-all hover:border-primary/40 hover:shadow-md flex flex-col gap-4">
                                        <div className={`p-2.5 rounded-xl border w-fit ${section.accent}`}>
                                            <Icon size={24} weight="duotone" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <div className="font-bold text-panel-md">{section.title}</div>
                                            <div className="text-panel-sm text-muted-foreground">{section.description}</div>
                                        </div>
                                        <div className="flex items-center text-panel-sm text-primary font-semibold">
                                            Acessar
                                            <CaretRightIcon size={16} weight="bold" className="ml-1 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

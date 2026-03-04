import { requireRole } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getNoSplitRulesWithEvents } from './actions';
import { NoSplitManager } from './components/no-split-manager';

export default async function CobrancaIntegralPage() {
    await requireRole('admin_geral');
    const eventsWithRules = await getNoSplitRulesWithEvents();

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-5xl space-y-10">
                <SectionHeader
                    title="Cobrança Integral"
                    description="Configure regras de cobrança integral (sem split) por evento. Quando ativa, as inscrições nas posições definidas terão o valor total direcionado para a conta principal."
                    className="text-center md:flex-col md:items-center"
                />
                <NoSplitManager initialEvents={eventsWithRules} />
            </div>
        </div>
    );
}

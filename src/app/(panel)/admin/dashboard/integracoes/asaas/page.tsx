import { requireRole } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getAsaasSettings } from './actions';
import { AsaasConfigForm } from '@/app/(panel)/admin/dashboard/integracoes/asaas/asaas-config-form';

export default async function AsaasIntegrationPage() {
    await requireRole('admin_geral');

    const sandboxSettings = await getAsaasSettings('sandbox');
    const productionSettings = await getAsaasSettings('production');

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Integração Asaas"
                description="Configure a conexão com o gateway de pagamentos Asaas."
            />
            <AsaasConfigForm
                sandboxSettings={sandboxSettings}
                productionSettings={productionSettings}
            />
        </div>
    );
}

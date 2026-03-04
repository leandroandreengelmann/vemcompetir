import { requireTenantScope } from '@/lib/auth-guards';
import { createClient } from '@/lib/supabase/server';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { AsaasSubaccountPanel } from './asaas-subaccount-panel';

export type SubaccountData = {
    id: string;
    asaas_account_id: string;
    wallet_id: string;
    status: string;
    email: string;
    cpf_cnpj: string | null;
    updated_at: string;
};

export default async function AsaasFinanceiroPage() {
    await requireTenantScope();

    const supabase = await createClient();

    const { data: subaccount } = await supabase
        .from('asaas_subaccounts')
        .select('id, asaas_account_id, wallet_id, status, email, cpf_cnpj, updated_at')
        .single();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Conectar Asaas"
                description="Gerencie sua conta no gateway de pagamentos."
            />
            <AsaasSubaccountPanel subaccount={subaccount as SubaccountData | null} />
        </div>
    );
}

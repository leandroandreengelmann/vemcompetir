import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CoinsIcon } from '@phosphor-icons/react/dist/ssr';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getTokenPackagesAction, getAcademiesTokenSummaryAction } from './actions';
import TokenPackagesClient from './TokenPackagesClient';

export default async function PacotesTokensPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin_geral') redirect('/admin/dashboard');

    const [packages, academies] = await Promise.all([
        getTokenPackagesAction(),
        getAcademiesTokenSummaryAction(),
    ]);

    return (
        <div className="space-y-6">
            <SectionHeader
                icon={CoinsIcon}
                title="Pacotes de Tokens"
                description="Gerencie os pacotes de tokens de inscrição e acompanhe o saldo das academias."
            />
            <TokenPackagesClient packages={packages as any} academies={academies as any} />
        </div>
    );
}

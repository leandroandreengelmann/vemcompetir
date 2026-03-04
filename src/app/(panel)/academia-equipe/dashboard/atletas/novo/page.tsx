import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NovoAtletaForm from './athlete-form';

export default async function NovoAtletaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile?.tenant_id) {
        redirect('/login');
    }

    // Buscar nome da academia
    const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.tenant_id)
        .single();

    // Buscar mestres da academia
    const { data: masters } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_master', true)
        .order('full_name', { ascending: true });

    return (
        <NovoAtletaForm
            academyName={tenant?.name || 'Minha Academia'}
            masters={masters || []}
        />
    );
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import EditAthleteForm from './edit-form';

interface EditAthletePageProps {
    params: Promise<{ id: string }>;
}

export default async function EditAthletePage(props: EditAthletePageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: orgProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const isConfiguredAcademy = orgProfile?.role === 'academia/equipe' && orgProfile?.tenant_id;
    const isGlobalAdmin = orgProfile?.role === 'admin_geral';

    if (!isConfiguredAcademy && !isGlobalAdmin) {
        redirect('/academia-equipe/dashboard');
    }

    // Fetch athlete profile and verify tenant
    let query = supabase
        .from('profiles')
        .select('*')
        .eq('id', id);

    // If it's an academy, enforce tenant isolation
    if (isConfiguredAcademy) {
        query = query.eq('tenant_id', orgProfile.tenant_id);
    }

    const { data: athleteProfile, error } = await query.single();

    if (error || !athleteProfile) {
        notFound();
    }

    // Fetch athlete email
    const adminClient = createAdminClient();
    const { data: { user: authUser }, error: authError } = await adminClient.auth.admin.getUserById(id);

    if (authError || !authUser) {
        // Should not happen if profile exists, but handle safely
        console.error("Auth user not found for profile:", id);
    }

    // Fetch masters for selection
    const { data: masters } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', orgProfile.tenant_id)
        .eq('is_master', true)
        .order('full_name');

    // Fetch suggested master names from athletes of the same academy who haven't been linked yet
    const { data: suggestedData } = await supabase
        .from('profiles')
        .select('master_name')
        .eq('tenant_id', orgProfile.tenant_id)
        .eq('role', 'atleta')
        .is('master_id', null)
        .not('master_name', 'is', null)
        .not('master_name', 'eq', '');

    const uniqueSuggestedMasters = suggestedData
        ? Array.from(new Set(suggestedData.map(s => s.master_name?.trim() || ''))).filter(Boolean)
        : [];

    // Fetch already linked suggestions for this specific athlete acting as master
    const { data: linkedData } = await supabase
        .from('profiles')
        .select('master_name')
        .eq('tenant_id', orgProfile.tenant_id)
        .eq('role', 'atleta')
        .eq('master_id', id)
        .not('master_name', 'is', null)
        .not('master_name', 'eq', '');

    const uniqueLinkedSuggestions = linkedData
        ? Array.from(new Set(linkedData.map(s => s.master_name?.trim() || ''))).filter(Boolean)
        : [];

    const athleteData = {
        ...athleteProfile,
        email: authUser?.email,
        master_id: athleteProfile.master_id,
        master_name: athleteProfile.master_name,
        cpf: athleteProfile.cpf,
        sexo: athleteProfile.sexo
    };

    return <EditAthleteForm
        athlete={athleteData}
        masters={masters || []}
        suggestedMasters={uniqueSuggestedMasters}
        linkedSuggestions={uniqueLinkedSuggestions}
        isGlobalAdmin={isGlobalAdmin}
    />;
}

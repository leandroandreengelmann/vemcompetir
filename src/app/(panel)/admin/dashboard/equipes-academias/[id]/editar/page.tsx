import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import EditAcademiaEquipeForm from '../edit-form';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditAcademiaEquipePage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();
    const { data: { user: organizer }, error } = await adminClient.auth.admin.getUserById(id);

    if (error || !organizer) {
        notFound();
    }

    const initialData = {
        id: organizer.id,
        full_name: organizer.user_metadata?.full_name || '',
        email: organizer.email || '',
        document: organizer.user_metadata?.document || '',
        address_street: organizer.user_metadata?.address_street || '',
        address_number: organizer.user_metadata?.address_number || '',
        address_city: organizer.user_metadata?.address_city || '',
        address_state: organizer.user_metadata?.address_state || '',
        address_zip_code: organizer.user_metadata?.address_zip_code || '',
    };

    return <EditAcademiaEquipeForm initialData={initialData} />;
}

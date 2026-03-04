import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import EditEventForm from './edit-form';

// Edit page for events
export default async function EditEventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) {
        redirect('/academia-equipe/dashboard');
    }

    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (error || !event) {
        notFound();
    }

    return <EditEventForm event={event} />;
}

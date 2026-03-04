import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getEventRegistrationsAction } from '../../registrations-actions';
import { RegistrationList } from '../../components/registration-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface EventRegistrationsPageProps {
    params: Promise<{ id: string }>;
}

export default async function EventRegistrationsPage(props: EventRegistrationsPageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    // Fetch event details
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !event) {
        notFound();
    }

    // Fetch registrations
    const registrations = await getEventRegistrationsAction(id);

    // Fetch my athletes (for the modal)
    // Only if the user has a tenant_id (which they should)
    let myAthletes: any[] = [];
    if (profile.tenant_id) {
        const { data: athletes } = await supabase
            .from('profiles')
            .select('id, full_name, sexo, belt_color, birth_date, weight')
            .eq('tenant_id', profile.tenant_id)
            .eq('role', 'atleta')
            .order('full_name', { ascending: true });

        myAthletes = athletes || [];
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground transition-colors">
                    <Link href="/academia-equipe/dashboard/eventos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <SectionHeader
                        title={`Inscrições: ${event.title}`}
                        description="Gerencie as inscrições deste evento."
                    />
                </div>
            </div>

            <RegistrationList
                event={event}
                registrations={(registrations as any[])?.map(r => ({
                    ...r,
                    athlete: Array.isArray(r.athlete) ? r.athlete[0] : r.athlete,
                    category: Array.isArray(r.category) ? r.category[0] : r.category,
                    registered_by_profile: Array.isArray(r.registered_by_profile) ? r.registered_by_profile[0] : r.registered_by_profile
                })) || []}
                athletes={myAthletes}
                currentUserId={user.id}
                currentUserTenantId={profile.tenant_id}
            />
        </div>
    );
}

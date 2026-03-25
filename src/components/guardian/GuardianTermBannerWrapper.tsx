import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUnder18 } from '@/lib/guardian-declarations';
import { GuardianTermBanner } from './GuardianTermBanner';

export async function GuardianTermBannerWrapper() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('birth_date')
        .eq('id', user.id)
        .single();

    if (!isUnder18(profile?.birth_date)) return null;

    const adminClient = createAdminClient();
    const { data: declaration } = await adminClient
        .from('athlete_guardian_declarations')
        .select('content, signed_term_status')
        .eq('athlete_id', user.id)
        .maybeSingle();

    if (!declaration) return null;

    const status = (declaration.signed_term_status ?? 'pending') as 'pending' | 'under_review' | 'approved';
    if (status === 'approved') return null;

    return (
        <GuardianTermBanner
            athleteId={user.id}
            termContent={declaration.content ?? ''}
            signedTermStatus={status}
        />
    );
}

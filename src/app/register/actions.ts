'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getGuardianTemplateContentAction(): Promise<string> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('guardian_term_templates')
        .select('content')
        .eq('is_active', true)
        .eq('type', 'self_register')
        .single();
    return data?.content ?? '';
}


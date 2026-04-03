import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('whatsapp_config')
        .select('support_phone')
        .limit(1)
        .maybeSingle();
    return NextResponse.json({ phone: data?.support_phone ?? null });
}

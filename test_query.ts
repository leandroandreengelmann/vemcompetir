import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const eventId = 'c2e716f2-e8ea-476b-b566-5ee78f95a165';

    const { data, error } = await adminSupabase
        .from('event_registrations')
        .select(`
            status,
            category_id,
            payment_id,
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Total registrations:", data.length);
    console.log("Statuses in DB:");
    const statusCounts = data.reduce((acc: any, curr: any) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});
    console.log(statusCounts);
}
run();

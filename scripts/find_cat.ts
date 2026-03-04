import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('category_rows')
        .select('categoria_completa, id')
        .ilike('categoria_completa', '%Masc%')
        .ilike('categoria_completa', '%Absoluto%')
        .limit(20);

    console.log(error || data);
}

main().catch(console.error);

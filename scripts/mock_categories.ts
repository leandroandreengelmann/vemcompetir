import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const eventId = 'fc856764-c425-4555-820b-3dab6d848177';
    console.log('Generating mock data for event:', eventId);

    // Find the category linked to this event
    const { data: cats, error: ecError } = await supabase
        .from('category_rows')
        .select('id, categoria_completa')
        .ilike('categoria_completa', '%Absoluto%Azul%')
        .ilike('categoria_completa', '%Masc%')
        .limit(1);

    if (ecError || !cats || cats.length === 0) {
        console.error('No matching category found in db');
        return;
    }

    const catId = cats[0].id;
    console.log('Found category:', cats[0].categoria_completa, 'ID:', catId);

    console.log('Generating 35 mock athletes...');
    const profiles = [];
    for (let i = 1; i <= 35; i++) {
        profiles.push({
            id: crypto.randomUUID(),
            full_name: `Atleta Testador ${i} Silva`,
            belt_color: i % 2 === 0 ? 'Azul' : 'Roxa',
            gym_name: `Equipe Campeã ${i}`,
            email: `atletateste${i}@exemplo.com`,
            cpf: `0000000${i.toString().padStart(4, '0')}`,
            gender: 'M',
            birth_date: '1995-01-01',
            role: 'user'
        });
    }

    console.log('Inserting profiles...');
    const { error: pError } = await supabase.from('profiles').insert(profiles);
    if (pError) {
        console.error('Profile insert error:', pError);
        return;
    }

    console.log('Inserting registrations...');
    const registrations = profiles.map((p, index) => ({
        athlete_id: p.id,
        event_id: eventId,
        category_id: catId,
        status: 'pago',
        id: crypto.randomUUID(),
        ticket_id: crypto.randomUUID()
    }));

    const { error: rError } = await supabase.from('event_registrations').insert(registrations);
    if (rError) {
        console.error('Registration insert error:', rError);
        return;
    }

    console.log('Successfully added 35 mock athletes to the category!');
}

main().catch(console.error);

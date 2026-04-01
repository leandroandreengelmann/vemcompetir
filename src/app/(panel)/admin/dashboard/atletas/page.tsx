import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CentralAtletasClient } from './CentralAtletasClient';

export default async function AdminAthletesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();

    // 1. Todos os atletas
    const { data: athletesRaw } = await adminClient
        .from('profiles')
        .select('id, full_name, cpf, phone, belt_color, weight, birth_date, sexo, gym_name, created_at, tenant_id, tenants(name)')
        .eq('role', 'atleta')
        .order('created_at', { ascending: false });

    // 2. Auth users (email + confirmação)
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map(authUsers.map(u => [u.id, { email: u.email ?? '', confirmed: !!u.email_confirmed_at }]));

    // 3. Termos aceitos (apenas IDs únicos de atletas)
    const { data: termAcceptances } = await adminClient
        .from('athlete_term_acceptances')
        .select('athlete_id');
    const athletesWithTerms = new Set((termAcceptances ?? []).map((t: any) => t.athlete_id));

    // 4. Inscrições por atleta (status)
    const { data: registrations } = await adminClient
        .from('event_registrations')
        .select('athlete_id, status, event_id, events(title), created_at, category_id, category_rows(categoria_completa), price');

    // Agrupa inscrições por atleta
    const regMap = new Map<string, any[]>();
    for (const reg of (registrations ?? [])) {
        const list = regMap.get((reg as any).athlete_id) ?? [];
        list.push(reg);
        regMap.set((reg as any).athlete_id, list);
    }

    // Monta estrutura final
    const athletes = (athletesRaw ?? []).map((a: any) => {
        const auth = authMap.get(a.id);
        const regs = regMap.get(a.id) ?? [];

        const missing: string[] = [];
        if (!a.cpf) missing.push('CPF');
        if (!a.phone) missing.push('Telefone');
        if (!a.belt_color) missing.push('Faixa');
        if (!a.weight) missing.push('Peso');
        if (!a.birth_date) missing.push('Nascimento');
        if (!a.sexo) missing.push('Sexo');

        const countByStatus = (status: string) => regs.filter((r: any) => r.status === status).length;

        return {
            id: a.id,
            full_name: a.full_name ?? '',
            email: auth?.email ?? '',
            email_confirmed: auth?.confirmed ?? false,
            phone: a.phone ?? null,
            cpf: a.cpf ?? null,
            belt_color: a.belt_color ?? null,
            weight: a.weight ?? null,
            birth_date: a.birth_date ?? null,
            sexo: a.sexo ?? null,
            gym_name: a.gym_name ?? null,
            tenant_name: (a.tenants as any)?.name ?? null,
            created_at: a.created_at,
            has_terms: athletesWithTerms.has(a.id),
            missing_fields: missing,
            is_complete: missing.length === 0,
            registrations: regs.map((r: any) => ({
                id: r.id,
                event_title: (r.events as any)?.title ?? '—',
                category: (r.category_rows as any)?.categoria_completa ?? '—',
                status: r.status,
                price: r.price,
                created_at: r.created_at,
            })),
            counts: {
                total: regs.length,
                pago: countByStatus('pago') + countByStatus('confirmado') + countByStatus('isento'),
                carrinho: countByStatus('carrinho'),
                aguardando: countByStatus('aguardando_pagamento') + countByStatus('pendente'),
            },
        };
    });

    return <CentralAtletasClient athletes={athletes} />;
}

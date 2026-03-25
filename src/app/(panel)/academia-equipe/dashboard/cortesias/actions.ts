'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { isUnder18, generateGuardianDeclaration } from '@/lib/guardian-declarations';
import { auditLog } from '@/lib/audit-log';
import { checkEligibility } from '@/lib/registration-logic';

// Retorna os eventos organizados pela academia atual
export async function getAcademyEventsForCourtesyAction() {
    const { tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, status')
        .eq('tenant_id', tenant_id)
        .order('event_date', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Busca atletas por nome ou CPF em toda a plataforma
export async function searchAthletesForCourtesyAction(query: string) {
    const { profile } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { data: null, error: 'Sem permissão.' };

    if (!query || query.trim().length < 2) return { data: [], error: null };

    const admin = createAdminClient();
    const normalizedQuery = query.replace(/\D/g, ''); // CPF sem pontuação

    const { data, error } = await admin
        .from('profiles')
        .select('id, full_name, belt_color, sexo, birth_date, weight, cpf, gym_name')
        .eq('role', 'atleta')
        .or(
            normalizedQuery.length >= 3
                ? `full_name.ilike.%${query}%,cpf.ilike.%${normalizedQuery}%`
                : `full_name.ilike.%${query}%`
        )
        .order('full_name', { ascending: true })
        .limit(20);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Retorna as categorias disponíveis em um evento, filtradas pelo perfil do atleta se fornecido
export async function getEventCategoriesForCourtesyAction(
    eventId: string,
    athleteId?: string,
) {
    const { tenant_id } = await requireTenantScope();
    const admin = createAdminClient();

    // Garante que o evento pertence à academia
    const { data: event } = await admin
        .from('events')
        .select('tenant_id, event_date')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) {
        return { data: null, error: 'Evento não encontrado.' };
    }

    // Busca os table_ids vinculados ao evento
    const { data: eventTables, error: tablesError } = await admin
        .from('event_category_tables')
        .select('category_table_id')
        .eq('event_id', eventId);

    if (tablesError || !eventTables || eventTables.length === 0) {
        return { data: [], error: null };
    }

    const tableIds = eventTables.map(t => t.category_table_id);

    // Busca as linhas de categoria desses grupos (com paginação — eventos grandes têm 2000+ categorias)
    let rows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error: batchError } = await admin
            .from('category_rows')
            .select('id, categoria_completa, sexo, faixa, divisao_idade, idade, peso_min_kg, peso_max_kg, table_id')
            .in('table_id', tableIds)
            .order('categoria_completa', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (batchError) return { data: null, error: batchError.message };
        if (!batch || batch.length === 0) { hasMore = false; break; }
        rows = [...rows, ...batch];
        hasMore = batch.length === pageSize;
        page++;
    }

    // Busca preços configurados para o evento
    const categoryIds = (rows ?? []).map(r => r.id);
    const { data: overrides } = await admin
        .from('event_category_overrides')
        .select('category_id, registration_fee')
        .eq('event_id', eventId)
        .in('category_id', categoryIds);

    const priceMap = new Map(overrides?.map(o => [o.category_id, o.registration_fee]) ?? []);

    const allCategories = (rows ?? []).map(r => ({
        ...r,
        registration_fee: priceMap.get(r.id) ?? 0,
    }));

    // Sem atleta: retorna todas as categorias
    if (!athleteId) {
        return { data: allCategories, error: null };
    }

    // Busca perfil do atleta diretamente do banco (mesma abordagem do getEligibleCategoriesAction)
    const { data: athleteRow } = await admin
        .from('profiles')
        .select('id, sexo, belt_color, birth_date, weight')
        .eq('id', athleteId)
        .single();

    if (!athleteRow || !athleteRow.sexo) {
        return { data: allCategories, error: null };
    }

    const athleteProfile = {
        belt_color: athleteRow.belt_color as string | null,
        weight: athleteRow.weight as number | null,
        birth_date: athleteRow.birth_date as string | null,
        sexo: athleteRow.sexo as string | null,
    };

    // Filtra categorias elegíveis. Para cortesia, campos ausentes (peso, nascimento)
    // não eliminam a categoria — a academia pode verificar presencialmente.
    const eligible = await Promise.all(
        allCategories.map(async cat => {
            const { eligible, reasons } = await checkEligibility(athleteProfile, cat as any, event.event_date ?? null);
            if (eligible) return cat;

            const sexBeltOk = reasons.sex && reasons.belt;
            const ageOk = reasons.age || !athleteProfile.birth_date;
            const weightOk = reasons.weight || !athleteProfile.weight;

            return (sexBeltOk && ageOk && weightOk) ? cat : null;
        })
    );

    return { data: eligible.filter(Boolean) as typeof allCategories, error: null };
}

// Busca academias oficiais (tenants) e sugestões (gym_name de atletas)
export async function searchGymsAction(query: string) {
    const { profile } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { data: null, error: 'Sem permissão.' };

    if (!query || query.trim().length < 2) return { data: [], error: null };

    const admin = createAdminClient();
    const q = query.trim();

    const [tenantsResult, suggestionsResult] = await Promise.all([
        admin
            .from('tenants')
            .select('name')
            .ilike('name', `%${q}%`)
            .order('name', { ascending: true })
            .limit(10),
        admin
            .from('profiles')
            .select('gym_name')
            .ilike('gym_name', `%${q}%`)
            .not('gym_name', 'is', null)
            .is('tenant_id', null)
            .eq('role', 'atleta')
            .limit(10),
    ]);

    const officialNames = new Set((tenantsResult.data ?? []).map(t => t.name));
    const suggestions = (suggestionsResult.data ?? [])
        .map(p => p.gym_name as string)
        .filter(name => name && !officialNames.has(name));

    const uniqueSuggestions = [...new Set(suggestions)];

    const results: { name: string; type: 'oficial' | 'sugestao' }[] = [
        ...(tenantsResult.data ?? []).map(t => ({ name: t.name, type: 'oficial' as const })),
        ...uniqueSuggestions.map(name => ({ name, type: 'sugestao' as const })),
    ];

    return { data: results, error: null };
}

// Cria um atleta sem vínculo com academia (para cortesia)
export async function createCourtesyAthleteAction(formData: FormData) {
    const { profile } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    const full_name = (formData.get('full_name') as string)?.trim();
    const birth_date = formData.get('birth_date') as string;
    const belt_color = formData.get('belt_color') as string;
    const weight = formData.get('weight') as string;
    const sexo = formData.get('sexo') as string;
    const cpf = (formData.get('cpf') as string || '').replace(/\D/g, '');
    const gym_name = (formData.get('gym_name') as string)?.trim() || null;
    const has_guardian = formData.get('has_guardian') === 'on';
    const guardian_name = has_guardian ? ((formData.get('guardian_name') as string) || null) : null;
    const guardian_cpf = has_guardian ? ((formData.get('guardian_cpf') as string || '').replace(/\D/g, '') || null) : null;
    const guardian_phone = has_guardian ? ((formData.get('guardian_phone') as string || '').replace(/\D/g, '') || null) : null;
    const guardian_relationship = has_guardian ? ((formData.get('guardian_relationship') as string) || null) : null;

    if (!full_name) return { error: 'Nome é obrigatório.' };
    if (!sexo) return { error: 'Sexo é obrigatório.' };
    if (has_guardian && (!guardian_name || !guardian_cpf || !guardian_phone)) {
        return { error: 'Preencha nome, CPF e telefone do responsável legal.' };
    }

    // Email temporário — atleta pode receber acesso real depois
    const randomStr = Math.random().toString(36).substring(2, 10);
    const email = `${randomStr}-${Date.now()}@dummy.competir.com`;
    const password = Math.random().toString(36).slice(-10) + 'A1!@';

    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            role: 'atleta',
            full_name,
            birth_date,
            belt_color,
            weight: weight ? parseFloat(weight) : null,
            sexo,
            cpf,
        },
        email_confirm: true,
    });

    if (authError) {
        if (authError.message.includes('already been registered')) {
            return { error: 'Já existe um cadastro com este CPF/email.' };
        }
        return { error: 'Erro ao criar atleta. Tente novamente.' };
    }

    if (!user) return { error: 'Erro inesperado ao criar atleta.' };

    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: user.id,
            role: 'atleta',
            full_name,
            tenant_id: null, // Atleta de cortesia não pertence à academia
            birth_date: birth_date || null,
            belt_color: belt_color || null,
            weight: weight ? parseFloat(weight) : null,
            sexo,
            cpf: cpf || null,
            gym_name,
            has_guardian,
            guardian_name,
            guardian_cpf,
            guardian_phone,
            guardian_relationship,
        });

    if (profileError) {
        await adminClient.auth.admin.deleteUser(user.id);
        return { error: 'Erro ao salvar dados do atleta.' };
    }

    // Gera declaração de responsável para menores
    if (birth_date && isUnder18(birth_date)) {
        try {
            await generateGuardianDeclaration({
                adminClient,
                athleteId: user.id,
                athleteName: full_name,
                academyName: null,
                hasGuardian: has_guardian,
                guardianName: guardian_name,
                guardianCpf: guardian_cpf,
                guardianRelationship: guardian_relationship,
                guardianPhone: guardian_phone,
                templateType: 'self_register',
            });
        } catch (err) {
            auditLog('GUARDIAN_DECLARATION_FAILED', {
                athlete_id: user.id,
                error: err instanceof Error ? err.message : String(err),
            }, 'error');
        }
    }

    return { success: true, athleteId: user.id, athleteName: full_name };
}

// Cria a inscrição de cortesia (status: isento)
export async function createCourtesyRegistrationAction({
    eventId,
    athleteId,
    categoryId,
    reason,
}: {
    eventId: string;
    athleteId: string;
    categoryId: string;
    reason: string;
}) {
    const { profile, tenant_id } = await requireTenantScope();
    if (profile.role !== 'academia/equipe') return { error: 'Sem permissão.' };

    const admin = createAdminClient();

    // Verifica que o evento pertence à academia
    const { data: event } = await admin
        .from('events')
        .select('tenant_id, title')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) {
        return { error: 'Você não é organizador deste evento.' };
    }

    // Verifica que o atleta existe
    const { data: athlete } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('id', athleteId)
        .eq('role', 'atleta')
        .single();

    if (!athlete) return { error: 'Atleta não encontrado.' };

    // Verifica duplicata de inscrição ativa
    const { data: existing } = await admin
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId)
        .eq('category_id', categoryId)
        .in('status', ['pago', 'aguardando_pagamento', 'confirmado', 'isento', 'pendente'])
        .maybeSingle();

    if (existing) {
        return { error: 'Este atleta já possui inscrição ativa nesta categoria.' };
    }

    // Busca o preço original para snapshot (cortesia não cobra, mas registra o valor)
    const { data: override } = await admin
        .from('event_category_overrides')
        .select('registration_fee')
        .eq('event_id', eventId)
        .eq('category_id', categoryId)
        .maybeSingle();

    const price = override?.registration_fee ?? 0;

    const { error: insertError } = await admin
        .from('event_registrations')
        .insert({
            event_id: eventId,
            athlete_id: athleteId,
            category_id: categoryId,
            registered_by: profile.id,
            tenant_id,
            status: 'isento',
            price,
        });

    if (insertError) {
        console.error('Courtesy registration error:', insertError);
        return { error: 'Erro ao criar inscrição de cortesia.' };
    }

    auditLog('PAYMENT_FREE_CONFIRMED', {
        type: 'courtesy',
        event_id: eventId,
        event_title: event.title,
        athlete_id: athleteId,
        athlete_name: athlete.full_name,
        category_id: categoryId,
        reason,
        registered_by: profile.id,
    });

    revalidatePath('/academia-equipe/dashboard/cortesias');
    return { success: true };
}

// Retorna as cortesias já dadas pela academia
export async function getCourtesyRegistrationsAction(eventId?: string) {
    const { tenant_id } = await requireTenantScope();
    const admin = createAdminClient();

    let query = admin
        .from('event_registrations')
        .select(`
            id,
            status,
            price,
            created_at,
            event_id,
            events ( title, event_date ),
            athlete:profiles!athlete_id ( id, full_name, belt_color, sexo, gym_name ),
            category:category_rows!category_id ( categoria_completa )
        `)
        .eq('tenant_id', tenant_id)
        .eq('status', 'isento')
        .order('created_at', { ascending: false });

    if (eventId) {
        query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

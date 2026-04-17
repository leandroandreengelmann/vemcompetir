'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';

export async function exportEventRegistrationsCSV(eventId: string) {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('event_registrations')
        .select(`
            registration_number,
            status,
            created_at,
            category_id,
            registered_by,
            athlete:profiles!athlete_id(full_name, cpf, phone, gym_name, belt_color, weight, birth_date, sexo),
            category:category_rows!category_id(sexo, idade, divisao_idade, faixa, categoria_peso, peso_min_kg, peso_max_kg, uniforme, categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', ['pago', 'confirmado', 'isento'])
        .order('registration_number', { ascending: true });

    if (error) {
        console.error('Export error:', error);
        return { error: 'Erro ao exportar dados.' };
    }

    // Buscar nomes de quem inscreveu (registered_by)
    const registeredByIds = [...new Set((data || []).map((r: any) => r.registered_by).filter(Boolean))];
    const registeredByMap = new Map<string, { full_name: string; gym_name: string }>();
    if (registeredByIds.length > 0) {
        const { data: profiles } = await admin
            .from('profiles')
            .select('id, full_name, gym_name')
            .in('id', registeredByIds);
        (profiles || []).forEach((p: any) => {
            registeredByMap.set(p.id, { full_name: p.full_name || '', gym_name: p.gym_name || '' });
        });
    }

    const formatCPF = (cpf: string | null) => {
        if (!cpf) return '';
        const c = cpf.replace(/\D/g, '');
        if (c.length !== 11) return cpf;
        return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const formatPhone = (phone: string | null) => {
        if (!phone) return '';
        const p = phone.replace(/\D/g, '');
        if (p.length === 11) return p.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        if (p.length === 10) return p.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return phone;
    };

    const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };

    const formatDate = (date: string | null) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    };

    const formatDateTime = (date: string | null) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('pt-BR');
    };

    const header = 'Nº,Atleta,CPF,Telefone,Data Nascimento,Sexo Atleta,Academia,Faixa,Peso,Sexo Categoria,Idade,Divisão Idade,Faixa Categoria,Categoria Peso,Peso Min (kg),Peso Max (kg),Uniforme,Categoria Completa,Inscrito Por,Academia Inscritora,Data Inscrição,Status';

    const rows = (data || []).map((reg: any) => {
        const athlete = reg.athlete;
        const category = reg.category;
        const registeredBy = registeredByMap.get(reg.registered_by);
        const num = reg.registration_number != null ? `#${String(reg.registration_number).padStart(3, '0')}` : '';

        return [
            num,
            escapeCSV(athlete?.full_name || ''),
            formatCPF(athlete?.cpf),
            formatPhone(athlete?.phone),
            formatDate(athlete?.birth_date),
            escapeCSV(athlete?.sexo || ''),
            escapeCSV(athlete?.gym_name || ''),
            escapeCSV(athlete?.belt_color || ''),
            athlete?.weight ? `${athlete.weight}kg` : '',
            escapeCSV(category?.sexo || ''),
            category?.idade || '',
            escapeCSV(category?.divisao_idade || ''),
            escapeCSV(category?.faixa || ''),
            escapeCSV(category?.categoria_peso || ''),
            category?.peso_min_kg != null ? category.peso_min_kg : '',
            category?.peso_max_kg != null ? category.peso_max_kg : '',
            escapeCSV(category?.uniforme || ''),
            escapeCSV(category?.categoria_completa || ''),
            escapeCSV(registeredBy?.full_name || ''),
            escapeCSV(registeredBy?.gym_name || ''),
            formatDateTime(reg.created_at),
            reg.status,
        ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    return { csv, count: rows.length };
}

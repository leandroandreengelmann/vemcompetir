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
            athlete:profiles!athlete_id(full_name, cpf, phone, gym_name, belt_color, weight),
            category:category_rows!category_id(categoria_completa)
        `)
        .eq('event_id', eventId)
        .in('status', ['pago', 'confirmado', 'isento'])
        .order('registration_number', { ascending: true });

    if (error) {
        console.error('Export error:', error);
        return { error: 'Erro ao exportar dados.' };
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

    const header = 'Nº,Atleta,CPF,Telefone,Academia,Faixa,Peso,Category ID,Categoria,Status';

    const rows = (data || []).map((reg: any) => {
        const athlete = reg.athlete;
        const category = reg.category;
        const num = reg.registration_number != null ? `#${String(reg.registration_number).padStart(3, '0')}` : '';

        return [
            num,
            escapeCSV(athlete?.full_name || ''),
            formatCPF(athlete?.cpf),
            formatPhone(athlete?.phone),
            escapeCSV(athlete?.gym_name || ''),
            escapeCSV(athlete?.belt_color || ''),
            athlete?.weight ? `${athlete.weight}kg` : '',
            reg.category_id || '',
            escapeCSV(category?.categoria_completa || ''),
            reg.status,
        ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    return { csv, count: rows.length };
}

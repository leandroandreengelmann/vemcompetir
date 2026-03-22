import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createAdminClient } from '@/lib/supabase/admin';

const RELATIONSHIP_LABELS: Record<string, string> = {
    pai: 'Pai',
    mae: 'Mãe',
    irmao: 'Irmão/Irmã',
    tio: 'Tio/Tia',
    padrinho: 'Padrinho/Madrinha',
    outro: 'Outro',
};

export function isUnder18(birthDateStr: string | null | undefined): boolean {
    if (!birthDateStr) return false;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
}

export async function generateGuardianDeclaration({
    adminClient,
    athleteId,
    athleteName,
    academyName,
    hasGuardian,
    guardianName,
    guardianCpf,
    guardianRelationship,
    guardianPhone,
    templateType = 'academy',
}: {
    adminClient: ReturnType<typeof createAdminClient>;
    athleteId: string;
    athleteName: string;
    academyName: string | null;
    hasGuardian: boolean;
    guardianName: string | null;
    guardianCpf: string | null;
    guardianRelationship: string | null;
    guardianPhone: string | null;
    templateType?: 'academy' | 'self_register';
}) {
    const { data: template } = await adminClient
        .from('guardian_term_templates')
        .select('content')
        .eq('is_active', true)
        .eq('type', templateType)
        .single();

    const templateContent = template?.content ?? '';
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const responsibleName = hasGuardian && guardianName ? guardianName : (academyName ?? 'Academia/Equipe');
    const responsibleCpf = hasGuardian && guardianCpf
        ? guardianCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
        : '—';
    const responsibleRelationship = hasGuardian && guardianRelationship
        ? (RELATIONSHIP_LABELS[guardianRelationship] ?? guardianRelationship)
        : 'Academia/Equipe';
    const responsiblePhone = hasGuardian && guardianPhone ? guardianPhone : '—';

    const content = templateContent
        .replace(/{{atleta_nome}}/g, athleteName)
        .replace(/{{responsavel_nome}}/g, responsibleName)
        .replace(/{{responsavel_cpf}}/g, responsibleCpf)
        .replace(/{{responsavel_vinculo}}/g, responsibleRelationship)
        .replace(/{{responsavel_telefone}}/g, responsiblePhone)
        .replace(/{{academia_nome}}/g, academyName ?? 'Plataforma Competir')
        .replace(/{{data}}/g, today);

    const { error } = await adminClient
        .from('athlete_guardian_declarations')
        .upsert({
            athlete_id: athleteId,
            responsible_type: hasGuardian && guardianName ? 'guardian' : 'academy',
            responsible_name: responsibleName,
            responsible_cpf: hasGuardian ? guardianCpf : null,
            responsible_relationship: hasGuardian ? guardianRelationship : 'academia',
            responsible_phone: hasGuardian ? guardianPhone : null,
            content,
            generated_at: new Date().toISOString(),
        }, { onConflict: 'athlete_id' });

    if (error) {
        console.error('[guardian-declarations] upsert error:', error);
    }
}

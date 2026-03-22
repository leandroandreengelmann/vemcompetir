export type GuardianDeclaration = {
    id: string;
    athlete_id: string;
    athlete_name: string;
    responsible_type: 'guardian' | 'academy';
    responsible_name: string | null;
    responsible_relationship: string | null;
    content: string;
    generated_at: string;
};

import { requireRole } from '@/lib/auth-guards';
import { AcademiaProfileForm } from './profile-form';

export default async function AcademiaPerfilPage() {
    // Only academia/equipe (and admin) should access this specific profile page
    const { user, profile } = await requireRole(['academia/equipe', 'admin_geral']);

    if (!profile) {
        return (
            <div className="p-6">
                <h1 className="text-panel-md font-bold text-destructive mb-2">Erro</h1>
                <p className="text-panel-sm text-card-foreground">Perfil não encontrado no sistema.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h2 className="text-panel-md font-bold tracking-tight">Meu Perfil</h2>
                    <p className="text-panel-sm text-muted-foreground">
                        Gerencie suas informações pessoais e credenciais da academia.
                    </p>
                </div>

                <AcademiaProfileForm profile={{
                    cpf: profile.cpf,
                    email: user.email ?? null,
                    gym_name: profile.gym_name ?? null,
                    phone: profile.phone ?? null,
                }} />
            </div>
        </div>
    );
}

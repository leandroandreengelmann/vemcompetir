import Link from 'next/link';
import { requireRole } from '@/lib/auth-guards';
import { Button } from "@/components/ui/button";
import { AthleteProfileForm } from '../profile-form';
import { CountryFlag } from '@/components/ui/country-flag';
import { AvatarUploader } from './avatar-uploader';

const BELTS = [
    'Branca', 'Cinza e branca', 'Cinza', 'Cinza e preta', 'Amarela e branca', 'Amarela', 'Amarela e preta',
    'Laranja e branca', 'Laranja', 'Laranja e preta', 'Verde e branca', 'Verde', 'Verde e preta',
    'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha'
];

import { AthletePageHeader } from '../components/athlete-page-header';

export default async function AthletePerfil() {
    // SECURITY: Get session and profile using requireRole
    const { user, profile } = await requireRole('atleta');

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
                <AthletePageHeader
                    title="Meu Perfil"
                    description="Mantenha seus dados atualizados para participar dos eventos."
                    backHref="/atleta/dashboard"
                    // @ts-ignore
                    beltColor={profile?.belt_color || 'branca'}
                />

                {/* @ts-ignore */}
                {profile?.nationality && (
                    <div className="px-2 md:pl-5 -mt-4">
                        {/* @ts-ignore */}
                        <CountryFlag code={profile.nationality} className="text-panel-sm font-semibold text-muted-foreground" />
                    </div>
                )}

                {/* Avatar Uploader */}
                <div className="py-4">
                    <AvatarUploader
                        // @ts-ignore
                        currentUrl={profile?.avatar_url}
                        // @ts-ignore
                        fullName={profile?.full_name}
                        // @ts-ignore
                        beltColor={profile?.belt_color || 'branca'}
                    />
                </div>

                {/* Form Section */}
                <div className="mt-2 text-foreground">
                    <AthleteProfileForm
                        profile={profile}
                        user={user}
                        belts={BELTS}
                    />
                </div>
            </div>
        </div>
    );
}

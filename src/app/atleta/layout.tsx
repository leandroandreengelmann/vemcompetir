
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BeltThemeProvider } from '@/components/belt-theme-provider';
import { redirect } from 'next/navigation';
import { AthleteCartTrigger } from './components/AthleteCartTrigger';
import { AthleteCartSheet } from './components/AthleteCartSheet';
import { AthleteDesktopSidebar } from './components/AthleteDesktopSidebar';
import { AthleteBottomNav } from './components/AthleteBottomNav';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { IMP_ACTIVE, IMP_LABEL } from '@/lib/impersonation-constants';
export default async function AthleteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('belt_color, full_name, avatar_url, nationality')
        .eq('id', user.id)
        .single();

    const cookieStore = await cookies();
    const impersonating = cookieStore.get(IMP_ACTIVE)?.value === '1';
    const impLabel = cookieStore.get(IMP_LABEL)?.value || 'este atleta';

    return (
        <BeltThemeProvider beltColor={profile?.belt_color || 'branca'}>
            {impersonating && (
                <ImpersonationBanner
                    label={impLabel}
                    positionClassName="fixed left-4 bottom-[104px] md:bottom-4"
                />
            )}
            <div className="md:flex md:min-h-screen">
                <AthleteDesktopSidebar
                    fullName={profile?.full_name}
                    avatarUrl={profile?.avatar_url}
                    beltColor={profile?.belt_color || 'branca'}
                    nationality={profile?.nationality}
                />
                <div className="flex-1 min-w-0 md:pl-64 relative pb-[90px] md:pb-0">
                    {children}
                    {/* Floating cart trigger */}
                    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100]">
                        <AthleteCartTrigger />
                    </div>
                    <AthleteCartSheet />
                </div>
                <AthleteBottomNav />
            </div>
        </BeltThemeProvider>
    );
}

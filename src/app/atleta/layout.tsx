
import { createClient } from '@/lib/supabase/server';
import { BeltThemeProvider } from '@/components/belt-theme-provider';
import { redirect } from 'next/navigation';
import { AthleteCartTrigger } from './components/AthleteCartTrigger';
import { AthleteCartSheet } from './components/AthleteCartSheet';
import { AthleteDesktopSidebar } from './components/AthleteDesktopSidebar';
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

    return (
        <BeltThemeProvider beltColor={profile?.belt_color || 'branca'}>
            <div className="md:flex md:min-h-screen">
                <AthleteDesktopSidebar
                    fullName={profile?.full_name}
                    avatarUrl={profile?.avatar_url}
                    beltColor={profile?.belt_color || 'branca'}
                    nationality={profile?.nationality}
                />
                <div className="flex-1 min-w-0 md:pl-64 relative">
                    {children}
                    {/* Floating cart trigger */}
                    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100]">
                        <AthleteCartTrigger />
                    </div>
                    <AthleteCartSheet />
                </div>
            </div>
        </BeltThemeProvider>
    );
}

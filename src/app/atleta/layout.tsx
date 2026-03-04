
import { createClient } from '@/lib/supabase/server';
import { BeltThemeProvider } from '@/components/belt-theme-provider';
import { redirect } from 'next/navigation';
import { AthleteCartTrigger } from './components/AthleteCartTrigger';
import { AthleteCartSheet } from './components/AthleteCartSheet';

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
        .select('belt_color')
        .eq('id', user.id)
        .single();

    return (
        <BeltThemeProvider beltColor={profile?.belt_color || 'branca'}>
            {children}
            {/* Floating cart trigger */}
            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100]">
                <AthleteCartTrigger />
            </div>
            <AthleteCartSheet />
        </BeltThemeProvider>
    );
}

import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowRight, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

interface InterestNotificationProps {
    beltColor?: string;
}

export async function InterestNotificationWrapper({ beltColor = 'branca' }: InterestNotificationProps) {
    const cookieStore = await cookies();
    const interestId = cookieStore.get('interested_event_id')?.value;

    if (!interestId) return null;

    const supabase = await createClient();
    const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', interestId)
        .single();

    if (!event) return null;

    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca' || beltColor.toLowerCase().trim() === 'white';

    return (
        <div className="w-full max-w-lg md:max-w-4xl px-4 z-20 mb-6 animate-in slide-in-from-top-4 fade-in duration-500">
            <Link href={`/atleta/dashboard/campeonatos/${interestId}`}>
                <div className="bg-primary/5 border border-primary/20 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:bg-primary/10 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isWhiteBelt ? 'bg-brand-950' : 'bg-primary'}`}>
                            <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-label font-bold tracking-widest text-muted-foreground">
                                Inscrição pendente
                            </span>
                            <span className="text-ui font-bold text-natural-800 truncate">
                                {event.title}
                            </span>
                        </div>
                    </div>
                    <ArrowRight className={`h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1 ${isWhiteBelt ? 'text-brand-950' : 'text-primary'}`} />
                </div>
            </Link>
        </div>
    );
}

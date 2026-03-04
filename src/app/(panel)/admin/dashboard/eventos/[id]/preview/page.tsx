import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import AthleteEventDetail from '@/app/atleta/dashboard/campeonatos/components/AthleteEventDetail';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { ChevronLeft, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminEventPreviewPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { user } = await requireRole('admin_geral');
    const supabase = await createClient();

    // Fetch event - Admin can see any status
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error || !event) notFound();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Admin Preview Header Overlay */}
            <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between z-[60] sticky top-0 border-b border-amber-600/20 shadow-sm">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-label uppercase tracking-wider">Modo de Prévia (Administrador)</span>
                </div>
                <Badge variant="outline" className="bg-amber-600/10 border-amber-600/20 text-amber-900 text-label uppercase px-2 py-0 h-5">
                    Status: {event.status}
                </Badge>
            </div>

            <div className="p-4 bg-white/50 backdrop-blur-sm border-b sticky top-9 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button pill variant="ghost" size="sm" asChild>
                        <Link href={`/admin/dashboard/eventos/${event.id}/editar`}>
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Voltar para Edição
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex-1 pb-10">
                <AthleteEventDetail event={event} />
            </div>
        </div>
    );
}

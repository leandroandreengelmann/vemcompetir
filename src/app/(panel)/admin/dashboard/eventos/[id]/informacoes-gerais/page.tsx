import { requireRole } from "@/lib/auth-guards";
import { SectionHeader } from "@/components/layout/SectionHeader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { GeneralInfoManager } from "./components/general-info-manager";

export default async function InformacoesGeraisPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    // Proteção de acesso: apenas superadmin (admin_geral)
    const { profile } = await requireRole("admin_geral");

    const supabase = createAdminClient();

    // 1. Verificar se o evento existe
    const { data: event } = await supabase
        .from('events')
        .select('id, title, tenant_id')
        .eq('id', id)
        .single();

    if (!event) notFound();

    // 2. Buscar tópicos (General Infos)
    const { data: topics } = await supabase
        .from('event_general_infos')
        .select('*')
        .eq('event_id', id)
        .order('sort_order', { ascending: true });

    const topicsList = topics || [];

    // 3. Buscar assets vinculados
    const { data: assets } = await supabase
        .from('event_general_info_assets')
        .select('*')
        .eq('event_id', id)
        .order('sort_order', { ascending: true });

    // Vincular assets aos tópicos (com URL pública calculada no servidor)
    const topicsWithAssets = topicsList.map(topic => ({
        ...topic,
        assets: (assets || [])
            .filter(asset => asset.info_id === topic.id)
            .map(asset => ({
                ...asset,
                public_url: supabase.storage
                    .from('event-images')
                    .getPublicUrl(asset.storage_path).data.publicUrl
            }))
    }));

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-3xl space-y-10">
                <div className="space-y-6">
                    <Link
                        href={`/admin/dashboard/eventos/${id}/editar`}
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Edição
                    </Link>

                    <SectionHeader
                        title="Informações gerais"
                        description={`Configure tópicos com texto e anexos para: ${event.title}`}
                        className="text-center md:flex-col md:items-center"
                    />
                </div>

                <GeneralInfoManager
                    eventId={event.id}
                    tenantId={event.tenant_id}
                    initialInfos={topicsWithAssets}
                />
            </div>
        </div>
    );
}

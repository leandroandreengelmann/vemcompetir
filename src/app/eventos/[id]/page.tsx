import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Info, Trophy, Users, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { getPublishedEventById, getEventByIdAdmin } from '../_data/events';
import { getEventCoverUrl } from '../_data/event-utils';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SubscribeButton } from '../_components/subscribe-button';
import { Eye } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import sanitizeHtml from 'sanitize-html';

export const revalidate = 1; // Revalidação quase instantânea para testes

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PublicEventDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is admin/organizer
    let isAdmin = false;
    let profile = null;

    if (user) {
        const { data: profileVal } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        profile = profileVal;
        isAdmin = ['admin_geral', 'organizador', 'academia/equipe'].includes(profile?.role || '');
    }

    // Try to get published event first
    let event = await getPublishedEventById(id);

    // If not found and user is admin, try to get by ID regardless of status
    if (!event && isAdmin) {
        event = await getEventByIdAdmin(id);
    }

    if (!event) {
        notFound();
    }

    const isPreview = event.status !== 'publicado';

    const { data: topics } = await supabase
        .from('event_general_infos')
        .select('*')
        .eq('event_id', id)
        .order('sort_order', { ascending: true });

    // Buscar anexos relacionados
    const { data: assets } = await supabase
        .from('event_general_info_assets')
        .select('*')
        .eq('event_id', id)
        .order('sort_order', { ascending: true });

    // Agrupar anexos por tópico (com URL pública calculada no servidor)
    const topicsWithAssets = (topics || []).map(topic => ({
        ...topic,
        images: (assets || [])
            .filter(a => a.info_id === topic.id && a.asset_type === 'image')
            .map(a => ({
                ...a,
                public_url: supabase.storage
                    .from('event-images')
                    .getPublicUrl(a.storage_path).data.publicUrl
            })),
        files: (assets || [])
            .filter(a => a.info_id === topic.id && a.asset_type === 'pdf')
            .map(a => ({
                ...a,
                public_url: supabase.storage
                    .from('event-images')
                    .getPublicUrl(a.storage_path).data.publicUrl
            }))
    }));

    const coverUrl = getEventCoverUrl(event.cover_image_path || null);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            {isPreview && (
                <div className="bg-amber-500 text-amber-950 px-6 py-2 flex items-center justify-center gap-3 z-[60] sticky top-[var(--header-height,90px)] border-b border-amber-600/20 shadow-sm">
                    <Eye className="h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                        Modo de Prévia (Administrador) — Este evento ainda não está publicado
                    </span>
                    <div className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-500 text-[9px] font-black uppercase tracking-tighter">
                        Draft
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-7xl mx-auto px-6 py-24 pt-[calc(var(--header-height,90px)+4rem)] w-full">
                {/* Content starts here */}

                <div className="space-y-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-stretch">

                        {/* Hero Image Section */}
                        <div className="lg:col-span-5">
                            <div className="relative aspect-square overflow-hidden rounded-[7px] border bg-card shadow-2xl ring-1 ring-black/5 h-full">
                                {coverUrl ? (
                                    <img
                                        src={coverUrl}
                                        alt={event.title}
                                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center p-12 bg-muted/30">
                                        <Trophy className="h-24 w-24 text-muted-foreground/20" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Section - Distributed vertically */}
                        <div className="lg:col-span-7 flex flex-col justify-between gap-12 py-2">
                            {/* Title & Core Meta */}
                            <div className="space-y-8">
                                <h1 className="text-h1 font-black tracking-tighter leading-[1.05] lg:text-5xl">
                                    {event.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-2">
                                    <div>
                                        <p className="text-label text-muted-foreground/60 mb-2">Data do Evento</p>
                                        <p className="text-h3 font-black text-foreground">
                                            {event.starts_at ? format(new Date(event.starts_at), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'A definir'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-label text-muted-foreground/60 mb-2">Localização</p>
                                        <p className="text-h3 font-black text-foreground">
                                            {event.venue_name || 'Local a definir'}{event.city ? `, ${event.city}` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* CTA & Social Proof */}
                            <div className="space-y-4">
                                <div className="p-10 rounded-[7px] bg-muted/30 border border-border/50 flex flex-col sm:flex-row items-center gap-12 group transition-all hover:bg-muted/40 hover:border-border/80">
                                    <div className="flex flex-col sm:flex-row items-center gap-12 w-full sm:w-auto">
                                        <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                                            <SubscribeButton eventId={event.id} isLoggedIn={!!user} />
                                        </div>

                                        <div className="flex items-center gap-5">
                                            <div className="flex -space-x-4">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="h-12 w-12 rounded-full border-4 border-white bg-neutral-200 ring-1 ring-black/5 flex items-center justify-center overflow-hidden grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                                                        <Users className="h-6 w-6 text-neutral-400" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-ui font-black text-foreground">+50 Atletas</p>
                                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Inscritos</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground/60 font-medium text-center sm:text-left px-2">
                                    * Verificação instantânea após o pagamento
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* General Info Topics - Full Width Accordion */}
                    <div className="space-y-12 py-24 border-t">
                        <div className="max-w-4xl mx-auto w-full space-y-12">
                            <div className="flex flex-col gap-2 mb-8 px-6">
                                <h2 className="text-h1 font-black uppercase tracking-widest text-foreground">
                                    Informações Gerais
                                </h2>
                                <div className="h-2 w-16 bg-foreground rounded-full" />
                            </div>

                            {topicsWithAssets && topicsWithAssets.length > 0 ? (
                                <Accordion
                                    type="multiple"
                                    className="w-full space-y-4"
                                    defaultValue={[topicsWithAssets[0].id]}
                                >
                                    {topicsWithAssets.map((topic) => (
                                        <AccordionItem
                                            key={topic.id}
                                            value={topic.id}
                                            className="border-b-2 border-black/20 bg-transparent last:border-none"
                                        >
                                            <AccordionTrigger className="px-6 hover:no-underline [&>svg]:size-10 [&>svg]:text-primary/70">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-6 w-1 bg-primary rounded-full" />
                                                    <span className="text-h3 font-black uppercase tracking-widest text-foreground">
                                                        {topic.title}
                                                    </span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pb-10 pt-10 space-y-12">
                                                {(() => {
                                                    // Content extraction with fallback
                                                    let htmlToShow = topic.content || '';

                                                    if (!htmlToShow && topic.text_content_json) {
                                                        try {
                                                            const json = typeof topic.text_content_json === 'string'
                                                                ? JSON.parse(topic.text_content_json)
                                                                : topic.text_content_json;

                                                            if (json.content && Array.isArray(json.content)) {
                                                                htmlToShow = json.content
                                                                    .map((n: any) => n.content?.map((c: any) => c.text).join('') || '')
                                                                    .filter(Boolean)
                                                                    .map((t: string) => `<p>${t}</p>`)
                                                                    .join('');
                                                            }
                                                        } catch (e) {
                                                            console.error("Error processing fallback JSON", e);
                                                        }
                                                    }

                                                    if (!htmlToShow) return null;

                                                    return (
                                                        <div
                                                            className="text-body text-neutral-600 leading-relaxed prose prose-neutral max-w-none 
                                                                        prose-p:my-4 prose-headings:mb-6 prose-headings:mt-10 first:prose-headings:mt-0 
                                                                        prose-strong:text-foreground prose-headings:text-foreground
                                                                        prose-ul:my-6 prose-li:my-2"
                                                            dangerouslySetInnerHTML={{
                                                                __html: sanitizeHtml(htmlToShow, {
                                                                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['span', 'u', 'h1', 'h2', 'h3', 'h4', 'br']),
                                                                    allowedAttributes: {
                                                                        ...sanitizeHtml.defaults.allowedAttributes,
                                                                        '*': ['style', 'class'],
                                                                    },
                                                                    allowedStyles: {
                                                                        '*': {
                                                                            'color': [/^#/i, /^rgb\(/i, /^hsl\(/i],
                                                                            'font-size': [/.*/],
                                                                            'text-align': [/.*/],
                                                                            'background-color': [/.*/],
                                                                            'margin': [/.*/],
                                                                            'padding': [/.*/]
                                                                        }
                                                                    }
                                                                })
                                                            }}
                                                        />
                                                    );
                                                })()}

                                                {/* Attachment Display */}
                                                {(topic.images.length > 0 || topic.files.length > 0) && (
                                                    <div className="space-y-10">
                                                        {/* Image Gallery */}
                                                        {topic.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-6">
                                                                {topic.images.map((img: any) => (
                                                                    <div key={img.id} className="">
                                                                        <img
                                                                            src={`${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()}/storage/v1/object/public/event-images/${img.storage_path}`}
                                                                            alt={img.file_name}
                                                                            className="max-w-full h-auto block"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* PDF Files with Preview */}
                                                        {topic.files.length > 0 && (
                                                            <div className="space-y-12">
                                                                {topic.files.map((file: any) => {
                                                                    const fileUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()}/storage/v1/object/public/event-images/${file.storage_path}`;
                                                                    return (
                                                                        <div key={file.id} className="flex flex-col gap-4">
                                                                            {/* Action Buttons Header */}
                                                                            <div className="flex items-center justify-end gap-3 px-2">
                                                                                <a
                                                                                    href={fileUrl}
                                                                                    download={file.file_name}
                                                                                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-wider shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                                                >
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                    Baixar Documento
                                                                                </a>
                                                                            </div>

                                                                            {/* PDF Preview Frame */}
                                                                            <div className="w-full aspect-[1/1.4] sm:aspect-auto sm:h-[800px] rounded-[12px] overflow-hidden border bg-muted/5 shadow-inner relative group">
                                                                                <iframe
                                                                                    src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                                                    className="w-full h-full border-none"
                                                                                    title="Preview do Documento"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="text-center py-20 bg-muted/20 rounded-[7px] border border-dashed">
                                    <div className="h-16 w-16 bg-background rounded-full border flex items-center justify-center mx-auto mb-6 shadow-sm">
                                        <Info className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <h3 className="text-h3 font-black uppercase tracking-widest text-foreground mb-2">Informações em Breve</h3>
                                    <p className="text-body text-muted-foreground max-w-sm mx-auto">
                                        Fique atento! Todas as diretrizes e detalhes do evento serão publicados aqui.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA (Serial Position Effect / Recency) */}
                    <div className="py-20 border-t flex flex-col items-center gap-10 text-center">
                        <div className="space-y-3">
                            <h2 className="text-2xl font-black tracking-tight uppercase">Pronto para competir?</h2>
                            <p className="text-body text-muted-foreground mx-auto">Garanta sua vaga agora mesmo e comece sua preparação.</p>
                        </div>
                        <SubscribeButton eventId={event.id} isLoggedIn={!!user} />
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

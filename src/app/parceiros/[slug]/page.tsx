import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, GlobeIcon, WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr';
import { getSponsorBySlug } from '@/lib/dal/sponsors';
import { sponsorLogoUrl, whatsappLink } from '@/lib/sponsors';

export const revalidate = 300;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const { slug } = await props.params;
    const sponsor = await getSponsorBySlug(slug);
    if (!sponsor) return { title: 'Parceiro não encontrado' };
    return {
        title: `${sponsor.name} — Parceiro`,
        description: sponsor.description ?? undefined,
    };
}

export default async function SponsorDetailPage(props: PageProps) {
    const { slug } = await props.params;
    const sponsor = await getSponsorBySlug(slug);
    if (!sponsor) notFound();

    const wa = whatsappLink(sponsor.whatsapp);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-[calc(var(--header-height,90px)+2rem)] pb-16 sm:pb-24">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                    <ArrowLeftIcon size={18} weight="bold" />
                    Voltar
                </Link>

                <div className="flex flex-col items-center text-center">
                    {/* Logo */}
                    <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-2xl bg-white p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={sponsorLogoUrl(sponsor.logo_path)}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>

                    <h1 className="mt-8 text-3xl sm:text-4xl font-bold tracking-tight">{sponsor.name}</h1>

                    {sponsor.description && (
                        <div
                            className="mt-6 max-w-2xl text-left text-base sm:text-lg text-muted-foreground leading-relaxed
                                       prose prose-neutral dark:prose-invert max-w-none
                                       prose-headings:text-foreground prose-strong:text-foreground
                                       prose-p:my-3 prose-ul:my-4 prose-li:my-1"
                            dangerouslySetInnerHTML={{ __html: sponsor.description }}
                        />
                    )}

                    {(sponsor.link_url || wa) && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                            {wa && (
                                <Button pill asChild className="w-full sm:flex-1 h-12 bg-[#25D366] text-white hover:bg-[#25D366]/90">
                                    <a href={wa} target="_blank" rel="noopener noreferrer">
                                        <WhatsappLogoIcon size={20} weight="fill" className="mr-2" />
                                        WhatsApp
                                    </a>
                                </Button>
                            )}
                            {sponsor.link_url && (
                                <Button pill variant="outline" asChild className="w-full sm:flex-1 h-12">
                                    <a href={sponsor.link_url} target="_blank" rel="noopener noreferrer">
                                        <GlobeIcon size={20} weight="bold" className="mr-2" />
                                        Visitar site
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

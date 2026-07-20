import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    StackSimpleIcon,
    TShirtIcon,
    GearIcon,
    StorefrontIcon,
    ArrowRightIcon,
    WarningIcon,
    InfoIcon,
    EyeIcon,
} from '@phosphor-icons/react/dist/ssr';

export default async function LojaHubPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const [{ count: catCount }, { count: prodCount }, { data: settings }] = await Promise.all([
        admin.from('store_categories').select('id', { count: 'exact', head: true }),
        admin.from('store_products').select('id', { count: 'exact', head: true }),
        admin.from('store_settings').select('is_enabled, whatsapp_number').limit(1).maybeSingle(),
    ]);

    const cards = [
        {
            label: 'Produtos',
            desc: 'Cadastre e edite os produtos, fotos, preços e variações.',
            href: '/admin/dashboard/loja/produtos',
            icon: TShirtIcon,
            count: prodCount ?? 0,
        },
        {
            label: 'Categorias',
            desc: 'Organize os produtos em categorias (kimonos, faixas...).',
            href: '/admin/dashboard/loja/categorias',
            icon: StackSimpleIcon,
            count: catCount ?? 0,
        },
        {
            label: 'Configurações',
            desc: 'Número de WhatsApp, nome da loja e ligar/desligar a loja.',
            href: '/admin/dashboard/loja/configuracoes',
            icon: GearIcon,
            count: null,
        },
    ];

    const enabled = !!settings?.is_enabled;
    const hasPhone = !!settings?.whatsapp_number;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Loja Virtual"
                description="Gestão da lojinha de kimonos e artigos de jiu-jitsu."
                rightElement={
                    <div className="flex items-center gap-3">
                        <Badge variant={enabled ? 'default' : 'secondary'} className="gap-1">
                            <StorefrontIcon size={14} weight="bold" />
                            {enabled ? 'Loja ativa' : 'Loja desligada'}
                        </Badge>
                        <Button asChild variant="outline" pill className="gap-2">
                            <Link href="/loja" target="_blank">
                                <EyeIcon size={18} weight="bold" />
                                Ver na loja
                            </Link>
                        </Button>
                    </div>
                }
            />

            {(!enabled || !hasPhone) && (
                <Card className="border-warning/40 bg-warning/5">
                    <CardContent className="py-4 text-panel-sm text-muted-foreground space-y-2.5">
                        {!hasPhone && (
                            <p className="flex items-center gap-3">
                                <WarningIcon size={28} weight="fill" className="shrink-0 text-warning" />
                                Configure o número de WhatsApp para que o botão “Comprar” funcione.
                            </p>
                        )}
                        {!enabled && (
                            <p className="flex items-center gap-3">
                                <InfoIcon size={28} weight="fill" className="shrink-0 text-primary" />
                                A loja está desligada — os clientes ainda não a veem. Ative em Configurações.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((c) => (
                    <Link key={c.href} href={c.href} className="group">
                        <Card className="h-full transition-colors group-hover:border-primary/50">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                                    <c.icon size={22} weight="duotone" />
                                    {c.label}
                                </CardTitle>
                                {c.count != null && (
                                    <span className="text-2xl font-bold text-primary">{c.count}</span>
                                )}
                            </CardHeader>
                            <CardContent className="flex items-end justify-between gap-2">
                                <p className="text-panel-sm text-muted-foreground">{c.desc}</p>
                                <ArrowRightIcon
                                    size={20}
                                    weight="bold"
                                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                                />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

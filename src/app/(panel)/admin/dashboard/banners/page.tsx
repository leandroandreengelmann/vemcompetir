import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import { HERO_BANNERS_ENABLED_KEY, HERO_BANNERS_INTERVAL_KEY, type HeroBanner } from '@/lib/hero-banners';
import { parseHeroInterval } from '@/lib/dal/hero-banners';
import { BannersManager } from './BannersManager';

export default async function BannersPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const [bannersRes, settingsRes] = await Promise.all([
        admin
            .from('hero_banners')
            .select('*')
            .order('sort_order', { ascending: true }),
        admin
            .from('system_settings')
            .select('key, value')
            .in('key', [HERO_BANNERS_ENABLED_KEY, HERO_BANNERS_INTERVAL_KEY]),
    ]);

    const tableMissing = !!bannersRes.error;
    const settings = new Map(settingsRes.data?.map((s) => [s.key, s.value]));

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Banners da Home"
                description="Gerencie as imagens do topo da página inicial. Com mais de um banner ativo, vira um carrossel automático."
            />
            {tableMissing ? (
                <Card>
                    <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
                        <WarningIcon size={24} className="shrink-0 text-amber-500" weight="fill" />
                        <div>
                            <p className="font-medium text-foreground text-panel-sm">Migração de banco pendente</p>
                            <p className="text-panel-sm">
                                A tabela <code>hero_banners</code> ainda não existe no banco. Aplique a migração para habilitar o gerenciamento de banners. Enquanto isso, a home continua exibindo o topo padrão normalmente.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <BannersManager
                    banners={(bannersRes.data as HeroBanner[]) ?? []}
                    heroEnabled={settings.get(HERO_BANNERS_ENABLED_KEY) === 'true'}
                    intervalSeconds={parseHeroInterval(settings.get(HERO_BANNERS_INTERVAL_KEY))}
                />
            )}
        </div>
    );
}

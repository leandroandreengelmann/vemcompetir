import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import {
    SPONSORS_ENABLED_KEY, SPONSORS_TITLE_KEY, SPONSORS_DEFAULT_TITLE, type Sponsor,
} from '@/lib/sponsors';
import { SponsorsManager } from './SponsorsManager';

export default async function SponsorsPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const [sponsorsRes, settingsRes] = await Promise.all([
        admin
            .from('sponsors')
            .select('*')
            .order('sort_order', { ascending: true }),
        admin
            .from('system_settings')
            .select('key, value')
            .in('key', [SPONSORS_ENABLED_KEY, SPONSORS_TITLE_KEY]),
    ]);

    const tableMissing = !!sponsorsRes.error;
    const settings = new Map(settingsRes.data?.map((s) => [s.key, s.value]));

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Parceiros & Patrocinadores"
                description="Gerencie as logos de academias e parceiros exibidas na página inicial. Todas aparecem em caixas do mesmo tamanho."
            />
            {tableMissing ? (
                <Card>
                    <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
                        <WarningIcon size={24} className="shrink-0 text-amber-500" weight="fill" />
                        <div>
                            <p className="font-medium text-foreground text-panel-sm">Migração de banco pendente</p>
                            <p className="text-panel-sm">
                                A tabela <code>sponsors</code> ainda não existe no banco. Aplique a migração para habilitar o gerenciamento de parceiros.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <SponsorsManager
                    sponsors={(sponsorsRes.data as Sponsor[]) ?? []}
                    enabled={settings.get(SPONSORS_ENABLED_KEY) === 'true'}
                    title={settings.get(SPONSORS_TITLE_KEY)?.trim() || SPONSORS_DEFAULT_TITLE}
                />
            )}
        </div>
    );
}

import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { SettingsForm } from './SettingsForm';
import type { StoreSettings } from '@/lib/store';

export default async function LojaConfigPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data } = await admin.from('store_settings').select('*').limit(1).maybeSingle();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Configurações da Loja"
                description="Número de WhatsApp, nome e status da loja."
                rightElement={
                    <Button asChild variant="ghost" pill className="gap-2">
                        <Link href="/admin/dashboard/loja">
                            <CaretLeftIcon size={20} weight="bold" />
                            Voltar
                        </Link>
                    </Button>
                }
            />
            <SettingsForm settings={(data as StoreSettings) ?? null} />
        </div>
    );
}

import { requireRole } from '@/lib/auth-guards';
import { NotificacoesTabs } from './NotificacoesTabs';

export default async function NotificacoesLayout({ children }: { children: React.ReactNode }) {
    await requireRole('admin_geral');
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <div>
                <h1 className="text-panel-lg font-black tracking-tight">Notificações WhatsApp</h1>
                <p className="text-panel-sm text-muted-foreground mt-1">
                    Mensagens automáticas via Evolution API.
                </p>
            </div>
            <NotificacoesTabs />
            <div>{children}</div>
        </div>
    );
}

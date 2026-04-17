import { requireFinancialModule } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ReceiptIcon } from '@phosphor-icons/react/dist/ssr';
import { IssueReceiptForm } from './IssueReceiptForm';

export const dynamic = 'force-dynamic';

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<{ registration?: string }> }) {
    const { tenant_id } = await requireFinancialModule();
    const sp = await searchParams;
    const registrationId = sp.registration;

    let prefill: {
        registrationId: string;
        payerName: string;
        payerDocument: string;
        amount: number;
        description: string;
        eventTitle: string;
        paymentMethodDefault: string;
    } | null = null;

    let errorMsg: string | null = null;

    if (registrationId) {
        const adminSupabase = createAdminClient();
        const { data: reg } = await adminSupabase
            .from('event_registrations')
            .select(`
                id, price, status, tenant_id, event_id, athlete_id, manual_payment_method,
                athlete:profiles!athlete_id(full_name, cpf),
                event:events!event_id(title, tenant_id)
            `)
            .eq('id', registrationId)
            .single();

        if (!reg) {
            errorMsg = 'Inscrição não encontrada.';
        } else {
            const eventTenant = (reg as any).event?.tenant_id;
            if (eventTenant !== tenant_id && reg.tenant_id !== tenant_id) {
                errorMsg = 'Inscrição fora do escopo da sua academia.';
            } else {
                const methodMap: Record<string, string> = {
                    pago: 'pix',
                    paga: 'pix',
                    confirmado: 'pix',
                    pago_em_mao: 'pago_em_mao',
                    pix_direto: 'pix_direto',
                    agendado: 'pix',
                };
                const method = methodMap[reg.status] ?? (reg.manual_payment_method ?? 'pix');

                prefill = {
                    registrationId: reg.id,
                    payerName: (reg as any).athlete?.full_name ?? '',
                    payerDocument: (reg as any).athlete?.cpf ?? '',
                    amount: Number(reg.price || 0),
                    description: `Inscrição em ${(reg as any).event?.title ?? 'evento'}`,
                    eventTitle: (reg as any).event?.title ?? '',
                    paymentMethodDefault: method,
                };
            }
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Emitir Recibo"
                description="Gere um recibo numerado para a transação selecionada."
                icon={ReceiptIcon as any}
                rightElement={
                    <Link href="/academia-equipe/dashboard/financeiro/transacoes">
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar
                        </Button>
                    </Link>
                }
            />

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    {errorMsg ? (
                        <p className="text-panel-sm text-destructive">{errorMsg}</p>
                    ) : !prefill ? (
                        <p className="text-panel-sm text-muted-foreground">
                            Selecione uma transação na página de transações para emitir um recibo.
                        </p>
                    ) : (
                        <IssueReceiptForm prefill={prefill} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

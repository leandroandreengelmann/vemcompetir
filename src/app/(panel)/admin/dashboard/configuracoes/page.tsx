import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth-guards";
import { getSystemSetting, getSystemSettingsMap } from "@/lib/dal/system-settings";
import { updateRegistrationTaxAction } from "./actions";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
    await requireRole('admin_geral');

    // 1. Fetch Global Tax
    const globalTax = await getSystemSetting('own_event_registration_tax');

    // 2. Fetch Events
    // Use Admin Client to ensure we see all events regardless of RLS policies for authenticated users
    const supabase = createAdminClient();
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
            id, 
            title, 
            event_date, 
            status,
            tenant_id
        `)
        .in('status', ['aprovado', 'publicado'])
        .order('event_date', { ascending: false });

    if (eventsError) {
        console.error("Error fetching events:", eventsError);
    }

    // 2.1 Fetch Organizers (Profiles) manually to avoid FK issues
    const tenantIds = events?.map(e => e.tenant_id).filter(Boolean) || [];
    let organizersMap = new Map();

    if (tenantIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('tenant_id, full_name, gym_name')
            .in('tenant_id', tenantIds);

        profiles?.forEach(p => {
            if (p.tenant_id) {
                organizersMap.set(p.tenant_id, p.gym_name || p.full_name);
            }
        });
    }

    // 3. Fetch Event Specific Taxes
    const eventKeys = events?.map(e => `event_tax_${e.id}`) || [];
    const settingsMap = await getSystemSettingsMap(eventKeys);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Configurações Financeiras"
                description="Gerencie as taxas de inscrição administrativa por evento."
            />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Taxa Global Padrão</CardTitle>
                        <CardDescription>
                            Valor usado caso o evento não tenha uma taxa específica definida.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="border-b pb-6">
                        <form action={async (formData) => {
                            'use server';
                            await updateRegistrationTaxAction(formData);
                        }} className="flex items-end gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tax" className="text-panel-sm font-medium">Valor Padrão (R$)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                                    <Input
                                        id="tax"
                                        name="tax"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        defaultValue={globalTax || ''}
                                        variant="lg"
                                        className="pl-10 w-48"
                                        required
                                    />
                                    <input type="hidden" name="key" value="own_event_registration_tax" />
                                </div>
                            </div>
                            <Button type="submit" pill className="h-12 px-6 font-semibold shadow-sm">
                                Salvar Padrão
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Taxas por Evento</CardTitle>
                        <CardDescription>
                            Defina taxas específicas para cada evento. Se deixar em branco, o sistema usará o valor padrão acima.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Organizador</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Taxa Específica (R$)</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events?.map((event) => {
                                    const taxKey = `event_tax_${event.id}`;
                                    const currentVal = settingsMap.get(taxKey);
                                    const organizerName = event.tenant_id ? organizersMap.get(event.tenant_id) : '-';

                                    return (
                                        <TableRow key={event.id}>
                                            <TableCell className="text-panel-sm font-medium">{event.title}</TableCell>
                                            <TableCell>{organizerName || '-'}</TableCell>
                                            <TableCell>{new Date(event.event_date).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-full px-3 font-medium border-muted-foreground/30 capitalize">
                                                    {event.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <form id={`form-${event.id}`} action={async (formData) => {
                                                    'use server';
                                                    await updateRegistrationTaxAction(formData);
                                                }} className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-sm text-muted-foreground">R$</span>
                                                        <Input
                                                            name="tax"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="Padrão"
                                                            defaultValue={currentVal || ''}
                                                            variant="lg"
                                                            className="pl-9 h-10 w-32"
                                                        />
                                                        <input type="hidden" name="key" value={taxKey} />
                                                    </div>
                                                </form>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    form={`form-${event.id}`}
                                                    type="submit"
                                                    pill
                                                    className="h-10 px-4 font-semibold hover:bg-secondary/80"
                                                >
                                                    Salvar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {(!events || events.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Nenhum evento encontrado para configuração.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

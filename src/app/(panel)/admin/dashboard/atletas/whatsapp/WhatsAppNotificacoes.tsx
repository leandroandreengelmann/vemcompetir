'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellIcon, PaperPlaneTiltIcon, UserCircleIcon, ClipboardTextIcon } from '@phosphor-icons/react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { getPendingRegistrationNotifications, sendRegistrationNotification, getTemplates } from './actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_ATHLETE_MSG = `🏆 Olá, {nome}! Sua inscrição no *{evento}* foi confirmada com sucesso! 🎉\n\nValor pago: *{valor}*\n\nNos vemos na competição! 💪`;

const DEFAULT_ORGANIZER_MSG = `Inscrição confirmada!\n\nAtleta: {atleta}\nValor: {valor}`;

function applyVars(template: string, vars: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function WhatsAppNotificacoes() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null);
    const [sendingAll, setSendingAll] = useState(false);
    const [athleteTemplate, setAthleteTemplate] = useState(DEFAULT_ATHLETE_MSG);
    const [organizerTemplate, setOrganizerTemplate] = useState(DEFAULT_ORGANIZER_MSG);
    const [sendToOrganizer, setSendToOrganizer] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const [regs, tmps] = await Promise.all([getPendingRegistrationNotifications(), getTemplates()]);
        setRegistrations(regs);
        setTemplates(tmps);
        setLoading(false);
    }

    function buildAthleteMsg(reg: any) {
        return applyVars(athleteTemplate, {
            nome: (reg.profiles?.full_name ?? '').split(' ')[0],
            evento: (reg.events as any)?.title ?? '',
            categoria: (reg.category_rows as any)?.categoria_completa ?? '',
            valor: reg.price ? `R$ ${Number(reg.price).toFixed(2)}` : '',
        });
    }

    function buildOrganizerMsg(reg: any) {
        return applyVars(organizerTemplate, {
            atleta: reg.profiles?.full_name ?? '',
            evento: (reg.events as any)?.title ?? '',
            categoria: (reg.category_rows as any)?.categoria_completa ?? '',
            valor: reg.price ? `R$ ${Number(reg.price).toFixed(2)}` : '',
        });
    }

    async function handleSendOne(reg: any) {
        setSending(reg.id);
        try {
            await sendRegistrationNotification(
                reg.id,
                buildAthleteMsg(reg),
                sendToOrganizer ? buildOrganizerMsg(reg) : undefined,
            );
            showToast.success('Notificação enviada', `Enviada para ${reg.profiles?.full_name ?? 'o atleta'}.`);
            setRegistrations(prev => prev.filter(r => r.id !== reg.id));
        } catch (err: any) {
            showToast.error('Falha ao enviar', err.message ?? 'Tente novamente em instantes.');
        } finally {
            setSending(null);
        }
    }

    async function handleSendAll() {
        if (!registrations.length) return;
        setSendingAll(true);
        let sent = 0; let failed = 0;
        for (const reg of registrations) {
            try {
                await sendRegistrationNotification(reg.id, buildAthleteMsg(reg), sendToOrganizer ? buildOrganizerMsg(reg) : undefined);
                sent++;
                setRegistrations(prev => prev.filter(r => r.id !== reg.id));
            } catch { failed++; }
            await new Promise(r => setTimeout(r, 400));
        }
        setSendingAll(false);
        if (failed > 0) {
            showToast.warning('Envio concluído com erros', `${sent} enviadas, ${failed} falharam.`);
        } else {
            showToast.success('Notificações enviadas', `${sent} mensagens entregues.`);
        }
    }

    return (
        <div className="space-y-6">
            {/* Mensagens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mensagem atleta */}
                <Card className="shadow-none">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                            <UserCircleIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Mensagem para o Atleta
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex gap-1.5 flex-wrap">
                            {templates.map(t => (
                                <button key={t.id} onClick={() => setAthleteTemplate(t.body)}
                                    className="px-2 py-1 rounded-full border text-[11px] hover:bg-muted/50 transition-colors">
                                    {t.name}
                                </button>
                            ))}
                            <button onClick={() => setAthleteTemplate(DEFAULT_ATHLETE_MSG)}
                                className="px-2 py-1 rounded-full border text-[11px] hover:bg-muted/50 transition-colors">
                                Padrão
                            </button>
                        </div>
                        <textarea
                            value={athleteTemplate}
                            onChange={e => setAthleteTemplate(e.target.value)}
                            rows={7}
                            className="w-full rounded-xl border bg-muted/20 p-3 text-panel-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code> <code className="bg-muted px-1 rounded">{'{evento}'}</code> <code className="bg-muted px-1 rounded">{'{categoria}'}</code> <code className="bg-muted px-1 rounded">{'{valor}'}</code>
                        </p>
                    </CardContent>
                </Card>

                {/* Mensagem organizador */}
                <Card className="shadow-none">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                                <ClipboardTextIcon size={20} weight="duotone" className="text-muted-foreground" />
                                Mensagem para o Organizador
                            </CardTitle>
                            <button
                                onClick={() => setSendToOrganizer(v => !v)}
                                className={cn('relative w-10 h-5 rounded-full transition-colors shrink-0', sendToOrganizer ? 'bg-success' : 'bg-muted-foreground/30')}
                            >
                                <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', sendToOrganizer ? 'translate-x-5' : 'translate-x-0')} />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <textarea
                            value={organizerTemplate}
                            onChange={e => setOrganizerTemplate(e.target.value)}
                            rows={7}
                            disabled={!sendToOrganizer}
                            className="w-full rounded-xl border bg-muted/20 p-3 text-panel-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Variáveis: <code className="bg-muted px-1 rounded">{'{atleta}'}</code> <code className="bg-muted px-1 rounded">{'{evento}'}</code> <code className="bg-muted px-1 rounded">{'{categoria}'}</code> <code className="bg-muted px-1 rounded">{'{valor}'}</code>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de pendentes */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                            <BellIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Aguardando notificação
                            {registrations.length > 0 && (
                                <span className="size-5 rounded-full bg-success text-white text-[10px] font-bold flex items-center justify-center">
                                    {registrations.length}
                                </span>
                            )}
                        </CardTitle>
                        {registrations.length > 1 && (
                            <Button size="sm" pill onClick={handleSendAll} disabled={sendingAll}>
                                {sendingAll
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    : <PaperPlaneTiltIcon size={14} weight="duotone" className="mr-1.5" />
                                }
                                Enviar para todos ({registrations.length})
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : registrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                            <CheckCircle2 className="h-8 w-8 opacity-30" />
                            <p className="text-panel-sm italic">Nenhuma inscrição pendente de notificação</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {registrations.map(reg => (
                                <div key={reg.id} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/20 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-panel-sm font-semibold truncate">{reg.profiles?.full_name ?? '—'}</p>
                                            {sendToOrganizer && !reg.organizer?.phone && (
                                                <span className="inline-flex items-center gap-1 text-panel-sm text-warning shrink-0">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Organizador sem telefone
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-panel-sm text-muted-foreground truncate">
                                            {(reg.events as any)?.title ?? '—'} · {(reg.category_rows as any)?.categoria_completa ?? '—'}
                                        </p>
                                        <p className="text-panel-sm text-muted-foreground">
                                            {reg.profiles?.phone} · {reg.price ? `R$ ${Number(reg.price).toFixed(2)}` : ''} · {format(new Date(reg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-success border-success/40 shrink-0 capitalize">
                                        {reg.status}
                                    </Badge>
                                    <Button size="sm" pill onClick={() => handleSendOne(reg)} disabled={sending === reg.id || sendingAll}>
                                        {sending === reg.id
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                            : <PaperPlaneTiltIcon size={14} weight="duotone" className="mr-1.5" />
                                        }
                                        Enviar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

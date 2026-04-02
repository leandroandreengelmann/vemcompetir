'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MagnifyingGlassIcon, PaperPlaneTiltIcon, CheckCircleIcon, ArchiveIcon,
    SpinnerGapIcon, UsersIcon, BuildingsIcon, UserCircleIcon, CheckIcon,
    ChecksIcon, ClockIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn as clsx } from '@/lib/utils';
import { getConversations, getMessages, sendMessage, markAsRead, updateConversationStatus } from './actions';

const CONTACT_CONFIG = {
    atleta:      { label: 'Atleta',      icon: UserCircleIcon,  className: 'bg-blue-500/10 text-blue-700' },
    academia:    { label: 'Academia',    icon: BuildingsIcon,   className: 'bg-purple-500/10 text-purple-700' },
    desconhecido:{ label: 'Desconhecido',icon: UsersIcon,       className: 'bg-muted text-muted-foreground' },
};

function formatMsgTime(date: string) {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Ontem';
    return format(d, 'dd/MM', { locale: ptBR });
}

function getAvatarColor(phone: string) {
    const colors = ['bg-blue-500','bg-purple-500','bg-green-600','bg-orange-500','bg-pink-500','bg-teal-600'];
    return colors[phone.charCodeAt(0) % colors.length];
}

function getInitials(name: string | null, phone: string) {
    if (!name) return phone.slice(-2);
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WhatsAppInbox({ initialConvId }: { initialConvId?: string }) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todas' | 'aberta' | 'resolvida' | 'arquivada'>('aberta');
    const [text, setText] = useState('');
    const [sending, isPending, startTransition] = useState(false) as any;
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isPendingStatus, startStatusTransition] = useTransition();
    const [typingPhones, setTypingPhones] = useState<Set<string>>(new Set());
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const selectedIdRef = useRef<string | null>(null);
    const statusFilterRef = useRef<string>('aberta');

    useEffect(() => { selectedIdRef.current = selected?.id ?? null; }, [selected?.id]);
    useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);

    useEffect(() => { loadConversations(); }, [statusFilter]);

    useEffect(() => {
        if (selected) {
            loadMessages(selected.id);
            markAsRead(selected.id);
        }
    }, [selected?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Realtime — canal único, montado uma vez, usa refs para evitar closure stale
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel('whatsapp-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
                const msg = payload.new as any;
                if (selectedIdRef.current && msg.conversation_id === selectedIdRef.current) {
                    setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
                }
                // Atualiza lista de conversas com o filtro atual
                getConversations(statusFilterRef.current).then(setConversations);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
                const msg = payload.new as any;
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: msg.status } : m));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
                getConversations(statusFilterRef.current).then(setConversations);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Presença em tempo real via Supabase Realtime
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('whatsapp-presence')
            .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
                const { phone, presence } = payload as { phone: string; presence: string };
                const isTyping = presence === 'composing';

                setTypingPhones(prev => {
                    const next = new Set(prev);
                    if (isTyping) next.add(phone); else next.delete(phone);
                    return next;
                });

                // Auto-limpa "digitando..." após 5s sem atualização
                if (isTyping) {
                    const existing = typingTimers.current.get(phone);
                    if (existing) clearTimeout(existing);
                    const timer = setTimeout(() => {
                        setTypingPhones(prev => { const next = new Set(prev); next.delete(phone); return next; });
                        typingTimers.current.delete(phone);
                    }, 5000);
                    typingTimers.current.set(phone, timer);
                } else {
                    const existing = typingTimers.current.get(phone);
                    if (existing) { clearTimeout(existing); typingTimers.current.delete(phone); }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Se vier initialConvId, abre a conversa diretamente
    useEffect(() => {
        if (initialConvId && conversations.length > 0) {
            const conv = conversations.find(c => c.id === initialConvId);
            if (conv) {
                setSelected(conv);
            } else {
                // Conversa pode estar em outro status — carrega todas
                setStatusFilter('todas');
            }
        }
    }, [initialConvId, conversations]);

    async function loadConversations() {
        const data = await getConversations(statusFilter);
        setConversations(data);
    }

    async function loadMessages(conversationId: string) {
        setLoadingMsgs(true);
        const data = await getMessages(conversationId);
        setMessages(data);
        setLoadingMsgs(false);
    }

    async function handleSend() {
        if (!text.trim() || !selected) return;
        const body = text.trim();
        setText('');
        try {
            await sendMessage(selected.id, body);
            await loadMessages(selected.id);
            await loadConversations();
        } catch (e: any) {
            toast.error(e.message ?? 'Erro ao enviar mensagem.');
        }
    }

    async function handleStatusChange(status: 'aberta' | 'resolvida' | 'arquivada') {
        if (!selected) return;
        startStatusTransition(async () => {
            await updateConversationStatus(selected.id, status);
            setSelected((p: any) => ({ ...p, status }));
            await loadConversations();
        });
    }

    const filtered = conversations.filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (c.contact_name ?? '').toLowerCase().includes(q) || c.phone.includes(q);
    });

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

    return (
        <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-xl border overflow-hidden">

            {/* Lista de conversas */}
            <div className="w-[360px] shrink-0 flex flex-col border-r bg-muted/10">
                {/* Busca */}
                <div className="p-3 border-b">
                    <div className="relative">
                        <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-9 rounded-xl text-panel-sm"
                        />
                    </div>
                </div>

                {/* Filtros de status */}
                <div className="flex gap-1 px-3 py-2 border-b">
                    {(['aberta', 'resolvida', 'arquivada', 'todas'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-panel-sm font-semibold whitespace-nowrap transition-all',
                                statusFilter === s
                                    ? 'bg-foreground text-background'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <UsersIcon size={28} weight="duotone" className="opacity-30 mb-2" />
                            <p className="text-panel-sm italic">Nenhuma conversa</p>
                        </div>
                    ) : filtered.map(conv => {
                        const cfg = CONTACT_CONFIG[conv.contact_type as keyof typeof CONTACT_CONFIG] ?? CONTACT_CONFIG.desconhecido;
                        const isSelected = selected?.id === conv.id;
                        return (
                            <button
                                key={conv.id}
                                onClick={() => setSelected(conv)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-3 border-b transition-colors text-left',
                                    isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
                                )}
                            >
                                <div className={cn('size-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', getAvatarColor(conv.phone))}>
                                    {getInitials(conv.contact_name, conv.phone)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-panel-sm font-semibold truncate">
                                            {conv.contact_name ?? conv.phone}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {conv.last_message_at ? formatMsgTime(conv.last_message_at) : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-0.5">
                                        <div className="flex items-center gap-1 min-w-0">
                                            {conv.last_message_direction === 'outbound' && (
                                                conv.last_message_status === 'read'
                                                    ? <ChecksIcon size={14} weight="bold" className="text-blue-500 shrink-0" />
                                                    : conv.last_message_status === 'delivered'
                                                    ? <ChecksIcon size={14} weight="bold" className="text-muted-foreground shrink-0" />
                                                    : <CheckIcon size={14} weight="bold" className="text-muted-foreground shrink-0" />
                                            )}
                                            <p className="text-panel-sm text-muted-foreground truncate">{conv.last_message ?? '—'}</p>
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <span className="size-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Área da conversa */}
            {selected ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={cn('size-10 rounded-full flex items-center justify-center text-white text-xs font-bold', getAvatarColor(selected.phone))}>
                                {getInitials(selected.contact_name, selected.phone)}
                            </div>
                            <div>
                                <p className="text-panel-sm font-semibold">{selected.contact_name ?? selected.phone}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {typingPhones.has(selected.phone.replace(/\D/g, '')) ? (
                                        <span className="text-panel-sm text-green-600 font-medium animate-pulse">digitando...</span>
                                    ) : (
                                        <>
                                            <span className="text-panel-sm text-muted-foreground">{selected.phone}</span>
                                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                CONTACT_CONFIG[selected.contact_type as keyof typeof CONTACT_CONFIG]?.className)}>
                                                {CONTACT_CONFIG[selected.contact_type as keyof typeof CONTACT_CONFIG]?.label}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {selected.status !== 'resolvida' && (
                                <Button variant="outline" size="sm" pill onClick={() => handleStatusChange('resolvida')} disabled={isPendingStatus}>
                                    <CheckCircleIcon size={16} weight="duotone" className="mr-1.5" />
                                    Resolver
                                </Button>
                            )}
                            {selected.status !== 'arquivada' && (
                                <Button variant="outline" size="sm" pill onClick={() => handleStatusChange('arquivada')} disabled={isPendingStatus}>
                                    <ArchiveIcon size={16} weight="duotone" className="mr-1.5" />
                                    Arquivar
                                </Button>
                            )}
                            {selected.status !== 'aberta' && (
                                <Button variant="outline" size="sm" pill onClick={() => handleStatusChange('aberta')} disabled={isPendingStatus}>
                                    Reabrir
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/5">
                        {loadingMsgs ? (
                            <div className="flex items-center justify-center h-full">
                                <SpinnerGapIcon size={24} weight="bold" className="animate-spin text-muted-foreground" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <p className="text-panel-sm italic">Nenhuma mensagem ainda.</p>
                            </div>
                        ) : messages.map(msg => {
                            const isOut = msg.direction === 'outbound';
                            return (
                                <div key={msg.id} className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
                                    <div className={cn(
                                        'max-w-[75%] px-4 py-2.5 rounded-2xl text-panel-sm',
                                        isOut
                                            ? 'bg-green-600 text-white rounded-br-sm'
                                            : 'bg-card border rounded-bl-sm'
                                    )}>
                                        {msg.body && <p className="leading-relaxed">{msg.body}</p>}
                                        {msg.media_url && (
                                            <a href={msg.media_url} target="_blank" className="underline text-panel-sm">
                                                {msg.media_type === 'image' ? '🖼 Imagem' : '📎 Arquivo'}
                                            </a>
                                        )}
                                        <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
                                            <span className={cn('text-[10px]', isOut ? 'text-green-100' : 'text-muted-foreground')}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </span>
                                            {isOut && (
                                                msg.status === 'read'
                                                    ? <ChecksIcon size={32} weight="bold" className="text-blue-500" />
                                                    : msg.status === 'delivered'
                                                    ? <ChecksIcon size={32} weight="bold" className="text-green-200" />
                                                    : <CheckIcon size={32} weight="bold" className="text-green-200/60" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input de envio */}
                    <div className="px-4 py-3 border-t bg-card shrink-0">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Digite uma mensagem..."
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                className="h-11 rounded-xl"
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!text.trim()}
                                className="h-11 w-11 rounded-xl shrink-0"
                            >
                                <PaperPlaneTiltIcon size={18} weight="duotone" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                    <div className="size-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                        <PaperPlaneTiltIcon size={28} weight="duotone" className="opacity-40" />
                    </div>
                    <p className="text-panel-sm italic">Selecione uma conversa para começar</p>
                </div>
            )}
        </div>
    );
}

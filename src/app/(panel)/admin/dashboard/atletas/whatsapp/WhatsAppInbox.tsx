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
    ChecksIcon, ClockIcon, RobotIcon, UserCirclePlusIcon, PaperclipIcon,
    FileIcon, MicrophoneIcon, FilmStripIcon, ImageIcon, ListBulletsIcon, XIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn as clsx } from '@/lib/utils';
import { getConversations, getMessages, sendMessage, markAsRead, updateConversationStatus, setConversationHandlerMode, sendMediaMessage, improveMessage, getTemplates, deleteMessage } from './actions';
import { useRef as useFileRef } from 'react';

const CONTACT_CONFIG = {
    atleta:       { label: 'Atleta',       icon: UserCircleIcon,  className: 'bg-blue-500/10 text-blue-700' },
    academia:     { label: 'Academia',     icon: BuildingsIcon,   className: 'bg-purple-500/10 text-purple-700' },
    verificacao:  { label: 'Verificação',  icon: CheckCircleIcon, className: 'bg-emerald-500/10 text-emerald-700' },
    desconhecido: { label: 'Desconhecido', icon: UsersIcon,       className: 'bg-muted text-muted-foreground' },
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
    const [typeFilter, setTypeFilter] = useState<'todos' | 'atleta' | 'academia' | 'verificacao'>('todos');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isPendingStatus, startStatusTransition] = useTransition();
    const [typingPhones, setTypingPhones] = useState<Set<string>>(new Set());
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const selectedIdRef = useRef<string | null>(null);
    const fileInputRef = useFileRef<HTMLInputElement>(null);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [improving, setImproving] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [recording, setRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusFilterRef = useRef<string>('aberta');
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    useEffect(() => {
        getTemplates().then(setTemplates);
    }, []);

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

    async function handleImprove() {
        if (!text.trim()) return;
        setImproving(true);
        try {
            const improved = await improveMessage(text.trim());
            setText(improved);
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao melhorar mensagem.');
        } finally {
            setImproving(false);
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !selected) return;
        if (file.size > 16 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 16MB.'); return; }
        setSendingMedia(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await sendMediaMessage(selected.id, base64, file.name, file.type);
            await loadMessages(selected.id);
            await loadConversations();
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao enviar arquivo.');
        } finally {
            setSendingMedia(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function startRecording() {
        if (!selected) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.start(100);
            mediaRecorderRef.current = recorder;
            setRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch {
            toast.error('Permissão de microfone negada.');
        }
    }

    async function stopRecording() {
        const recorder = mediaRecorderRef.current;
        if (!recorder || !selected) return;
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecording(false);
        setRecordingSeconds(0);

        // onstop must be set BEFORE calling stop() to avoid race condition
        recorder.onstop = async () => {
            recorder.stream.getTracks().forEach(t => t.stop());
            const mimeType = recorder.mimeType;
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            if (blob.size < 1000) return; // gravação muito curta
            setSendingMedia(true);
            try {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
                await sendMediaMessage(selected.id, base64, `audio-${Date.now()}.${ext}`, mimeType);
                await loadMessages(selected.id);
                await loadConversations();
            } catch (err: any) {
                toast.error(err.message ?? 'Erro ao enviar áudio.');
            } finally {
                setSendingMedia(false);
            }
        };

        recorder.stop();
    }

    async function handleDeleteMessage(msgId: string) {
        setDeletingId(msgId);
        try {
            await deleteMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            await loadConversations();
        } catch (e: any) {
            toast.error(e.message ?? 'Erro ao deletar mensagem.');
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
            setHoveredMsgId(null);
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
        if (typeFilter !== 'todos' && c.contact_type !== typeFilter) return false;
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

                {/* Filtro por tipo de contato */}
                <div className="flex flex-wrap gap-1 px-3 py-2 border-b">
                    {([
                        { key: 'todos',       label: 'Todos',       color: 'bg-foreground text-background' },
                        { key: 'atleta',      label: 'Atleta',      color: 'bg-blue-600 text-white' },
                        { key: 'academia',    label: 'Academia',    color: 'bg-purple-600 text-white' },
                        { key: 'verificacao', label: 'Verificação', color: 'bg-emerald-600 text-white' },
                    ] as const).map(({ key, label, color }) => (
                        <button
                            key={key}
                            onClick={() => setTypeFilter(key)}
                            className={cn(
                                'px-2.5 py-1 rounded-full text-panel-sm font-semibold whitespace-nowrap transition-all',
                                typeFilter === key ? color : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
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
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-panel-sm font-semibold truncate">
                                                {conv.contact_name ?? conv.phone}
                                            </span>
                                            {conv.handler_mode === 'ai'
                                                ? <RobotIcon size={14} weight="bold" className="text-purple-500 shrink-0" />
                                                : <UserCirclePlusIcon size={14} weight="bold" className="text-orange-500 shrink-0" />
                                            }
                                            {conv.tag === 'boas-vindas' && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 text-[10px] font-bold shrink-0">
                                                    Boas-vindas
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {conv.last_message_at ? formatMsgTime(conv.last_message_at) : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-0.5">
                                        <div className="flex items-center gap-1 min-w-0">
                                            {conv.last_message_direction === 'outbound' && (
                                                conv.last_message_status === 'read'
                                                    ? <ChecksIcon size={28} weight="bold" className="text-blue-500 shrink-0" />
                                                    : conv.last_message_status === 'delivered'
                                                    ? <ChecksIcon size={28} weight="bold" className="text-muted-foreground shrink-0" />
                                                    : <CheckIcon size={28} weight="bold" className="text-muted-foreground shrink-0" />
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
                            {/* Badge e botão IA/Humano */}
                            {selected.handler_mode === 'ai' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 text-[11px] font-bold">
                                    <RobotIcon size={14} weight="bold" /> IA
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-700 text-[11px] font-bold">
                                    <UserCirclePlusIcon size={14} weight="bold" /> Humano
                                </span>
                            )}
                            {selected.handler_mode === 'human' ? (
                                <Button variant="outline" size="sm" pill onClick={async () => {
                                    await setConversationHandlerMode(selected.id, 'ai');
                                    setSelected((p: any) => ({ ...p, handler_mode: 'ai' }));
                                    await loadConversations();
                                }}>
                                    <RobotIcon size={28} weight="duotone" className="mr-1.5" />
                                    Devolver à IA
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" pill onClick={async () => {
                                    await setConversationHandlerMode(selected.id, 'human');
                                    setSelected((p: any) => ({ ...p, handler_mode: 'human' }));
                                    await loadConversations();
                                }}>
                                    <UserCirclePlusIcon size={14} weight="duotone" className="mr-1.5" />
                                    Assumir
                                </Button>
                            )}
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
                            const isHovered = hoveredMsgId === msg.id;
                            const isConfirming = confirmDeleteId === msg.id;
                            const isDeleting = deletingId === msg.id;
                            return (
                                <div
                                    key={msg.id}
                                    className={cn('flex items-end gap-1.5', isOut ? 'justify-end' : 'justify-start')}
                                    onMouseEnter={() => { setHoveredMsgId(msg.id); if (confirmDeleteId && confirmDeleteId !== msg.id) setConfirmDeleteId(null); }}
                                    onMouseLeave={() => { setHoveredMsgId(null); }}
                                >
                                    {/* Botão deletar — aparece no hover, à esquerda p/ outbound */}
                                    {isOut && (
                                        <div className={cn('flex items-center transition-opacity', isHovered || isConfirming ? 'opacity-100' : 'opacity-0')}>
                                            {isConfirming ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        disabled={isDeleting}
                                                        className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        {isDeleting ? '...' : 'Sim'}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-3 py-1.5 rounded-lg text-sm font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                                    >
                                                        Não
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(msg.id)}
                                                    className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Deletar mensagem"
                                                >
                                                    <TrashIcon size={22} weight="duotone" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className={cn(
                                        'max-w-[75%] px-4 py-2.5 rounded-2xl text-panel-sm',
                                        isOut
                                            ? 'bg-green-600 text-white rounded-br-sm'
                                            : 'bg-card border rounded-bl-sm'
                                    )}>
                                        {msg.media_url && msg.media_type === 'image' && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                                <img src={msg.media_url} alt="imagem" className="max-w-[240px] rounded-xl mb-1 cursor-pointer hover:opacity-90 transition-opacity" />
                                            </a>
                                        )}
                                        {msg.media_url && msg.media_type === 'audio' && (
                                            <audio controls src={msg.media_url} className="max-w-[240px] mb-1" />
                                        )}
                                        {msg.media_url && msg.media_type === 'video' && (
                                            <video controls src={msg.media_url} className="max-w-[240px] rounded-xl mb-1" />
                                        )}
                                        {msg.media_url && msg.media_type === 'document' && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                                                className={cn('flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-panel-sm font-medium', isOut ? 'bg-green-700/40 hover:bg-green-700/60' : 'bg-muted hover:bg-muted/80')}>
                                                <FileIcon size={18} weight="duotone" />
                                                {msg.body ?? 'Documento'}
                                            </a>
                                        )}
                                        {msg.body && msg.media_type !== 'document' && <p className="leading-relaxed">{msg.body}</p>}
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

                    {/* Popover de templates */}
                    {showTemplates && templates.length > 0 && (
                        <div className="mx-4 mb-1 rounded-xl border bg-card shadow-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b">
                                <span className="text-panel-sm font-semibold">Templates</span>
                                <button onClick={() => setShowTemplates(false)}>
                                    <XIcon size={16} weight="bold" className="text-muted-foreground hover:text-foreground" />
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {Object.entries(
                                    templates.reduce((acc: any, t: any) => {
                                        acc[t.category] = acc[t.category] ?? [];
                                        acc[t.category].push(t);
                                        return acc;
                                    }, {})
                                ).map(([category, items]: any) => (
                                    <div key={category}>
                                        <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide bg-muted/30">{category}</p>
                                        {items.map((t: any) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
    const firstName = (selected?.contact_name ?? '').split(' ')[0];
    const body = t.body.replace(/\{nome\}/g, firstName || '{nome}');
    setText(body);
    setShowTemplates(false);
}}
                                                className="w-full text-left px-3 py-2 text-panel-sm hover:bg-muted/40 transition-colors border-b last:border-0"
                                            >
                                                <p className="font-medium">{t.name}</p>
                                                <p className="text-muted-foreground truncate text-[11px]">{t.body}</p>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input de envio */}
                    <div className="px-4 py-3 border-t bg-card shrink-0">
                        {recording ? (
                            <div className="flex items-center gap-3 h-11">
                                <span className="size-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                <span className="text-panel-sm font-semibold text-red-500">Gravando... {recordingSeconds}s</span>
                                <div className="flex-1" />
                                <Button size="sm" variant="outline" pill onClick={stopRecording} className="text-red-600 border-red-300">
                                    Enviar áudio
                                </Button>
                                <Button size="sm" variant="ghost" pill onClick={() => {
                                    const recorder = mediaRecorderRef.current;
                                    if (recorder) {
                                        recorder.onstop = null; // prevent audio send on cancel
                                        recorder.stop();
                                        recorder.stream.getTracks().forEach(t => t.stop());
                                    }
                                    audioChunksRef.current = [];
                                    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                                    setRecording(false); setRecordingSeconds(0);
                                }}>
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sendingMedia}
                                    className="h-11 w-11 rounded-xl shrink-0"
                                >
                                    {sendingMedia
                                        ? <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
                                        : <PaperclipIcon size={18} weight="duotone" />
                                    }
                                </Button>
                                {templates.length > 0 && (
                                    <Button
                                        size="icon"
                                        variant={showTemplates ? 'default' : 'outline'}
                                        onClick={() => setShowTemplates(v => !v)}
                                        className="h-11 w-11 rounded-xl shrink-0"
                                        title="Templates"
                                    >
                                        <ListBulletsIcon size={18} weight="duotone" />
                                    </Button>
                                )}
                                <Input
                                    placeholder="Digite uma mensagem..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    onPaste={async (e) => {
                                        const items = Array.from(e.clipboardData.items);
                                        const imageItem = items.find(i => i.type.startsWith('image/'));
                                        if (!imageItem || !selected) return;
                                        e.preventDefault();
                                        const file = imageItem.getAsFile();
                                        if (!file) return;
                                        if (file.size > 16 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 16MB.'); return; }
                                        setSendingMedia(true);
                                        try {
                                            const base64 = await new Promise<string>((resolve, reject) => {
                                                const reader = new FileReader();
                                                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                                                reader.onerror = reject;
                                                reader.readAsDataURL(file);
                                            });
                                            const ext = file.type.split('/')[1] ?? 'png';
                                            await sendMediaMessage(selected.id, base64, `imagem.${ext}`, file.type);
                                            await loadMessages(selected.id);
                                            await loadConversations();
                                        } catch (err: any) {
                                            toast.error(err.message ?? 'Erro ao enviar imagem.');
                                        } finally {
                                            setSendingMedia(false);
                                        }
                                    }}
                                    className="h-11 rounded-xl"
                                />
                                {text.trim() && (
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleImprove}
                                        disabled={improving}
                                        className="h-11 w-11 rounded-xl shrink-0 text-purple-600 border-purple-200 hover:bg-purple-50"
                                        title="Melhorar com IA"
                                    >
                                        {improving
                                            ? <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
                                            : <span className="text-base">✨</span>
                                        }
                                    </Button>
                                )}
                                {text.trim() ? (
                                    <Button size="icon" onClick={handleSend} className="h-11 w-11 rounded-xl shrink-0">
                                        <PaperPlaneTiltIcon size={18} weight="duotone" />
                                    </Button>
                                ) : (
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onMouseDown={startRecording}
                                        disabled={sendingMedia}
                                        className="h-11 w-11 rounded-xl shrink-0"
                                        title="Segurar para gravar áudio"
                                    >
                                        <MicrophoneIcon size={18} weight="duotone" />
                                    </Button>
                                )}
                            </div>
                        )}
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

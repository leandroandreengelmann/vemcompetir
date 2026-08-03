'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    CircleNotchIcon, CheckCircleIcon, MagnifyingGlassIcon, UserPlusIcon,
    QrCodeIcon, HandCoinsIcon, ArrowRightIcon, ArrowLeftIcon,
    WhatsappLogoIcon, CopyIcon, GiftIcon, WarningCircleIcon, DownloadSimpleIcon,
    IdentificationBadgeIcon,
} from '@phosphor-icons/react';
import { showToast } from '@/lib/toast';
import { formatCPF, validateCPF, normalizeNumeric, formatPhone } from '@/lib/validation';
import { getBeltStyle } from '@/lib/belt-theme';
import { formatFullCategoryName } from '@/lib/category-utils';
import { CategorySearchPanel } from '@/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel';
import {
    searchAthletesAction, createExternalAthleteAction,
} from '@/app/(panel)/academia-equipe/dashboard/atletas/actions';
import { getEligibleCategoriesAction } from '../../registrations-actions';
import {
    addToCartAction, getCartItemsAction, checkoutOwnEventAction, removeFromCartAction,
    checkoutCourtesyOwnEventAction,
} from '../../cart-actions';
import { sendPixWhatsappAction } from '../../whatsapp-pix-actions';
import { pdf } from '@react-pdf/renderer';
import { ReceiptPDF } from '@/app/(panel)/academia-equipe/dashboard/financeiro/recibos/ReceiptPDF';
import type { EventRegistrationReceipt } from '@/lib/receipts/event-registration-receipt';
import { RegistrationProofButton } from '@/components/registration-proof/RegistrationProofButton';
import { PassportModal } from '@/components/passport/PassportModal';

const BELTS = [
    'Branca', 'Cinza e branca', 'Cinza', 'Cinza e preta', 'Amarela e branca', 'Amarela',
    'Amarela e preta', 'Laranja e branca', 'Laranja', 'Laranja e preta', 'Verde e branca',
    'Verde', 'Verde e preta', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha',
];

function calcAge(dateStr: string): number | null {
    if (!dateStr) return null;
    const b = new Date(dateStr);
    const t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return age;
}

function isMinor(dateStr: string): boolean {
    const age = calcAge(dateStr);
    return age != null && age < 18;
}

interface SearchResult {
    id: string;
    full_name: string;
    cpf: string | null;
    belt_color: string | null;
    birth_date: string | null;
    sexo: string | null;
    weight: number | null;
    phone: string | null;
    gym_name: string | null;
    master_name: string | null;
    tenant_id: string | null;
    hasOwnAccount: boolean;
    belongsToMyAcademy: boolean;
}

interface ResolvedAthlete {
    full_name: string;
    belt_color: string | null;
    birth_date: string | null;
    sexo: string | null;
    gym_name: string | null;
    master_name: string | null;
    phone: string | null;
}

interface CartLine {
    registrationId: string;
    categoryId: string;
    categoryTitle: string;
    amount: number;
}

export interface AcademyOption {
    tenantId: string;
    name: string;
    masters: { id: string; full_name: string }[];
}

interface Props {
    eventId: string;
    eventTitle: string;
    academies: AcademyOption[];
}

type PaymentMethod = 'pix_direto' | 'pix_link' | 'cortesia';

export function ExternalAthleteWizard({ eventId, eventTitle, academies }: Props) {
    const [step, setStep] = useState(1); // 1 atleta · 2 categorias · 3 pagamento
    const [mode, setMode] = useState<'search' | 'create'>('search');

    // ── Busca ──
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[] | null>(null);

    // ── Cadastro novo ──
    const [fullName, setFullName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [sexo, setSexo] = useState('');
    const [belt, setBelt] = useState('');
    const [weight, setWeight] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [hasGuardian, setHasGuardian] = useState(false);
    const [guardianName, setGuardianName] = useState('');
    const [guardianCpf, setGuardianCpf] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianRel, setGuardianRel] = useState('');
    const [academyId, setAcademyId] = useState('');
    const [masterId, setMasterId] = useState('');
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [cpfError, setCpfError] = useState<string | null>(null);

    const selectedAcademy = academies.find(a => a.tenantId === academyId) || null;
    const chosenGymName = selectedAcademy?.name ?? '';
    const chosenMasterName = selectedAcademy?.masters.find(m => m.id === masterId)?.full_name ?? '';

    // ── Atleta resolvido ──
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [resolved, setResolved] = useState<ResolvedAthlete | null>(null);

    // ── Categorias ──
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [, setEnrolled] = useState<any[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [adding, setAdding] = useState(false);
    const [lastAdded, setLastAdded] = useState<string | null>(null);

    // ── Pagamento ──
    const [method, setMethod] = useState<PaymentMethod>('pix_direto');
    const [courtesyReason, setCourtesyReason] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    // Documentos gerados no fechamento (recibo só existe quando entrou dinheiro)
    const [receipts, setReceipts] = useState<EventRegistrationReceipt[]>([]);
    const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
    // pix_link: tela de envio
    const [linkData, setLinkData] = useState<any>(null);
    const [sendPhone, setSendPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [sentOk, setSentOk] = useState(false);
    const [copied, setCopied] = useState(false);

    const athleteSex = resolved?.sexo ?? null;
    const athleteAge = calcAge(resolved?.birth_date ?? '');
    const isWhiteBelt = (resolved?.belt_color ?? '').toLowerCase() === 'branca';
    const cartTotal = cart.reduce((s, c) => s + c.amount, 0);

    // ───────────────────────── Busca ativa (debounce) ─────────────────────────
    const searchSeq = useRef(0);
    useEffect(() => {
        const q = query.trim();
        if (q.length < 3) {
            setResults(null);
            setSearching(false);
            return;
        }
        const seq = ++searchSeq.current;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await searchAthletesAction(q);
                if (seq !== searchSeq.current) return; // resposta obsoleta
                if ('error' in res) { showToast.error('Não foi possível buscar', res.error); return; }
                setResults(res.results as SearchResult[]);
            } catch {
                if (seq === searchSeq.current) showToast.error('Erro na busca', 'Não foi possível buscar atletas. Tente novamente.');
            } finally {
                if (seq === searchSeq.current) setSearching(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    async function loadCategories(id: string, athlete: ResolvedAthlete) {
        setAthleteId(id);
        setResolved(athlete);
        setStep(2);
        setLoadingCats(true);
        try {
            const data = await getEligibleCategoriesAction(eventId, id);
            if (data.error) {
                showToast.error('Não foi possível carregar as categorias', data.error);
            } else {
                setAllCategories(data.all || []);
                setEnrolled(data.enrolledCategories || []);
            }
        } catch {
            showToast.error('Erro ao carregar categorias', 'Tente novamente.');
        } finally {
            setLoadingCats(false);
        }
    }

    function selectExisting(r: SearchResult) {
        loadCategories(r.id, {
            full_name: r.full_name,
            belt_color: r.belt_color,
            birth_date: r.birth_date,
            sexo: r.sexo,
            gym_name: r.gym_name,
            master_name: r.master_name,
            phone: r.phone,
        });
    }

    function startCreate() {
        // Se a busca foi por CPF, pré-preenche
        const digits = query.replace(/\D/g, '');
        if (digits.length === 11) setCpf(formatCPF(digits));
        else setFullName(query.trim());
        setMode('create');
    }

    // ───────────────────────── Cadastro ─────────────────────────
    function validateCreate(): boolean {
        setFormError(null);
        if (!fullName.trim()) { setFormError('Informe o nome do atleta.'); return false; }
        if (!cpf || !validateCPF(cpf)) {
            setCpfError('CPF inválido.');
            setFormError('Por favor, corrija o CPF informado.');
            return false;
        }
        if (!sexo) { setFormError('Selecione o sexo.'); return false; }
        if (!academyId) { setFormError('Selecione a academia.'); return false; }
        if (!masterId) { setFormError('Selecione o mestre.'); return false; }
        if (isMinor(birthDate) && hasGuardian && (!guardianName.trim() || !validateCPF(guardianCpf) || !guardianPhone.trim())) {
            setFormError('Preencha os dados do responsável legal.');
            return false;
        }
        return true;
    }

    async function handleCreate() {
        if (!validateCreate()) return;
        setCreating(true);
        try {
            const fd = new FormData();
            fd.set('full_name', fullName.trim());
            fd.set('birth_date', birthDate);
            fd.set('sexo', sexo);
            fd.set('belt_color', belt);
            fd.set('weight', weight);
            fd.set('phone', normalizeNumeric(phone));
            fd.set('cpf', normalizeNumeric(cpf));
            fd.set('gym_name', chosenGymName);
            fd.set('master_name', chosenMasterName);
            fd.set('master_id', masterId);
            if (isMinor(birthDate) && hasGuardian) {
                fd.set('has_guardian', 'on');
                fd.set('guardian_name', guardianName.trim());
                fd.set('guardian_cpf', normalizeNumeric(guardianCpf));
                fd.set('guardian_phone', normalizeNumeric(guardianPhone));
                fd.set('guardian_relationship', guardianRel);
            }
            const res = await createExternalAthleteAction(fd);
            if (res?.error || !res?.athleteId) {
                setFormError(res?.error || 'Erro ao cadastrar atleta.');
                return;
            }
            showToast.success('Atleta cadastrado', fullName.trim());
            await loadCategories(res.athleteId, {
                full_name: fullName.trim(),
                belt_color: belt || null,
                birth_date: birthDate || null,
                sexo: sexo || null,
                gym_name: chosenGymName,
                master_name: chosenMasterName,
                phone: normalizeNumeric(phone) || null,
            });
        } finally {
            setCreating(false);
        }
    }

    // ───────────────────────── Categorias ─────────────────────────
    async function handleAddCategory(categoryId: string) {
        if (!athleteId) return;
        if (cart.some(c => c.categoryId === categoryId)) {
            showToast.warning('Categoria já adicionada', 'Ela já está na lista deste atleta.');
            return;
        }
        const cat = allCategories.find(c => c.id === categoryId);
        setAdding(true);
        try {
            const res = await addToCartAction({ eventId, athleteId, categoryId, price: cat?.registration_fee ?? 0 });
            if (res.error) {
                showToast.error('Não foi possível adicionar', res.error);
                return;
            }
            const items = await getCartItemsAction();
            const row = (items as any[]).find(
                i => i.event_id === eventId && i.athlete_id === athleteId && i.category_id === categoryId && i.status === 'carrinho'
            );
            if (row) {
                setCart(prev => [...prev, {
                    registrationId: row.id,
                    categoryId,
                    categoryTitle: cat ? formatFullCategoryName(cat) : 'Categoria',
                    amount: Number(row.price) || 0,
                }]);
                setLastAdded(row.id);
                setTimeout(() => setLastAdded(prev => (prev === row.id ? null : prev)), 1800);
                showToast.success('Categoria adicionada', cat ? formatFullCategoryName(cat) : '');
            }
        } catch {
            showToast.error('Erro ao adicionar categoria', 'Tente novamente.');
        } finally {
            setAdding(false);
        }
    }

    async function handleRemoveCategory(line: CartLine) {
        const res = await removeFromCartAction(line.registrationId);
        if (res.error) {
            showToast.error('Não foi possível remover', res.error);
            return;
        }
        setCart(prev => prev.filter(c => c.registrationId !== line.registrationId));
    }

    async function clearCartAndBack() {
        // Remove itens do carrinho ao voltar (troca de atleta invalida a seleção)
        for (const line of cart) {
            await removeFromCartAction(line.registrationId).catch(() => { });
        }
        setCart([]);
        setAthleteId(null);
        setResolved(null);
        setAllCategories([]);
        setStep(1);
    }

    // ───────────────────────── Pagamento ─────────────────────────
    function validatePayment(): boolean {
        if (cart.length === 0) {
            showToast.warning('Nenhuma categoria', 'Adicione ao menos uma categoria para continuar.');
            return false;
        }
        if (method === 'cortesia' && !courtesyReason.trim()) {
            showToast.warning('Motivo obrigatório', 'Informe o motivo da cortesia para confirmar.');
            return false;
        }
        if (method === 'pix_direto' && !paymentNotes.trim()) {
            showToast.warning('Descrição obrigatória', 'Informe a descrição do pagamento para confirmar.');
            return false;
        }
        return true;
    }

    // Botão do passo 3: valida e abre o aviso de confirmação.
    // O link/QR PIX não precisa de confirmação — nada é marcado como pago ainda.
    function handleSubmitClick() {
        if (!validatePayment()) return;
        if (method === 'pix_link') {
            handleConfirm();
            return;
        }
        setConfirmOpen(true);
    }

    async function handleConfirm() {
        if (!validatePayment()) return;
        setSubmitting(true);
        try {
            if (method === 'cortesia') {
                const res = await checkoutCourtesyOwnEventAction(
                    eventId,
                    cart.map(c => c.registrationId),
                    courtesyReason,
                );
                if (res.error) {
                    showToast.error('Não foi possível confirmar', res.error);
                    return;
                }
                setConfirmOpen(false);
                showToast.success('Cortesia confirmada', 'Inscrição registrada como doada, sem cobrança.');
                setDone(true);
            } else if (method === 'pix_direto') {
                const notes = paymentNotes.trim();
                const items = cart.map(c => ({ registrationId: c.registrationId, amount: c.amount, notes }));
                const res = await checkoutOwnEventAction(eventId, items, { requireNotes: true });
                if (res.error) {
                    showToast.error('Não foi possível confirmar', res.error);
                    return;
                }
                setReceipts(res.receipts ?? []);
                setConfirmOpen(false);
                showToast.success('Inscrição confirmada', 'Pagamento marcado como PIX direto na conta.');
                setDone(true);
            } else {
                const res = await fetch('/api/payments/create-athlete-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_id: eventId, registration_ids: cart.map(c => c.registrationId) }),
                });
                const data = await res.json();
                if (!res.ok) {
                    showToast.error('Não foi possível gerar o PIX', data.error);
                    return;
                }
                setLinkData(data);
                setSendPhone(resolved?.phone ? formatPhone(resolved.phone) : '');
            }
        } catch {
            showToast.error('Falha ao processar', 'Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    }

    // ───────────────────────── Envio do link (WhatsApp) ─────────────────────────
    async function handleSendWhatsapp() {
        if (!linkData?.payment_id) return;
        const digits = sendPhone.replace(/\D/g, '');
        if (digits.length < 10) { showToast.error('Telefone inválido', 'Informe DDD + número.'); return; }
        setSending(true);
        try {
            const res = await sendPixWhatsappAction({
                paymentId: linkData.payment_id,
                phone: digits,
                invoiceUrl: linkData.invoice_url ?? null,
            });
            if (!res.ok) {
                showToast.error('Não foi possível enviar', res.error);
                return;
            }
            setSentOk(true);
            showToast.success('Enviado pelo WhatsApp', ('note' in res && res.note) ? res.note : (resolved?.full_name ?? ''));
        } finally {
            setSending(false);
        }
    }

    function openWaMe() {
        const digits = sendPhone.replace(/\D/g, '');
        const valor = `R$ ${Number(linkData?.total_inscricoes || 0).toFixed(2).replace('.', ',')}`;
        const msg = [
            `🥋 Olá ${resolved?.full_name || 'atleta'}! Sua inscrição${eventTitle ? ` em ${eventTitle}` : ''} está reservada.`,
            `Valor: ${valor}`,
            linkData?.pix_payload ? `\nCódigo PIX:\n${linkData.pix_payload}` : '',
            linkData?.invoice_url ? `\nOu pague pelo link: ${linkData.invoice_url}` : '',
            `\nAssim que pagar, sua vaga é confirmada.`,
        ].filter(Boolean).join('\n');
        const base = digits.length >= 10 ? `https://wa.me/55${digits}` : 'https://wa.me/';
        window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    async function downloadReceipt(receipt: EventRegistrationReceipt) {
        setDownloadingReceiptId(receipt.id);
        try {
            const blob = await pdf(<ReceiptPDF receipt={receipt} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recibo-${receipt.receipt_number}-${receipt.receipt_year}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error(err);
            showToast.error('Falha ao gerar o PDF', 'Não foi possível montar o recibo.');
        } finally {
            setDownloadingReceiptId(null);
        }
    }

    async function copyPixCode() {
        if (!linkData?.pix_payload) return;
        await navigator.clipboard.writeText(linkData.pix_payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // ───────────────────────── render ─────────────────────────
    // Tela de envio do link PIX (após gerar)
    if (linkData && !done) {
        return (
            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="flex items-center gap-2 text-panel-md font-bold">
                            <QrCodeIcon size={22} weight="duotone" className="text-primary" />
                            Cobrança PIX gerada
                        </div>
                        {linkData.pix_qr_code && (
                            <div className="p-3 bg-white rounded-xl border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img alt="QR Code PIX" className="w-48 h-48" src={`data:image/png;base64,${linkData.pix_qr_code}`} />
                            </div>
                        )}
                        <div>
                            <p className="text-panel-sm text-muted-foreground">Valor</p>
                            <p className="text-panel-lg font-black tabular-nums">R$ {Number(linkData.total_inscricoes || 0).toFixed(2)}</p>
                        </div>
                        <Button variant="outline" pill size="sm" onClick={copyPixCode} className="gap-2">
                            <CopyIcon size={16} weight="duotone" />
                            {copied ? 'Código copiado!' : 'Copiar código PIX'}
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                        <p className="text-panel-sm font-bold">Enviar para o atleta pagar</p>
                        <div className="space-y-2">
                            <Label htmlFor="sendphone">WhatsApp do atleta</Label>
                            <Input
                                variant="lg"
                                id="sendphone"
                                className="bg-background"
                                value={sendPhone}
                                onChange={(e) => setSendPhone(formatPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                pill
                                onClick={handleSendWhatsapp}
                                disabled={sending}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                                {sending
                                    ? <><CircleNotchIcon size={16} className="animate-spin" /> Enviando...</>
                                    : sentOk
                                        ? <><CheckCircleIcon size={18} weight="fill" /> Enviado!</>
                                        : <><WhatsappLogoIcon size={18} weight="fill" /> Enviar no WhatsApp</>}
                            </Button>
                            <Button variant="outline" pill onClick={openWaMe} className="gap-2">
                                <WhatsappLogoIcon size={18} weight="duotone" />
                                Abrir no meu WhatsApp
                            </Button>
                        </div>
                        <p className="text-panel-sm text-muted-foreground">
                            “Enviar no WhatsApp” manda o QR Code automaticamente pelo número da plataforma. “Abrir no meu WhatsApp” abre o seu app com a mensagem (sem a imagem).
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button pill onClick={() => setDone(true)}>Concluir</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (done) {
        const isLink = method === 'pix_link';
        return (
            <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10">
                <CardContent className="flex flex-col items-center text-center gap-4 py-12">
                    <CheckCircleIcon size={64} weight="duotone" className="text-emerald-500" />
                    <h2 className="text-panel-lg font-bold">
                        {isLink ? 'Link de pagamento gerado!'
                            : method === 'cortesia' ? 'Cortesia confirmada!'
                            : 'Atleta inscrito com sucesso!'}
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                        {isLink ? (
                            <>O atleta {resolved?.full_name} ficará <strong>aguardando pagamento</strong> e será confirmado automaticamente assim que pagar o PIX.</>
                        ) : (
                            <>{resolved?.full_name} foi inscrito em {eventTitle}{resolved?.gym_name ? ` pela equipe ${resolved.gym_name}` : ''}.</>
                        )}
                    </p>
                    {method === 'cortesia' && (
                        <p className="text-panel-sm text-muted-foreground max-w-md">
                            Registrado como <strong>inscrição doada</strong> (R$ {cartTotal.toFixed(2)}). Não entra como receita no financeiro.
                        </p>
                    )}

                    {/* Documentos — comprovante sempre; recibo só quando entrou dinheiro */}
                    {!isLink && (
                        <div className="w-full max-w-md rounded-2xl border bg-card p-4 space-y-3 text-left">
                            <p className="text-panel-sm font-bold uppercase text-muted-foreground">Documentos</p>

                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-panel-sm font-bold">Comprovante de inscrição</p>
                                    <p className="text-panel-sm text-muted-foreground">
                                        Prova que o atleta está inscrito, com categorias e forma de pagamento.
                                    </p>
                                </div>
                                <RegistrationProofButton
                                    registrationIds={cart.map(c => c.registrationId)}
                                    className="shrink-0 gap-1.5 font-semibold"
                                />
                            </div>

                            {receipts.map(r => (
                                <div key={r.id} className="flex items-center justify-between gap-3 border-t pt-3">
                                    <div className="min-w-0">
                                        <p className="text-panel-sm font-bold">Recibo {r.receipt_number}/{r.receipt_year}</p>
                                        <p className="text-panel-sm text-muted-foreground">
                                            R$ {Number(r.amount).toFixed(2)} · também fica em Financeiro → Recibos.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        pill
                                        size="sm"
                                        className="shrink-0 gap-1.5 font-semibold"
                                        onClick={() => downloadReceipt(r)}
                                        disabled={downloadingReceiptId === r.id}
                                    >
                                        {downloadingReceiptId === r.id
                                            ? <CircleNotchIcon size={15} className="animate-spin" />
                                            : <DownloadSimpleIcon size={15} weight="duotone" />}
                                        Recibo
                                    </Button>
                                </div>
                            ))}

                            <div className="border-t pt-3 space-y-2">
                                <p className="text-panel-sm font-bold">Passaporte do atleta</p>
                                {cart.map(line => (
                                    <div key={line.registrationId} className="flex items-center justify-between gap-3">
                                        <span className="text-panel-sm text-muted-foreground truncate">{line.categoryTitle}</span>
                                        <PassportModal
                                            registrationId={line.registrationId}
                                            trigger={
                                                <Button variant="outline" pill size="sm" className="shrink-0 gap-1.5 font-semibold">
                                                    <IdentificationBadgeIcon size={15} weight="duotone" />
                                                    Abrir
                                                </Button>
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-2">
                        <Button asChild variant="outline" pill>
                            <Link href={`/academia-equipe/dashboard/gestao-evento/${eventId}`}>Voltar à gestão</Link>
                        </Button>
                        <Button pill onClick={() => window.location.reload()}>Inscrever outro atleta</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <StepIndicator step={step} />

            {/* ───── STEP 1 — Atleta (buscar ou cadastrar) ───── */}
            {step === 1 && mode === 'search' && (
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label className="text-panel-md font-semibold">1. Buscar atleta</Label>
                            <p className="text-panel-sm text-muted-foreground">
                                Busque por <strong>nome</strong> ou <strong>CPF</strong> para ver se o atleta já tem conta ou já foi cadastrado.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="q">Nome ou CPF</Label>
                            <div className="relative">
                                <MagnifyingGlassIcon size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Input
                                    variant="lg"
                                    id="q"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ex: João Silva ou 000.000.000-00"
                                    className="pl-11 pr-11 bg-background"
                                    autoFocus
                                />
                                {searching && (
                                    <CircleNotchIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {query.trim().length > 0 && query.trim().length < 3 && (
                                <p className="text-panel-sm text-muted-foreground">Digite ao menos 3 caracteres para buscar.</p>
                            )}
                        </div>

                        {/* Cadastrar novo — sempre disponível, no topo */}
                        <Button pill onClick={startCreate} className="gap-2">
                            <UserPlusIcon size={18} weight="duotone" />
                            Cadastrar novo atleta
                        </Button>

                        {/* Resultados */}
                        {results !== null && (
                            <div className="space-y-3">
                                {results.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed p-6 text-center">
                                        <p className="text-muted-foreground">Nenhum atleta encontrado para “{query.trim()}”. Use o botão acima para cadastrar.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-panel-sm font-bold uppercase text-muted-foreground">
                                            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
                                        </p>
                                        {results.map(r => {
                                            const age = calcAge(r.birth_date ?? '');
                                            return (
                                                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4 hover:border-primary/40 transition-all">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold truncate">{r.full_name}</span>
                                                            {r.hasOwnAccount && (
                                                                <span className="shrink-0 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                                                                    Tem conta própria
                                                                </span>
                                                            )}
                                                            {r.belt_color && (
                                                                <Badge variant="outline" style={getBeltStyle(r.belt_color)} className="uppercase font-bold text-[10px]">
                                                                    {r.belt_color}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-panel-sm text-muted-foreground truncate">
                                                            {r.gym_name || 'Sem equipe'}{r.master_name ? ` · Mestre ${r.master_name}` : ''}
                                                            {age != null ? ` · ${age} anos` : ''}
                                                            {r.cpf ? ` · CPF ${formatCPF(r.cpf)}` : ''}
                                                        </p>
                                                    </div>
                                                    <Button pill size="sm" className="shrink-0" onClick={() => selectExisting(r)}>
                                                        Inscrever <ArrowRightIcon size={14} weight="bold" className="ml-1" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ───── STEP 1 (create) — Cadastrar novo atleta ───── */}
            {step === 1 && mode === 'create' && (
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <button
                            onClick={() => setMode('search')}
                            className="inline-flex items-center gap-2 text-panel-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeftIcon size={18} weight="duotone" /> Voltar para a busca
                        </button>

                        <div className="space-y-2">
                            <Label className="text-panel-md font-semibold">Cadastrar novo atleta</Label>
                            <p className="text-panel-sm text-muted-foreground">
                                Preencha os dados e escolha a academia e o professor do atleta.
                            </p>
                        </div>

                        {formError && (
                            <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center animate-in fade-in zoom-in duration-300">
                                {formError}
                            </div>
                        )}

                        {/* Academia + Mestre */}
                        {academies.length === 0 ? (
                            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-panel-sm font-medium text-amber-800 dark:text-amber-300">
                                Nenhuma academia com conta no sistema e com pelo menos um professor cadastrado foi encontrada.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Academia / Equipe</Label>
                                    <Select value={academyId} onValueChange={(v) => { setAcademyId(v); setMasterId(''); }}>
                                        <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0"><SelectValue placeholder="Selecione a academia" /></SelectTrigger>
                                        <SelectContent className="max-h-[320px]">
                                            {academies.map(a => <SelectItem key={a.tenantId} value={a.tenantId}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mestre / Professor</Label>
                                    <Select value={masterId} onValueChange={setMasterId} disabled={!selectedAcademy}>
                                        <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0"><SelectValue placeholder={selectedAcademy ? 'Selecione o mestre' : 'Escolha a academia primeiro'} /></SelectTrigger>
                                        <SelectContent className="max-h-[320px]">
                                            {(selectedAcademy?.masters ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Dados do atleta */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Nome completo</Label>
                                <Input variant="lg" className="bg-background" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João Silva" />
                            </div>
                            <div className="space-y-2">
                                <Label>CPF</Label>
                                <Input
                                    variant="lg"
                                    value={cpf}
                                    onChange={(e) => {
                                        const formatted = formatCPF(e.target.value);
                                        setCpf(formatted);
                                        if (formatted.length === 14) {
                                            setCpfError(validateCPF(formatted) ? null : 'CPF inválido');
                                        } else {
                                            setCpfError(null);
                                        }
                                    }}
                                    placeholder="000.000.000-00"
                                    className={`bg-background ${cpfError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {cpfError && <p className="text-panel-sm font-semibold text-red-500">{cpfError}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Data de nascimento</Label>
                                <Input variant="lg" className="bg-background" type="date" value={birthDate} onChange={(e) => { setBirthDate(e.target.value); if (!isMinor(e.target.value)) setHasGuardian(false); }} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sexo</Label>
                                <Select value={sexo} onValueChange={setSexo}>
                                    <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Faixa</Label>
                                <Select value={belt} onValueChange={setBelt}>
                                    <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {BELTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Peso (kg)</Label>
                                <Input variant="lg" className="bg-background" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex: 85.5" />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone / WhatsApp</Label>
                                <Input variant="lg" className="bg-background" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                            </div>
                        </div>

                        {isMinor(birthDate) && (
                            <div className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <Checkbox id="hg" checked={hasGuardian} onCheckedChange={(v) => setHasGuardian(!!v)} className="mt-1" />
                                    <Label htmlFor="hg" className="text-amber-900 cursor-pointer">
                                        Atleta menor de 18 — adicionar responsável legal
                                    </Label>
                                </div>
                                {hasGuardian && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Nome do responsável</Label>
                                            <Input variant="lg" className="bg-background" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>CPF do responsável</Label>
                                            <Input variant="lg" className="bg-background" value={guardianCpf} onChange={(e) => setGuardianCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telefone do responsável</Label>
                                            <Input variant="lg" className="bg-background" value={guardianPhone} onChange={(e) => setGuardianPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Vínculo (opcional)</Label>
                                            <Select value={guardianRel} onValueChange={setGuardianRel}>
                                                <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pai">Pai</SelectItem>
                                                    <SelectItem value="mae">Mãe</SelectItem>
                                                    <SelectItem value="irmao">Irmão / Irmã</SelectItem>
                                                    <SelectItem value="tio">Tio / Tia</SelectItem>
                                                    <SelectItem value="outro">Outro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button pill disabled={creating || academies.length === 0} onClick={handleCreate}>
                                {creating
                                    ? <><CircleNotchIcon size={16} className="animate-spin mr-2" /> Cadastrando...</>
                                    : <>Cadastrar e continuar <ArrowRightIcon size={16} weight="bold" className="ml-2" /></>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ───── STEP 2 — Categorias ───── */}
            {step === 2 && (
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between gap-3">
                            <Label className="text-panel-md font-semibold">2. Categorias</Label>
                            {resolved && (
                                <span className="text-panel-sm text-muted-foreground truncate">
                                    {resolved.full_name}{resolved.gym_name ? ` · ${resolved.gym_name}` : ''}
                                </span>
                            )}
                        </div>

                        {/* Resumo fixo (sticky) — sempre visível enquanto rola a lista */}
                        <div className="sticky top-4 z-20 rounded-2xl border bg-card shadow-md p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-panel-sm font-bold uppercase text-muted-foreground">
                                    Categorias adicionadas{cart.length > 0 ? ` (${cart.length})` : ''}
                                </p>
                                {cart.length > 0 && (
                                    <span className="text-panel-md font-black text-primary">R$ {cartTotal.toFixed(2)}</span>
                                )}
                            </div>

                            {cart.length === 0 ? (
                                <p className="text-panel-sm text-muted-foreground">
                                    Nenhuma categoria ainda. Toque em <span className="font-semibold text-foreground">“Adicionar”</span> nas categorias abaixo.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {cart.map(line => (
                                        <div
                                            key={line.registrationId}
                                            className={`flex items-center justify-between gap-3 text-panel-sm rounded-lg px-2 -mx-2 py-1 transition-colors ${
                                                line.registrationId === lastAdded ? 'bg-emerald-100 dark:bg-emerald-900/30 animate-in fade-in' : ''
                                            }`}
                                        >
                                            <span className="font-medium truncate flex items-center gap-1.5">
                                                <CheckCircleIcon size={16} weight="fill" className="text-emerald-500 shrink-0" />
                                                {line.categoryTitle}
                                            </span>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-bold text-primary">{line.amount > 0 ? `R$ ${line.amount.toFixed(2)}` : 'A definir'}</span>
                                                <button className="text-destructive text-xs font-semibold hover:underline" onClick={() => handleRemoveCategory(line)}>remover</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {loadingCats ? (
                            <div className="flex flex-col items-center py-16">
                                <CircleNotchIcon size={48} className="text-primary/30 animate-spin mb-3" />
                                <p className="text-muted-foreground italic">Carregando categorias...</p>
                            </div>
                        ) : (
                            <CategorySearchPanel
                                eventId={eventId}
                                categories={allCategories}
                                isWhiteBelt={isWhiteBelt}
                                athleteSex={athleteSex}
                                athleteAge={athleteAge}
                                onAddToCart={handleAddCategory}
                                cartCategoryIds={new Set(cart.map(c => c.categoryId))}
                                addToCartLabel="Adicionar"
                                inCartLabel="Adicionada"
                            />
                        )}

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" pill onClick={clearCartAndBack}>Voltar</Button>
                            <Button pill disabled={cart.length === 0 || adding} onClick={() => setStep(3)}>
                                {cart.length > 0
                                    ? `Continuar (${cart.length} ${cart.length === 1 ? 'categoria' : 'categorias'} · R$ ${cartTotal.toFixed(2)})`
                                    : 'Continuar'}
                                <ArrowRightIcon size={16} weight="bold" className="ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ───── STEP 3 — Pagamento ───── */}
            {step === 3 && (
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <Label className="text-panel-md font-semibold">3. Pagamento</Label>

                        <div className="rounded-2xl border bg-muted/30 p-4 flex justify-between font-black">
                            <span>Total ({cart.length} {cart.length === 1 ? 'categoria' : 'categorias'})</span>
                            {method === 'cortesia'
                                ? <span className="text-emerald-600">R$ 0,00 <span className="font-medium text-panel-sm text-muted-foreground">(R$ {cartTotal.toFixed(2)} doados)</span></span>
                                : <span>R$ {cartTotal.toFixed(2)}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PaymentOption
                                active={method === 'pix_direto'}
                                onClick={() => setMethod('pix_direto')}
                                icon={<HandCoinsIcon size={28} weight="duotone" />}
                                title="PIX direto na conta"
                                desc="O atleta já pagou na conta da academia. Confirma na hora e gera recibo."
                            />
                            <PaymentOption
                                active={method === 'pix_link'}
                                onClick={() => setMethod('pix_link')}
                                icon={<QrCodeIcon size={28} weight="duotone" />}
                                title="Gerar link / QR PIX"
                                desc="Gera a cobrança PIX para enviar ao atleta pagar a própria inscrição."
                            />
                            <PaymentOption
                                active={method === 'cortesia'}
                                onClick={() => setMethod('cortesia')}
                                icon={<GiftIcon size={28} weight="duotone" />}
                                title="Cortesia"
                                desc="Inscrição doada. O atleta não paga nada e o valor não entra como receita."
                            />
                        </div>

                        {method === 'pix_direto' && (
                            <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                <Label htmlFor="payment-notes" className="font-semibold">
                                    Descrição do pagamento <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="payment-notes"
                                    value={paymentNotes}
                                    onChange={e => setPaymentNotes(e.target.value)}
                                    placeholder="Ex.: PIX recebido na conta da academia em 03/08, comprovante enviado no grupo."
                                    rows={2}
                                />
                                <p className="text-panel-sm text-muted-foreground">
                                    Obrigatório. Fica registrado na inscrição e no recibo, para prestação de contas.
                                </p>
                            </div>
                        )}

                        {method === 'cortesia' && (
                            <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                <Label htmlFor="courtesy-reason" className="font-semibold">
                                    Motivo da cortesia <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="courtesy-reason"
                                    value={courtesyReason}
                                    onChange={e => setCourtesyReason(e.target.value)}
                                    placeholder="Ex.: atleta do projeto social, filho de professor, parceria com a escola..."
                                    rows={2}
                                />
                                <p className="text-panel-sm text-muted-foreground">
                                    Obrigatório. Fica registrado no histórico do evento para prestação de contas. Consome 1 token por categoria, como qualquer inscrição.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" pill onClick={() => setStep(2)}>Voltar</Button>
                            <Button pill disabled={submitting} onClick={handleSubmitClick} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {submitting
                                    ? <><CircleNotchIcon size={16} className="animate-spin mr-2" /> Processando...</>
                                    : method === 'pix_link' ? 'Gerar PIX'
                                    : method === 'cortesia' ? 'Confirmar cortesia'
                                    : 'Confirmar inscrição'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Aviso de confirmação — última checagem antes de gravar */}
            <Dialog open={confirmOpen} onOpenChange={(o) => { if (!submitting) setConfirmOpen(o); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-full bg-amber-500/10 shrink-0">
                                <WarningCircleIcon size={22} weight="duotone" className="text-amber-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-panel-md font-bold">
                                    {method === 'cortesia' ? 'Confirmar cortesia' : 'Confirmar inscrição'}
                                </DialogTitle>
                                <DialogDescription className="text-panel-sm mt-0.5">
                                    Confira antes de gravar. Depois de confirmada, a inscrição consome token.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 rounded-2xl border bg-muted/30 p-4 text-panel-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Atleta</span>
                            <span className="font-bold text-right truncate">{resolved?.full_name}</span>
                        </div>
                        {resolved?.gym_name && (
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Equipe</span>
                                <span className="font-medium text-right truncate">{resolved.gym_name}</span>
                            </div>
                        )}
                        <div className="space-y-1">
                            <span className="text-muted-foreground">
                                {cart.length} {cart.length === 1 ? 'categoria' : 'categorias'}
                            </span>
                            {cart.map(line => (
                                <div key={line.registrationId} className="flex justify-between gap-3">
                                    <span className="font-medium truncate">{line.categoryTitle}</span>
                                    <span className="tabular-nums shrink-0">
                                        {method === 'cortesia' ? 'R$ 0,00' : `R$ ${line.amount.toFixed(2)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between gap-3 border-t pt-3">
                            <span className="text-muted-foreground">Forma</span>
                            <span className="font-bold text-right">
                                {method === 'cortesia' ? 'Cortesia (sem cobrança)' : 'PIX direto na conta'}
                            </span>
                        </div>
                        <div className="space-y-1 border-t pt-3">
                            <span className="text-muted-foreground">
                                {method === 'cortesia' ? 'Motivo' : 'Descrição do pagamento'}
                            </span>
                            <p className="font-medium break-words">
                                {method === 'cortesia' ? courtesyReason.trim() : paymentNotes.trim()}
                            </p>
                        </div>
                        <div className="flex justify-between gap-3 border-t pt-3">
                            <span className="font-bold uppercase text-muted-foreground">Total</span>
                            <span className="text-panel-md font-black tabular-nums">
                                {method === 'cortesia' ? 'R$ 0,00' : `R$ ${cartTotal.toFixed(2)}`}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            pill
                            className="flex-1"
                            disabled={submitting}
                            onClick={() => setConfirmOpen(false)}
                        >
                            Voltar
                        </Button>
                        <Button
                            pill
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={submitting}
                            onClick={handleConfirm}
                        >
                            {submitting
                                ? <><CircleNotchIcon size={16} className="animate-spin mr-2" /> Gravando...</>
                                : <><CheckCircleIcon size={18} weight="fill" className="mr-2" /> Confirmar</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StepIndicator({ step }: { step: number }) {
    const labels = ['Atleta', 'Categorias', 'Pagamento'];
    return (
        <div className="flex items-center gap-2">
            {labels.map((l, i) => {
                const n = i + 1;
                const active = n === step;
                const passed = n < step;
                return (
                    <div key={l} className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-panel-sm font-semibold transition-colors ${
                            active ? 'bg-primary text-primary-foreground' : passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                        }`}>
                            <span className="w-5 h-5 rounded-full bg-background/30 flex items-center justify-center text-xs">{passed ? '✓' : n}</span>
                            <span className="hidden sm:inline">{l}</span>
                        </div>
                        {i < labels.length - 1 && <div className="w-4 h-px bg-border" />}
                    </div>
                );
            })}
        </div>
    );
}

function PaymentOption({ active, onClick, icon, title, desc }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left rounded-2xl border-2 p-4 transition-all ${
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
        >
            <div className={`mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
            <p className="font-bold text-panel-sm">{title}</p>
            <p className="text-panel-sm text-muted-foreground mt-1">{desc}</p>
        </button>
    );
}

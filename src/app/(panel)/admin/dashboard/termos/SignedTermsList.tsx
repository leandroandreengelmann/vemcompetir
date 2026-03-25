'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckIcon, ImageIcon, CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { getPendingSignedTermsAction, approveSignedTermAction } from '@/app/register/actions';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SignedTerm = {
    id: string;
    athlete_id: string;
    athlete_name: string;
    responsible_name: string | null;
    responsible_relationship: string | null;
    signed_term_url: string | null;
    signed_term_at: string | null;
    signed_term_status: string;
};

type StatusFilter = 'under_review' | 'approved' | 'all';

interface SignedTermsListProps {
    initialData: SignedTerm[];
    initialTotal: number;
}

const PAGE_SIZE = 25;

export function SignedTermsList({ initialData, initialTotal }: SignedTermsListProps) {
    const [data, setData] = useState(initialData);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('under_review');
    const [isPending, startTransition] = useTransition();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewIsPdf, setPreviewIsPdf] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [approving, setApproving] = useState<string | null>(null);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const fetchData = (newPage: number, s: string, sf: StatusFilter) => {
        startTransition(async () => {
            const result = await getPendingSignedTermsAction(sf, s);
            const start = (newPage - 1) * PAGE_SIZE;
            setData(result.data.slice(start, start + PAGE_SIZE));
            setTotal(result.total);
            setPage(newPage);
        });
    };

    const handleSearch = (value: string) => { setSearch(value); fetchData(1, value, statusFilter); };
    const handleStatusFilter = (sf: StatusFilter) => { setStatusFilter(sf); fetchData(1, search, sf); };

    const handlePreview = async (filePath: string) => {
        const supabase = createClient();
        const { data: signed } = await supabase.storage.from('signed-terms').createSignedUrl(filePath, 60);
        if (signed?.signedUrl) {
            setPreviewIsPdf(filePath.toLowerCase().endsWith('.pdf'));
            setPreviewUrl(signed.signedUrl);
            setPreviewOpen(true);
        }
    };

    const handleApprove = (athleteId: string) => {
        setApproving(athleteId);
        startTransition(async () => {
            const result = await approveSignedTermAction(athleteId);
            if (!result.error) fetchData(page, search, statusFilter);
            setApproving(null);
        });
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-72 group">
                        <MagnifyingGlassIcon size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            variant="lg"
                            placeholder="Buscar por atleta..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-11 bg-background border-input shadow-sm"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => handleStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="h-12 w-[180px] rounded-xl border-input bg-background font-medium">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="under_review">Aguardando revisão</SelectItem>
                            <SelectItem value="approved">Aprovados</SelectItem>
                            <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground px-2">
                        {isPending ? '...' : `${total} termo${total !== 1 ? 's' : ''}`}
                    </span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchData(page - 1, search, statusFilter)} disabled={page <= 1 || isPending}>
                        <CaretLeftIcon size={20} weight="duotone" />
                    </Button>
                    <span className="text-xs font-bold text-muted-foreground px-1">{page} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchData(page + 1, search, statusFilter)} disabled={page >= totalPages || isPending}>
                        <CaretRightIcon size={20} weight="duotone" />
                    </Button>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum termo encontrado.</div>
            ) : (
                <div className="space-y-2">
                    {data.map((term) => (
                        <div key={term.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-sm font-semibold truncate">{term.athlete_name}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {term.responsible_name && (
                                        <span className="text-xs text-muted-foreground">Responsável: {term.responsible_name}</span>
                                    )}
                                    {term.signed_term_status === 'approved' ? (
                                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Aprovado</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">Em análise</Badge>
                                    )}
                                    {term.signed_term_at && (
                                        <span className="text-xs text-muted-foreground">
                                            Enviado em {format(new Date(term.signed_term_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {term.signed_term_url && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handlePreview(term.signed_term_url!)}>
                                        <ImageIcon size={20} weight="duotone" />
                                        Ver foto
                                    </Button>
                                )}
                                {term.signed_term_status === 'under_review' && (
                                    <Button
                                        size="sm"
                                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={approving === term.athlete_id || isPending}
                                        onClick={() => handleApprove(term.athlete_id)}
                                    >
                                        <CheckIcon size={20} weight="bold" />
                                        {approving === term.athlete_id ? 'Aprovando...' : 'Aprovar'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Foto do Termo Assinado</DialogTitle>
                    </DialogHeader>
                    {previewUrl && (
                        previewIsPdf ? (
                            <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title="Termo assinado" />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="Termo assinado" className="w-full rounded-lg object-contain max-h-[70vh]" />
                        )
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

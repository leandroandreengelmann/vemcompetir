'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CircleNotchIcon, TrashIcon, UploadSimpleIcon, CheckCircleIcon, ImageIcon } from '@phosphor-icons/react';
import { uploadSecondaryImageAction, deleteSecondaryImageAction } from './actions';
import { cn } from '@/lib/utils';

interface SlotProps {
    eventId: string;
    slot: '1' | '2';
    label: string;
    initialUrl: string | null;
}

function ImageSlot({ eventId, slot, label, initialUrl }: SlotProps) {
    const [url, setUrl] = useState<string | null>(initialUrl);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [feedback, setFeedback] = useState<'saved' | 'deleted' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showFeedback = (type: 'saved' | 'deleted') => {
        setFeedback(type);
        setTimeout(() => setFeedback(null), 3000);
    };

    const resizeAndUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 1200;
                const scale = Math.min(MAX / img.width, 1);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    setUploading(true);
                    const formData = new FormData();
                    formData.set('event_id', eventId);
                    formData.set('slot', slot);
                    formData.set('file', blob, `secondary_${slot}.jpg`);
                    const result = await uploadSecondaryImageAction(formData);
                    setUploading(false);
                    if (result.success) {
                        setUrl(URL.createObjectURL(blob));
                        showFeedback('saved');
                    }
                }, 'image/jpeg', 0.92);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = async () => {
        setConfirmOpen(false);
        setDeleting(true);
        const result = await deleteSecondaryImageAction(eventId, slot);
        setDeleting(false);
        if (result.success) {
            setUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            showFeedback('deleted');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-panel-sm font-black uppercase tracking-widest text-muted-foreground">
                    {label}
                </h3>
                {feedback && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-panel-sm font-bold px-3 py-1 rounded-full transition-all",
                        feedback === 'saved'
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                        <CheckCircleIcon size={14} weight="duotone" />
                        {feedback === 'saved' ? 'Imagem salva!' : 'Imagem deletada!'}
                    </div>
                )}
            </div>

            {/* Preview area */}
            <div
                className={cn(
                    "relative w-full rounded-xl border-2 overflow-hidden transition-all",
                    url
                        ? "border-border bg-card"
                        : "border-dashed border-border bg-muted/20 cursor-pointer hover:bg-muted/30 hover:border-primary/40"
                )}
                onClick={() => !url && fileInputRef.current?.click()}
            >
                {url ? (
                    <img
                        src={url}
                        alt={label}
                        className="w-full h-auto block"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-14">
                        <div className="p-4 rounded-full bg-muted border border-border">
                            <ImageIcon size={28} weight="duotone" className="text-muted-foreground/50" />
                        </div>
                        <div className="text-center">
                            <p className="text-panel-sm font-bold text-muted-foreground">Clique para enviar</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG • Máx 1200px de largura</p>
                        </div>
                    </div>
                )}

                {(uploading || deleting) && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <CircleNotchIcon size={28} weight="bold" className="animate-spin text-primary" />
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    pill
                    className="flex-1 h-10 text-panel-sm font-bold"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || deleting}
                >
                    <UploadSimpleIcon size={16} weight="duotone" className="mr-2" />
                    {url ? 'Substituir' : 'Enviar imagem'}
                </Button>

                {url && (
                    <Button
                        type="button"
                        variant="outline"
                        pill
                        className="h-10 px-4 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => setConfirmOpen(true)}
                        disabled={uploading || deleting}
                    >
                        <TrashIcon size={16} weight="duotone" />
                    </Button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) resizeAndUpload(file);
                    e.target.value = '';
                }}
            />

            {/* Delete confirmation */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-full bg-destructive/10">
                                <TrashIcon size={18} weight="duotone" className="text-destructive" />
                            </div>
                            <DialogTitle>Deletar imagem?</DialogTitle>
                        </div>
                        <DialogDescription>
                            A imagem será removida permanentemente da página do evento. Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Sim, deletar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface SecondaryImagesManagerProps {
    eventId: string;
    eventTitle: string;
    secondary1Url: string | null;
    secondary2Url: string | null;
}

export function SecondaryImagesManager({
    eventId,
    eventTitle,
    secondary1Url,
    secondary2Url,
}: SecondaryImagesManagerProps) {
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ImageSlot
                    eventId={eventId}
                    slot="1"
                    label="Imagem 1"
                    initialUrl={secondary1Url}
                />
                <ImageSlot
                    eventId={eventId}
                    slot="2"
                    label="Imagem 2"
                    initialUrl={secondary2Url}
                />
            </div>
            <p className="text-xs text-muted-foreground text-center">
                As imagens aparecem lado a lado abaixo da imagem principal na página pública do evento.
            </p>
        </div>
    );
}

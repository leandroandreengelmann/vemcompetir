'use client';

import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CameraIcon, TrashIcon, CircleNotchIcon, UserIcon } from '@phosphor-icons/react';
import { uploadAvatarAction, removeAvatarAction } from '../actions';
import { showToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

interface AvatarUploaderProps {
    currentUrl?: string | null;
    fullName?: string | null;
    beltColor?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

async function resizeImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const size = 512;
    const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))),
            type,
            0.9,
        );
    });
}

export function AvatarUploader({ currentUrl, fullName, beltColor = 'branca' }: AvatarUploaderProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);

    const isWhite = beltColor.toLowerCase().trim() === 'branca';
    const initial = fullName?.trim().charAt(0).toUpperCase() || '?';

    const handleSelect = () => inputRef.current?.click();

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED.includes(file.type)) {
            showToast.error('Formato inválido', 'Use JPG, PNG ou WEBP.');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_BYTES) {
            showToast.error('Imagem muito grande', 'Máximo 2 MB.');
            e.target.value = '';
            return;
        }

        setLoading(true);
        try {
            const resized = await resizeImage(file);
            const finalFile = new File([resized], file.name, { type: resized.type });

            const fd = new FormData();
            fd.append('avatar', finalFile);

            const result = await uploadAvatarAction(fd);
            if (result?.error) {
                showToast.error('Erro', result.error);
            } else if (result?.url) {
                setPreviewUrl(result.url);
                showToast.success('Foto atualizada', 'Sua foto de perfil foi salva.');
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            showToast.error('Erro', 'Não foi possível processar a imagem.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleRemove = async () => {
        setLoading(true);
        try {
            const result = await removeAvatarAction();
            if (result?.error) {
                showToast.error('Erro', result.error);
            } else {
                setPreviewUrl(null);
                showToast.success('Foto removida', 'Sua foto de perfil foi removida.');
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <Avatar className="h-32 w-32 shadow-md border-4 border-white">
                    {previewUrl && <AvatarImage src={previewUrl} alt={fullName || 'Avatar'} />}
                    <AvatarFallback
                        className={`text-4xl font-bold ${
                            isWhite ? 'bg-brand-950 text-white' : 'bg-primary text-primary-foreground'
                        }`}
                    >
                        {previewUrl ? <UserIcon size={48} weight="duotone" /> : initial}
                    </AvatarFallback>
                </Avatar>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <CircleNotchIcon size={32} weight="bold" className="animate-spin text-white" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-2">
                <p className="text-panel-sm text-muted-foreground font-medium">
                    Opcional — ajuda a identificar você em eventos
                </p>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelect}
                        disabled={loading}
                        className="rounded-full font-semibold"
                    >
                        <CameraIcon size={16} weight="duotone" className="mr-1.5" />
                        {previewUrl ? 'Alterar foto' : 'Adicionar foto'}
                    </Button>
                    {previewUrl && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={loading}
                            className="rounded-full font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <TrashIcon size={16} weight="duotone" className="mr-1.5" />
                            Remover
                        </Button>
                    )}
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="hidden"
            />
        </div>
    );
}

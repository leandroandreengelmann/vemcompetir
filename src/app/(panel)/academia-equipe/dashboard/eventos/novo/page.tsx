'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEventAction } from '../actions';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { cn } from "@/lib/utils";

export default function NovoEventoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [resizedImage, setResizedImage] = useState<Blob | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize to 200x200 using Canvas
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Draw image centered and cropped (cover)
                    const scale = Math.max(200 / img.width, 200 / img.height);
                    const x = (200 - img.width * scale) / 2;
                    const y = (200 - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            setResizedImage(blob);
                            setImagePreview(URL.createObjectURL(blob));
                        }
                    }, 'image/jpeg', 0.8);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImagePreview(null);
        setResizedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);

            // Append resized image if exists
            if (resizedImage) {
                formData.set('image', resizedImage, 'thumb.jpg');
            }

            const result = await createEventAction(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            router.push('/academia-equipe/dashboard/eventos');
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocorreu um erro ao criar o evento.';
            setError(message);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
            <div className="w-full max-w-2xl space-y-10">
                <div className="space-y-6">
                    <Link
                        href="/academia-equipe/dashboard/eventos"
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={16} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>

                    <SectionHeader
                        title="Novo Evento"
                        description="Preencha os dados e o endereço para criar um novo evento."
                        className="text-center md:flex-col md:items-center"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Informações Básicas */}
                        <div className="space-y-6">
                            <h3 className="text-panel-md font-semibold border-b pb-2">
                                Dados do Evento
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="title" className="text-panel-sm font-semibold text-muted-foreground">
                                        Título do Evento *
                                    </label>
                                    <Input
                                        id="title"
                                        name="title"
                                        placeholder="Ex: Copa de Inverno"
                                        variant="lg"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="event_date" className="text-panel-sm font-semibold text-muted-foreground">
                                        Data do Evento *
                                    </label>
                                    <Input
                                        id="event_date"
                                        name="event_date"
                                        type="datetime-local"
                                        variant="lg"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="location" className="text-panel-sm font-semibold text-muted-foreground">
                                        Local (Nome da Arena/Ginásio)
                                    </label>
                                    <Input
                                        id="location"
                                        name="location"
                                        placeholder="Ex: Ginásio Municipal"
                                        variant="lg"
                                        disabled={loading}
                                    />
                                </div>

                            </div>
                        </div>

                        {/* Endereço e Imagem */}
                        <div className="space-y-6">
                            <h3 className="text-panel-md font-semibold border-b pb-2">
                                Endereço
                            </h3>

                            <div className="grid gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="sm:col-span-3 space-y-2">
                                        <label htmlFor="address_street" className="text-panel-sm font-semibold text-muted-foreground">
                                            Rua *
                                        </label>
                                        <Input id="address_street" name="address_street" variant="lg" required disabled={loading} placeholder="Rua..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_number" className="text-panel-sm font-semibold text-muted-foreground">
                                            Nº
                                        </label>
                                        <Input id="address_number" name="address_number" variant="lg" disabled={loading} placeholder="123" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="address_neighborhood" className="text-panel-sm font-semibold text-muted-foreground">
                                            Bairro
                                        </label>
                                        <Input id="address_neighborhood" name="address_neighborhood" variant="lg" disabled={loading} placeholder="Centro" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_zip" className="text-panel-sm font-semibold text-muted-foreground">
                                            CEP
                                        </label>
                                        <Input id="address_zip" name="address_zip" variant="lg" disabled={loading} placeholder="00000-000" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 space-y-2">
                                        <label htmlFor="address_city" className="text-panel-sm font-semibold text-muted-foreground">
                                            Cidade *
                                        </label>
                                        <Input id="address_city" name="address_city" variant="lg" required disabled={loading} placeholder="Cidade" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_state" className="text-panel-sm font-semibold text-muted-foreground">
                                            Estado *
                                        </label>
                                        <Input id="address_state" name="address_state" variant="lg" required disabled={loading} placeholder="UF" maxLength={2} className="uppercase" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h3 className="text-panel-md font-semibold border-b pb-2">
                                    Imagem do Evento
                                </h3>

                                <div className="flex flex-col items-center gap-4">
                                    <div
                                        className={cn(
                                            "relative size-[260px] sm:size-[320px] rounded-2xl border flex flex-col items-center justify-center p-1 bg-muted/10 transition-all overflow-hidden cursor-pointer hover:bg-muted/20",
                                            imagePreview ? "border-primary/20" : "border-dashed border-input"
                                        )}
                                        onClick={() => !imagePreview && fileInputRef.current?.click()}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute top-2 right-2 px-3 py-1 bg-destructive text-white text-panel-sm font-bold rounded-full hover:scale-105 transition-transform shadow-lg"
                                                >
                                                    Remover
                                                </button>
                                            </>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center transition-opacity"
                                            >
                                                <span className="text-panel-sm font-semibold opacity-60">ENVIAR IMAGEM</span>
                                                <span className="text-panel-sm mt-1 opacity-40">Recomendado: 200×200</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-8 border-t">
                        <Button
                            type="submit"
                            pill
                            className="w-full max-w-[320px] h-12 transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Evento'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

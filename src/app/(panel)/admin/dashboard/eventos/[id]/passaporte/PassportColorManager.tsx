'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CircleNotchIcon, CheckCircleIcon, PaintBrushIcon } from '@phosphor-icons/react';
import { updatePassportColorAction } from './actions';
import { toast } from 'sonner';

const PALETTES = [
    { label: 'Navy', from: '#0A0D12', via: '#141929' },
    { label: 'Índigo', from: '#0C0A14', via: '#18122C' },
    { label: 'Teal', from: '#08100E', via: '#0F2218' },
    { label: 'Carmesim', from: '#130808', via: '#281212' },
    { label: 'Meia-noite', from: '#070A10', via: '#0E1422' },
    { label: 'Pinheiro', from: '#080F09', via: '#0F1E10' },
    { label: 'Berinjela', from: '#0F0809', via: '#211012' },
    { label: 'Grafite', from: '#0B0B0E', via: '#16161E' },
];

interface Props {
    eventId: string;
    eventTitle: string;
    initialFrom: string | null;
    initialVia: string | null;
}

function findPaletteIndex(from: string | null, via: string | null): number {
    if (!from || !via) return -1;
    return PALETTES.findIndex(p => p.from === from && p.via === via);
}

export function PassportColorManager({ eventId, eventTitle, initialFrom, initialVia }: Props) {
    const initialIndex = findPaletteIndex(initialFrom, initialVia);
    const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
    const [saving, setSaving] = useState(false);

    const selectedPalette = selectedIndex >= 0 ? PALETTES[selectedIndex] : null;
    const previewFrom = selectedPalette?.from ?? initialFrom ?? '#0A0D12';
    const previewVia = selectedPalette?.via ?? initialVia ?? '#141929';

    const isDirty = selectedIndex !== initialIndex;

    async function handleSave() {
        if (selectedIndex < 0) return;
        setSaving(true);
        const palette = PALETTES[selectedIndex];
        const result = await updatePassportColorAction(eventId, palette.from, palette.via);
        setSaving(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Cor do passaporte salva com sucesso!');
        }
    }

    async function handleReset() {
        setSaving(true);
        const result = await updatePassportColorAction(eventId, null, null);
        setSaving(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            setSelectedIndex(-1);
            toast.success('Cor redefinida para automática.');
        }
    }

    return (
        <div className="space-y-10">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3">
                <p className="text-panel-sm font-medium text-muted-foreground">Pré-visualização</p>
                <div
                    style={{
                        width: '280px',
                        height: '420px',
                        background: `linear-gradient(160deg, ${previewFrom} 0%, ${previewVia} 50%, ${previewFrom} 100%)`,
                        borderRadius: '16px',
                        overflow: 'hidden',
                        position: 'relative',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
                        flexShrink: 0,
                    }}
                >
                    {/* Grid texture */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 12px)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Top accent bar */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)' }} />

                    {/* Header */}
                    <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em' }}>
                            COMPETIR
                        </div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '999px',
                            padding: '3px 9px',
                        }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ color: '#34d399', fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em' }}>CONFIRMADO</span>
                        </div>
                    </div>

                    {/* Event info */}
                    <div style={{ padding: '0 18px 12px' }}>
                        <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, margin: 0, marginBottom: '4px', lineHeight: 1.3 }}>
                            {eventTitle}
                        </p>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 500 }}>Data · Local do evento</span>
                    </div>

                    {/* Separator */}
                    <div style={{ margin: '0 12px', borderTop: '1px dashed rgba(255,255,255,0.12)', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-18px', top: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: '#ffffff' }} />
                        <div style={{ position: 'absolute', right: '-18px', top: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: '#ffffff' }} />
                    </div>

                    {/* Athlete */}
                    <div style={{ padding: '16px 18px 12px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '4px' }}>ATLETA</p>
                        <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 900, margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Nome do Atleta</p>
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>Academia</span>
                            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '8px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>FAIXA</span>
                        </div>
                    </div>

                    {/* Category */}
                    <div style={{ margin: '0 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '3px' }}>CATEGORIA</p>
                        <p style={{ color: '#ffffff', fontSize: '10px', fontWeight: 700, margin: 0 }}>Masculino · Adulto · Branca · Leve</p>
                    </div>

                    {/* Code */}
                    <div style={{ padding: '12px 18px 0' }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '4px' }}>CÓDIGO</p>
                        <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 900, letterSpacing: '0.18em', fontFamily: 'monospace', margin: 0 }}>EVT-2026-XXXX</p>
                    </div>

                    {/* Footer */}
                    <div style={{ position: 'absolute', bottom: '12px', left: '18px', right: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>vemcompetir.com.br</span>
                    </div>
                </div>

                {selectedIndex === -1 && (
                    <p className="text-panel-sm text-muted-foreground text-center">
                        Cor automática (gerada pelo ID do evento)
                    </p>
                )}
            </div>

            {/* Palette selector */}
            <div className="space-y-4">
                <p className="text-panel-sm font-semibold text-foreground flex items-center gap-2">
                    <PaintBrushIcon size={16} weight="duotone" />
                    Selecione uma paleta
                </p>
                <div className="grid grid-cols-4 gap-3">
                    {PALETTES.map((palette, index) => {
                        const isSelected = selectedIndex === index;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setSelectedIndex(index)}
                                className={`relative rounded-xl overflow-hidden h-20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'ring-2 ring-primary scale-105 shadow-lg' : 'hover:scale-102 hover:shadow-md opacity-80 hover:opacity-100'}`}
                                title={palette.label}
                                style={{
                                    background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.via} 100%)`,
                                }}
                            >
                                <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-bold text-white/60 uppercase tracking-wider">
                                    {palette.label}
                                </span>
                                {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <CheckCircleIcon size={24} weight="fill" className="text-white drop-shadow-lg" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving || selectedIndex < 0 || !isDirty}
                    className="h-11 px-8 font-bold text-panel-sm"
                >
                    {saving ? (
                        <>
                            <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar cor'
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving || initialIndex === -1}
                    className="h-11 px-6 font-bold text-panel-sm text-muted-foreground"
                >
                    Redefinir para automático
                </Button>
            </div>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleNotchIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { updatePassportColorAction } from './actions';
import { toast } from 'sonner';

const GOOGLE_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Bebas+Neue&family=Oswald:wght@400;700&family=Montserrat:wght@400;700;900&family=Barlow:wght@400;700;900&family=Space+Grotesk:wght@400;700&display=swap';

export const PASSPORT_FONTS = [
    { label: 'Inter', value: 'Inter', family: "'Inter', sans-serif" },
    { label: 'Bebas Neue', value: 'Bebas Neue', family: "'Bebas Neue', cursive" },
    { label: 'Oswald', value: 'Oswald', family: "'Oswald', sans-serif" },
    { label: 'Montserrat', value: 'Montserrat', family: "'Montserrat', sans-serif" },
    { label: 'Barlow', value: 'Barlow', family: "'Barlow', sans-serif" },
    { label: 'Space Grotesk', value: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
];

const DEFAULT_FROM = '#0A0D12';
const DEFAULT_VIA = '#141929';
const DEFAULT_TEXT = '#ffffff';
const DEFAULT_FONT = 'Inter';
const DEFAULT_RADIUS = 16;

function isValidHex(value: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

function normalizeHex(value: string): string {
    const v = value.trim();
    if (!v.startsWith('#')) return '#' + v;
    return v;
}

interface Props {
    eventId: string;
    eventTitle: string;
    initialFrom: string | null;
    initialVia: string | null;
    initialTextColor: string | null;
    initialFont: string | null;
    initialBorderRadius: number | null;
}

export function PassportColorManager({
    eventId,
    eventTitle,
    initialFrom,
    initialVia,
    initialTextColor,
    initialFont,
    initialBorderRadius,
}: Props) {
    const [bgFrom, setBgFrom] = useState(initialFrom ?? DEFAULT_FROM);
    const [bgVia, setBgVia] = useState(initialVia ?? DEFAULT_VIA);
    const [textColor, setTextColor] = useState(initialTextColor ?? DEFAULT_TEXT);
    const [font, setFont] = useState(initialFont ?? DEFAULT_FONT);
    const [borderRadius, setBorderRadius] = useState(initialBorderRadius ?? DEFAULT_RADIUS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = GOOGLE_FONTS_URL;
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const previewFrom = isValidHex(bgFrom) ? bgFrom : DEFAULT_FROM;
    const previewVia = isValidHex(bgVia) ? bgVia : DEFAULT_VIA;
    const previewText = isValidHex(textColor) ? textColor : DEFAULT_TEXT;
    const selectedFont = PASSPORT_FONTS.find(f => f.value === font) ?? PASSPORT_FONTS[0];

    function handleHexInput(setter: (v: string) => void) {
        return (e: React.ChangeEvent<HTMLInputElement>) => {
            let v = e.target.value;
            if (!v.startsWith('#') && v.length > 0) v = '#' + v;
            setter(v);
        };
    }

    async function handleSave() {
        const from = normalizeHex(bgFrom);
        const via = normalizeHex(bgVia);
        const text = normalizeHex(textColor);

        if (!isValidHex(from) || !isValidHex(via) || !isValidHex(text)) {
            toast.error('Uma ou mais cores estão inválidas. Use o formato #RRGGBB.');
            return;
        }

        setSaving(true);
        const result = await updatePassportColorAction(eventId, from, via, text, font, borderRadius);
        setSaving(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Passaporte salvo!');
        }
    }

    async function handleReset() {
        setSaving(true);
        const result = await updatePassportColorAction(eventId, null, null, null, null, null);
        setSaving(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            setBgFrom(DEFAULT_FROM);
            setBgVia(DEFAULT_VIA);
            setTextColor(DEFAULT_TEXT);
            setFont(DEFAULT_FONT);
            setBorderRadius(DEFAULT_RADIUS);
            toast.success('Redefinido para automático.');
        }
    }

    return (
        <div className="space-y-10">

            {/* Live Preview */}
            <div className="flex flex-col items-center gap-3">
                <p className="text-panel-sm font-medium text-muted-foreground">Pré-visualização</p>
                <div
                    style={{
                        width: '280px',
                        height: '420px',
                        background: `linear-gradient(160deg, ${previewFrom} 0%, ${previewVia} 50%, ${previewFrom} 100%)`,
                        borderRadius: `${borderRadius}px`,
                        overflow: 'hidden',
                        position: 'relative',
                        fontFamily: selectedFont.family,
                        boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
                    }}
                >
                    {/* Grid texture */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 12px)`,
                        pointerEvents: 'none',
                    }} />

                    {/* Top accent */}
                    <div style={{ height: '4px', background: `${previewText}26` }} />

                    {/* Header */}
                    <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: previewText, fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', opacity: 0.9 }}>
                            COMPETIR
                        </div>
                        <span style={{ color: previewText, fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', opacity: 0.7 }}>CONFIRMADO</span>
                    </div>

                    {/* Event name */}
                    <div style={{ padding: '0 18px 12px' }}>
                        <p style={{ color: previewText, fontSize: '11px', fontWeight: 700, margin: 0, marginBottom: '4px', lineHeight: 1.3 }}>
                            {eventTitle}
                        </p>
                        <span style={{ color: previewText, fontSize: '9px', fontWeight: 500, opacity: 0.4 }}>Data · Local do evento</span>
                    </div>

                    {/* Separator */}
                    <div style={{ margin: '0 12px', borderTop: `1px dashed ${previewText}20`, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-18px', top: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: previewText }} />
                        <div style={{ position: 'absolute', right: '-18px', top: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: previewText }} />
                    </div>

                    {/* Athlete */}
                    <div style={{ padding: '16px 18px 12px' }}>
                        <p style={{ color: previewText, fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '4px', opacity: 0.35 }}>ATLETA</p>
                        <p style={{ color: previewText, fontSize: '20px', fontWeight: 900, margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Nome do Atleta</p>
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: previewText, fontSize: '9px', opacity: 0.4 }}>Academia</span>
                            <span style={{ background: `${previewText}26`, color: previewText, fontSize: '8px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>FAIXA</span>
                        </div>
                    </div>

                    {/* Category */}
                    <div style={{ margin: '0 12px', background: `${previewText}0f`, border: `1px solid ${previewText}1a`, borderRadius: '10px', padding: '10px 12px' }}>
                        <p style={{ color: previewText, fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '3px', opacity: 0.35 }}>CATEGORIA</p>
                        <p style={{ color: previewText, fontSize: '10px', fontWeight: 700, margin: 0 }}>Masculino · Adulto · Branca · Leve</p>
                    </div>

                    {/* Code */}
                    <div style={{ padding: '12px 18px 0' }}>
                        <p style={{ color: previewText, fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, marginBottom: '4px', opacity: 0.35 }}>CÓDIGO</p>
                        <p style={{ color: previewText, fontSize: '18px', fontWeight: 900, letterSpacing: '0.18em', fontFamily: 'monospace', margin: 0 }}>EVT-2026-XXXX</p>
                    </div>

                    {/* Footer */}
                    <div style={{ position: 'absolute', bottom: '12px', left: '18px', right: '18px' }}>
                        <span style={{ color: previewText, fontSize: '9px', opacity: 0.2 }}>vemcompetir.com.br</span>
                    </div>
                </div>
            </div>

            {/* Color inputs */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* BG From */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium">Fundo — início</Label>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-lg border border-border shrink-0 cursor-pointer"
                                style={{ background: previewFrom }}
                                onClick={() => document.getElementById('picker-from')?.click()}
                            />
                            <input
                                id="picker-from"
                                type="color"
                                value={previewFrom}
                                onChange={(e) => setBgFrom(e.target.value)}
                                className="sr-only"
                            />
                            <Input
                                value={bgFrom}
                                onChange={handleHexInput(setBgFrom)}
                                placeholder="#0A0D12"
                                className={`h-10 font-mono text-panel-sm uppercase ${bgFrom && !isValidHex(bgFrom) ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                maxLength={7}
                            />
                        </div>
                    </div>

                    {/* BG Via */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium">Fundo — fim</Label>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-lg border border-border shrink-0 cursor-pointer"
                                style={{ background: previewVia }}
                                onClick={() => document.getElementById('picker-via')?.click()}
                            />
                            <input
                                id="picker-via"
                                type="color"
                                value={previewVia}
                                onChange={(e) => setBgVia(e.target.value)}
                                className="sr-only"
                            />
                            <Input
                                value={bgVia}
                                onChange={handleHexInput(setBgVia)}
                                placeholder="#141929"
                                className={`h-10 font-mono text-panel-sm uppercase ${bgVia && !isValidHex(bgVia) ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                maxLength={7}
                            />
                        </div>
                    </div>

                    {/* Text color */}
                    <div className="space-y-2">
                        <Label className="text-panel-sm font-medium">Cor do texto</Label>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-lg border border-border shrink-0 cursor-pointer"
                                style={{ background: previewText }}
                                onClick={() => document.getElementById('picker-text')?.click()}
                            />
                            <input
                                id="picker-text"
                                type="color"
                                value={previewText}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="sr-only"
                            />
                            <Input
                                value={textColor}
                                onChange={handleHexInput(setTextColor)}
                                placeholder="#ffffff"
                                className={`h-10 font-mono text-panel-sm uppercase ${textColor && !isValidHex(textColor) ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                maxLength={7}
                            />
                        </div>
                    </div>
                </div>

                <p className="text-panel-sm text-muted-foreground">
                    Clique no quadrado colorido para abrir o seletor visual, ou digite o código hex diretamente (ex: <span className="font-mono">#1a2b3c</span>).
                </p>
            </div>

            {/* Typography */}
            <div className="space-y-3">
                <p className="text-panel-sm font-semibold text-foreground">Tipografia</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PASSPORT_FONTS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setFont(f.value)}
                            className={`flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left ${font === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}`}
                        >
                            <span className="text-xs text-muted-foreground mb-1">{f.label}</span>
                            <span style={{ fontFamily: f.family, fontSize: '20px', fontWeight: 700, lineHeight: 1.2 }} className="text-foreground">
                                Aa
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Border radius */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-panel-sm font-semibold text-foreground">Arredondamento das bordas</p>
                    <span className="text-panel-sm font-mono text-muted-foreground">{borderRadius}px</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={32}
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 — Quadrado</span>
                    <span>32 — Arredondado</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    pill
                    className="h-12 min-w-[160px] text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                >
                    {saving ? (
                        <>
                            <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar'
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                    pill
                    className="h-12 min-w-[160px] text-panel-sm font-bold text-muted-foreground"
                >
                    <ArrowCounterClockwiseIcon size={15} weight="bold" className="mr-2" />
                    Automático
                </Button>
            </div>
        </div>
    );
}

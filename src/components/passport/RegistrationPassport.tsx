'use client';

import React from 'react';
import { getBeltColor } from '@/lib/belt-theme';
import type { PassportData, PassportStatus } from '@/app/atleta/dashboard/inscricoes/passport-actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_PALETTES = [
    { from: '#0A0D12', via: '#141929' }, // navy (default)
    { from: '#0C0A14', via: '#18122C' }, // indigo
    { from: '#08100E', via: '#0F2218' }, // teal
    { from: '#130808', via: '#281212' }, // crimson
    { from: '#070A10', via: '#0E1422' }, // midnight blue
    { from: '#080F09', via: '#0F1E10' }, // pine
    { from: '#0F0809', via: '#211012' }, // aubergine
    { from: '#0B0B0E', via: '#16161E' }, // graphite
];

function getEventPalette(eventId: string) {
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
        hash = ((hash << 5) - hash) + eventId.charCodeAt(i);
        hash |= 0;
    }
    return EVENT_PALETTES[Math.abs(hash) % EVENT_PALETTES.length];
}

const STATUS_LABEL: Record<PassportStatus, string> = {
    pago: 'CONFIRMADO',
    confirmado: 'CONFIRMADO',
    isento: 'ISENTO',
};

interface RegistrationPassportProps {
    data: PassportData;
    passportRef?: React.RefObject<HTMLDivElement>;
}

export function RegistrationPassport({ data, passportRef }: RegistrationPassportProps) {
    const palette = getEventPalette(data.event_id);
    const beltColor = getBeltColor(data.belt_color);
    const isLightBelt = ['branca', 'amarela'].includes(data.belt_color?.toLowerCase() || '');
    const beltTextColor = isLightBelt ? '#0f172a' : '#ffffff';

    const formattedDate = data.event_date
        ? format(new Date(data.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : '';

    return (
        <div
            ref={passportRef}
            style={{
                width: '390px',
                minHeight: '620px',
                background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.via} 50%, ${palette.from} 100%)`,
                overflow: 'visible',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Subtle grid texture overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `repeating-linear-gradient(
                    45deg,
                    rgba(255,255,255,0.015) 0px,
                    rgba(255,255,255,0.015) 1px,
                    transparent 1px,
                    transparent 12px
                )`,
                pointerEvents: 'none',
            }} />

            {/* Belt color accent bar */}
            <div style={{
                height: '5px',
                background: beltColor,
                flexShrink: 0,
            }} />

            {/* Header */}
            <div style={{
                padding: '20px 24px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <img
                    src="/logo-white.png"
                    alt="COMPETIR"
                    style={{ height: '24px', objectFit: 'contain' }}
                />
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '999px',
                    padding: '4px 12px',
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10b981',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        color: '#34d399',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                    }}>
                        {STATUS_LABEL[data.status]}
                    </span>
                </div>
            </div>

            {/* Event info */}
            <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
                <p style={{
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: 0,
                    marginBottom: '6px',
                }}>
                    {data.event_title}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {formattedDate && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '6px' }}>Data</span>
                            {formattedDate}
                        </span>
                    )}
                    {data.event_location && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '6px' }}>Local</span>
                            {data.event_location}
                        </span>
                    )}
                </div>
            </div>

            {/* Dashed separator — ticket stub style */}
            <div style={{
                margin: '0 16px',
                borderTop: '1.5px dashed rgba(255,255,255,0.12)',
                position: 'relative',
                flexShrink: 0,
            }}>
                <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                }} />
                <div style={{
                    position: 'absolute',
                    right: '-24px',
                    top: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                }} />
            </div>

            {/* Athlete section */}
            <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
                <p style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: '6px',
                }}>
                    ATLETA
                </p>
                <p style={{
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    margin: 0,
                    marginBottom: '8px',
                    letterSpacing: '-0.02em',
                }}>
                    {data.athlete_name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {data.gym_name && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginRight: '6px' }}>Academia</span>
                            {data.gym_name}
                        </span>
                    )}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: beltColor,
                        color: beltTextColor,
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        border: isLightBelt ? '1px solid rgba(0,0,0,0.15)' : '1px solid transparent',
                    }}>
                        {data.belt_color}
                    </span>
                </div>
            </div>

            {/* Category box */}
            <div style={{
                margin: '0 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                flexShrink: 0,
            }}>
                <p style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: '4px',
                }}>
                    CATEGORIA
                </p>
                <p style={{
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: 1.4,
                }}>
                    {data.categoria_completa}
                </p>
            </div>

            {/* Registration code */}
            <div style={{
                margin: '16px 16px 0',
                padding: '14px 16px',
                flexShrink: 0,
            }}>
                <p style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: '6px',
                }}>
                    CÓDIGO DE INSCRIÇÃO
                </p>
                <p style={{
                    color: '#ffffff',
                    fontSize: '26px',
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    fontFamily: 'monospace, system-ui',
                    margin: 0,
                }}>
                    {data.registration_code}
                </p>
            </div>

            {/* Bottom tear line with cutout circles */}
            <div style={{
                margin: '16px 16px 0',
                borderTop: '1.5px dashed rgba(255,255,255,0.12)',
                position: 'relative',
                flexShrink: 0,
            }}>
                <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                }} />
                <div style={{
                    position: 'absolute',
                    right: '-24px',
                    top: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                }} />
            </div>

            {/* Footer */}
            <div style={{
                marginTop: 'auto',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <span style={{
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: '11px',
                    fontWeight: 500,
                }}>
                    vemcompetir.com.br
                </span>
                <img
                    src="/competir-icon-white.png"
                    alt=""
                    style={{ height: '20px', opacity: 0.2, objectFit: 'contain' }}
                />
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { WarningCircleIcon, CheckCircleIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhone, normalizeNumeric } from '@/lib/validation';
import { sendPhoneVerificationAction, confirmPhoneVerificationAction } from '../actions';

interface PhoneVerificationBannerProps {
    phone: string;
}

export function PhoneVerificationBanner({ phone: initialPhone }: PhoneVerificationBannerProps) {
    const [step, setStep] = useState<'idle' | 'sending' | 'code' | 'confirming' | 'verified'>('idle');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Troca de número
    const [changingPhone, setChangingPhone] = useState(false);
    const [newPhoneValue, setNewPhoneValue] = useState('');

    const activePhone = changingPhone
        ? normalizeNumeric(newPhoneValue)
        : normalizeNumeric(initialPhone);

    const activePhoneFormatted = changingPhone
        ? newPhoneValue
        : formatPhone(initialPhone);

    if (step === 'verified') {
        return (
            <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                <CheckCircleIcon size={18} weight="fill" className="shrink-0" />
                WhatsApp verificado com sucesso!
            </div>
        );
    }

    const handleSend = async () => {
        if (activePhone.length < 10) {
            setError('Digite um número de WhatsApp válido.');
            return;
        }
        setStep('sending');
        setError(null);
        const result = await sendPhoneVerificationAction(activePhone);
        if (result.error) { setError(result.error); setStep('idle'); return; }
        setStep('code');
    };

    const handleConfirm = async () => {
        setStep('confirming');
        setError(null);
        const result = await confirmPhoneVerificationAction(activePhone, code);
        if (result.error) { setError(result.error); setStep('code'); return; }
        setStep('verified');
    };

    return (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                    <WarningCircleIcon size={18} weight="fill" className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Confirme seu WhatsApp</p>
                        <p className="text-xs text-red-600 mt-0.5">
                            Verifique para receber notificações de inscrição e eventos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Campo para trocar número */}
            {changingPhone ? (
                <div className="space-y-2">
                    <Input
                        type="tel"
                        value={newPhoneValue}
                        onChange={e => { setNewPhoneValue(formatPhone(e.target.value)); setStep('idle'); setCode(''); setError(null); }}
                        placeholder="(66) 99999-9999"
                        className="h-9 rounded-xl shadow-none text-sm"
                        autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Formato: (DDD) 99999-9999</p>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-red-800">{activePhoneFormatted}</span>
                    <button
                        type="button"
                        onClick={() => { setChangingPhone(true); setStep('idle'); setCode(''); setError(null); }}
                        className="text-xs text-red-500 underline underline-offset-2 hover:text-red-700"
                    >
                        Trocar número
                    </button>
                </div>
            )}

            {/* Ações */}
            {step === 'idle' && (
                <Button
                    type="button" size="sm" variant="outline" pill
                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={handleSend}
                    disabled={changingPhone && activePhone.length < 10}
                >
                    Enviar código via WhatsApp
                </Button>
            )}

            {step === 'sending' && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <CircleNotchIcon size={13} className="animate-spin" /> Enviando código...
                </p>
            )}

            {(step === 'code' || step === 'confirming') && (
                <div className="space-y-2">
                    <p className="text-xs text-red-700">
                        Código enviado para <span className="font-bold font-mono">{activePhoneFormatted}</span>. Digite abaixo:
                    </p>
                    <div className="flex items-center gap-2">
                        <Input
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="h-9 w-28 text-center text-base font-mono rounded-xl shadow-none"
                            autoFocus
                        />
                        <Button
                            type="button" size="sm" pill className="h-9 text-xs"
                            onClick={handleConfirm}
                            disabled={code.length < 6 || step === 'confirming'}
                        >
                            {step === 'confirming' ? <CircleNotchIcon size={13} className="animate-spin" /> : 'Confirmar'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" pill className="h-9 text-xs text-muted-foreground" onClick={handleSend}>
                            Reenviar
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

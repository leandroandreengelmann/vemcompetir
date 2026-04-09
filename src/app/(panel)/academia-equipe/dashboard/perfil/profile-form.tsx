'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAcademiaProfile } from './actions';
import { createClient } from '@/lib/supabase/client';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Profile {
    email: string | null;
    cpf: string | null;
    gym_name: string | null;
    phone: string | null;
}

interface ProfileFormProps {
    profile: Profile;
}

function maskCpfCnpj(value: string) {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 11) {
        return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function maskPhone(value: string) {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 10) {
        return raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export function AcademiaProfileForm({ profile }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [gymName, setGymName] = useState(profile.gym_name || '');
    const [email, setEmail] = useState(profile.email || '');
    const [cpfCnpj, setCpfCnpj] = useState(() => profile.cpf ? maskCpfCnpj(profile.cpf) : '');
    const [phone, setPhone] = useState(() => profile.phone ? maskPhone(profile.phone) : '');
    const [showOtpField, setShowOtpField] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length > 14) return;
        let masked = val;
        if (val.length <= 11) {
            masked = val.replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            masked = val.replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        setCpfCnpj(masked);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) return;
        setPhone(maskPhone(val));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('gymName', gymName);
        formData.append('email', email);
        formData.append('cpf', cpfCnpj);
        formData.append('phone', phone);

        try {
            const result = await updateAcademiaProfile(formData);
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else if (result.emailChanged) {
                setPendingEmail(email);
                setShowOtpField(true);
                setMessage({ type: 'success', text: 'Perfil atualizado! Enviamos um código de verificação para o novo e-mail. Insira-o abaixo para confirmar a troca.' });
            } else {
                setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.verifyOtp({
                email: pendingEmail,
                token: otpCode,
                type: 'email_change',
            });

            if (error) {
                console.error('Verify email change OTP error:', error);
                setMessage({ type: 'error', text: 'Código inválido ou expirado. Tente novamente.' });
            } else {
                setShowOtpField(false);
                setOtpCode('');
                setMessage({ type: 'success', text: 'E-mail alterado com sucesso!' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {message && (
                <Alert
                    variant={message.type === 'success' ? 'info' : 'destructive'}
                >
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            {/* Dados da Academia */}
            <div className="space-y-6">
                <h3 className="text-panel-md font-semibold border-b pb-2">
                    Dados da Academia
                </h3>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="gymName" className="text-panel-sm font-semibold text-muted-foreground">
                            Nome da Academia / Equipe
                        </Label>
                        <Input
                            id="gymName"
                            value={gymName}
                            onChange={(e) => setGymName(e.target.value)}
                            placeholder="Ex: Academia Competir"
                            variant="lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-panel-sm font-semibold text-muted-foreground">
                            Telefone / WhatsApp
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="(00) 00000-0000"
                            variant="lg"
                            className="font-mono"
                            inputMode="numeric"
                        />
                    </div>
                </div>
            </div>

            {/* Dados do Responsável */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-panel-sm font-semibold text-muted-foreground">
                            Email (Login)
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            variant="lg"
                        />
                        {email !== (profile.email || '') && !showOtpField && (
                            <p className="text-panel-sm text-amber-600">
                                Ao salvar, enviaremos um código de verificação para o novo e-mail.
                            </p>
                        )}
                    </div>

                    {showOtpField && (
                        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <Label htmlFor="otpCode" className="text-panel-sm font-semibold text-amber-800">
                                Código de verificação enviado para {pendingEmail}
                            </Label>
                            <Input
                                id="otpCode"
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-2xl tracking-[0.3em] font-bold h-14"
                                variant="lg"
                                inputMode="numeric"
                                autoFocus
                            />
                            <Button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={otpCode.length !== 6 || isLoading}
                                pill
                                className="w-full h-11"
                            >
                                {isLoading ? (
                                    <>
                                        <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    'Confirmar Troca de E-mail'
                                )}
                            </Button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-panel-sm font-semibold text-muted-foreground">
                            CPF ou CNPJ
                        </Label>
                        <Input
                            id="cpf"
                            value={cpfCnpj}
                            onChange={handleCpfCnpjChange}
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            variant="lg"
                            className="font-mono"
                            inputMode="numeric"
                        />
                        <p className="text-panel-sm text-muted-foreground">
                            Necessário para registro no sistema de pagamento Asaas.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-4 pt-4">
                <Button type="submit" disabled={isLoading} pill className="w-1/2 h-11 px-8">
                    {isLoading ? (
                        <>
                            <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar Alterações'
                    )}
                </Button>
                <p className="text-panel-sm text-muted-foreground">
                    Seus dados estão seguros conosco.
                </p>
            </div>
        </form>
    );
}

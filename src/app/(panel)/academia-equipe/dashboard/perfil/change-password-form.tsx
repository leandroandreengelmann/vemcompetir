'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth-errors';

interface ChangePasswordFormProps {
    email: string;
}

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setIsLoading(true);
        try {
            const supabase = createClient();

            // Reautentica com a senha atual antes de trocar — evita que uma sessão
            // esquecida aberta troque a senha sem confirmar quem está pedindo.
            const { error: reauthError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (reauthError) {
                setMessage({ type: 'error', text: getAuthErrorMessage(reauthError) });
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                setMessage({ type: 'error', text: getAuthErrorMessage(updateError) });
                return;
            }

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch {
            setMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-panel-md font-semibold border-b pb-2">
                Alterar Senha
            </h3>

            {message && (
                <Alert variant={message.type === 'success' ? 'info' : 'destructive'}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-panel-sm font-semibold text-muted-foreground">
                        Senha Atual
                    </Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        variant="lg"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-panel-sm font-semibold text-muted-foreground">
                        Nova Senha
                    </Label>
                    <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        variant="lg"
                        required
                        minLength={6}
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword" className="text-panel-sm font-semibold text-muted-foreground">
                        Confirmar Nova Senha
                    </Label>
                    <Input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        variant="lg"
                        required
                        minLength={6}
                        disabled={isLoading}
                    />
                </div>

                <div className="flex justify-center pt-2">
                    <Button type="submit" disabled={isLoading} pill className="w-1/2 h-11 px-8">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Alterando...
                            </>
                        ) : (
                            'Alterar Senha'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

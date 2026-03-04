'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAcademiaProfile } from './actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Profile {
    full_name: string | null;
    email: string | null;
    cpf: string | null; // Note: Although named CPF, it could be a CNPJ in reality
}

interface ProfileFormProps {
    profile: Profile;
}

// Simple CPF/CNPJ masquerade for display
function maskCpfCnpj(value: string) {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 11) {
        return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function AcademiaProfileForm({ profile }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Controlled inputs to allow masking if desired
    const [cpfCnpj, setCpfCnpj] = useState(() => profile.cpf ? maskCpfCnpj(profile.cpf) : '');
    const [fullName, setFullName] = useState(profile.full_name || '');

    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Keep only numbers
        let masked = val;
        // Apply masking on the fly
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

        // Limit max length
        if (val.length > 14) {
            return;
        }

        setCpfCnpj(masked);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('cpf', cpfCnpj);

        try {
            const result = await updateAcademiaProfile(formData);
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="border-sidebar-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-h3">Informações Pessoais</CardTitle>
                    <CardDescription className="text-body text-muted-foreground">
                        Atualize seus dados pessoais. O CPF/CNPJ é necessário para realizar transações financeiras e geração de cobranças via Asaas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {message && (
                        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}
                            className={message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : ''}>
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-label text-muted-foreground">Email (Login)</Label>
                        <Input
                            id="email"
                            value={profile.email || ''}
                            disabled
                            className="bg-muted/50 cursor-not-allowed text-muted-foreground max-w-md h-12"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fullName" className="text-label">Nome Completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Seu nome"
                            required
                            className="max-w-md h-12 bg-background border-border"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cpf" className="text-label">CPF ou CNPJ</Label>
                        <Input
                            id="cpf"
                            value={cpfCnpj}
                            onChange={handleCpfCnpjChange}
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            className="max-w-md h-12 bg-background border-border font-mono"
                        />
                        <p className="text-caption text-muted-foreground">
                            Apenas números. O documento é necessário para registro de clientes no sistema de pagamento Asaas.
                        </p>
                    </div>

                </CardContent>
                <CardFooter className="bg-muted/20 border-t border-sidebar-border px-6 py-4 flex justify-between items-center sm:rounded-b-xl">
                    <p className="text-caption text-muted-foreground hidden sm:block">
                        Seus dados estão seguros conosco.
                    </p>
                    <Button type="submit" disabled={isLoading} pill className="w-full sm:w-auto h-11 px-8">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Alterações'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

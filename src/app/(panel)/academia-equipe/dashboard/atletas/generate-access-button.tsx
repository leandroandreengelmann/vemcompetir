'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyIcon, CircleNotchIcon } from '@phosphor-icons/react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { generateAthleteAccessAction } from './actions';
import { formatPhone, normalizeNumeric } from '@/lib/validation';

interface GenerateAccessButtonProps {
    athleteId: string;
    athleteName: string;
}

export function GenerateAccessButton({ athleteId, athleteName }: GenerateAccessButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneValue, setPhoneValue] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            formData.append('id', athleteId);
            formData.set('phone', normalizeNumeric(phoneValue));

            const result = await generateAthleteAccessAction(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            setOpen(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao gerar o acesso.');
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button pill size="sm" className="h-9 gap-2 w-full justify-center md:w-auto font-medium">
                                <KeyIcon size={16} weight="duotone" />
                                Gerar Acesso
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="font-medium px-4 py-2">
                        <p>Criar acesso (E-mail e Senha) para este atleta entrar no sistema.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerar Acesso</DialogTitle>
                    <DialogDescription>
                        Crie as credenciais de acesso para o atleta <b>{athleteName}</b> ingressar no sistema.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-panel-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            E-mail Real do Atleta
                        </label>
                        <Input variant="lg"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="aluno@exemplo.com"
                            className="bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-panel-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Senha Inicial
                        </label>
                        <Input variant="lg"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-background"
                            required
                            minLength={6}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="phone" className="text-panel-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Telefone/WhatsApp (Opcional)
                        </label>
                        <Input variant="lg"
                            id="phone"
                            name="phone"
                            type="tel"
                            value={phoneValue}
                            onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                            className="bg-background h-12 text-panel-sm rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button pill type="submit" disabled={loading} className="w-full md:w-auto h-11 px-6 font-medium">
                            {loading && <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />}
                            Salvar Acesso
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

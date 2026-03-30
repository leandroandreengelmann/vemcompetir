'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { registerAffiliatedAcademyAction } from './actions';

export function RegisterAcademyButton() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await registerAffiliatedAcademyAction(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setOpen(false);
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
            <DialogTrigger asChild>
                <Button pill size="sm" className="gap-2">
                    <PlusIcon size={16} weight="bold" />
                    Nova Academia Afiliada
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Registrar Academia Afiliada</DialogTitle>
                    <DialogDescription>
                        A academia será criada e vinculada à sua organização.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label htmlFor="full_name" className="text-panel-sm font-semibold text-muted-foreground">
                            Nome da Academia<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Input
                            variant="lg"
                            id="full_name"
                            name="full_name"
                            placeholder="Ex: Academia Exemplo"
                            className="bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="document" className="text-panel-sm font-semibold text-muted-foreground">
                            CPF ou CNPJ
                        </label>
                        <Input
                            variant="lg"
                            id="document"
                            name="document"
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            className="bg-background"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-panel-sm font-semibold text-muted-foreground">
                            E-mail de Acesso<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Input
                            variant="lg"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="email@academia.com"
                            className="bg-background"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-panel-sm font-semibold text-muted-foreground">
                            Senha<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Input
                            variant="lg"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="bg-background"
                            required
                            minLength={6}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button pill type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button pill type="submit" disabled={loading} className="gap-2">
                            {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                            Registrar Academia
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

'use client';

import { useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { registerSuggestedGym } from '../actions';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

interface SuggestionDetail {
    gym_name: string;
    count: number;
}

interface RegisterGymModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestion: SuggestionDetail | null;
}

export function RegisterGymModal({ isOpen, onClose, suggestion }: RegisterGymModalProps) {
    const [isPending, startTransition] = useTransition();

    // Estado local para permitir que o admin edite/corrija o nome sugerido se precisar
    const [overrideName, setOverrideName] = useState(suggestion?.gym_name || '');

    // Reset state on open/close sync
    if (isOpen && suggestion && overrideName === '' && suggestion.gym_name !== '') {
        setOverrideName(suggestion.gym_name);
    }

    if (!suggestion) return null;

    async function handleAction(formData: FormData) {
        formData.append('suggestion_text', suggestion!.gym_name); // O nome que os atletas digitaram
        // gym_name é capturado pelo form direto (pode ser renomeado pelo admin)

        startTransition(async () => {
            try {
                const res = await registerSuggestedGym(formData);
                if (res?.error) {
                    toast.error("Erro no cadastro", {
                        description: res.error,
                    });
                } else if (res?.success) {
                    toast.success("Academia cadastrada!", {
                        description: `A conta foi criada e ${suggestion!.count} atleta(s) foram magicamente vinculados a ela!`,
                    });
                    onClose();
                }
            } catch (error) {
                toast.error("Erro inesperado", {
                    description: "Houve uma falha ao comunicar com o servidor.",
                });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isPending) {
                setOverrideName('');
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cadastrar Academia / Equipe</DialogTitle>
                    <DialogDescription>
                        Esta ação criará acesso para a Academia e atribuirá as {suggestion.count} contas de atletas órfãos a esta nova equipe.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleAction} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="gym_name">Nome da Academia</Label>
                        <Input variant="lg"
                            id="gym_name"
                            name="gym_name"
                            value={overrideName}
                            onChange={(e) => setOverrideName(e.target.value)}
                            placeholder="Nome corrigido ou sugerido..."
                            required
                        />
                        <p className="text-xs text-muted-foreground">O nome original sugerido era "{suggestion.gym_name}".</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail de Acesso</Label>
                        <Input  id="email" name="email" type="email" placeholder="admin@academia.com.br" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Senha da Conta</Label>
                        <Input variant="lg" id="password" name="password" type="password" placeholder="Definitiva ou Provisória" required minLength={6} />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" pill disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar e Vincular Alunos
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

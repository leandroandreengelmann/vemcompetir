'use client';

import { useRef, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { createSuperAdminAction } from './actions';

export function SuperAdminForm() {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    function handleAction(formData: FormData) {
        startTransition(async () => {
            try {
                const res = await createSuperAdminAction(formData);
                if (res?.error) {
                    showToast.error("Erro ao criar super admin", res.error);
                } else if (res?.success) {
                    showToast.success("Super admin criado!", "A conta já tem acesso total ao painel.");
                    formRef.current?.reset();
                }
            } catch {
                showToast.error("Erro inesperado", "Houve uma falha ao comunicar com o servidor.");
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-panel-md font-semibold">Novo Super Admin</CardTitle>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={handleAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sa-name">Nome Completo</Label>
                        <Input id="sa-name" name="full_name" placeholder="Nome do administrador" required variant="lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sa-email">E-mail</Label>
                        <Input id="sa-email" name="email" type="email" placeholder="email@exemplo.com" required variant="lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sa-pass">Senha</Label>
                        <Input id="sa-pass" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} variant="lg" />
                    </div>
                    <Button type="submit" pill className="w-full" disabled={isPending}>
                        {isPending && <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />}
                        Criar Super Admin
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

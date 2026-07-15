'use client';

import { useState, useTransition } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/toast";
import {
    DotsThreeVerticalIcon,
    PencilSimpleIcon,
    KeyIcon,
    ShieldSlashIcon,
    TrashIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import {
    updateSuperAdminNameAction,
    resetSuperAdminPasswordAction,
    revokeSuperAdminAction,
    deleteSuperAdminAction,
} from './actions';

interface SuperAdminActionsProps {
    admin: {
        id: string;
        full_name: string | null;
        email: string;
        isCurrent: boolean;
    };
    canRevoke: boolean;
}

type OpenDialog = 'name' | 'password' | 'revoke' | 'delete' | null;

export function SuperAdminActions({ admin, canRevoke }: SuperAdminActionsProps) {
    const [dialog, setDialog] = useState<OpenDialog>(null);
    const [name, setName] = useState(admin.full_name || '');
    const [password, setPassword] = useState('');
    const [isPending, startTransition] = useTransition();

    function close() {
        if (isPending) return;
        setDialog(null);
        setName(admin.full_name || '');
        setPassword('');
    }

    function run(fn: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
        startTransition(async () => {
            try {
                const res = await fn();
                if (res?.error) {
                    showToast.error("Erro", res.error);
                } else if (res?.success) {
                    showToast.success(successMsg);
                    setDialog(null);
                    setPassword('');
                }
            } catch {
                showToast.error("Erro inesperado", "Falha ao comunicar com o servidor.");
            }
        });
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DotsThreeVerticalIcon size={20} weight="bold" />
                        <span className="sr-only">Ações</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog('name')}>
                        <PencilSimpleIcon size={16} weight="bold" className="mr-2" />
                        Editar nome
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog('password')}>
                        <KeyIcon size={16} weight="bold" className="mr-2" />
                        Redefinir senha
                    </DropdownMenuItem>
                    {!admin.isCurrent && canRevoke && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDialog('revoke')}
                            >
                                <ShieldSlashIcon size={16} weight="bold" className="mr-2" />
                                Revogar acesso
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDialog('delete')}
                            >
                                <TrashIcon size={16} weight="bold" className="mr-2" />
                                Excluir conta
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Editar nome */}
            <Dialog open={dialog === 'name'} onOpenChange={(o) => !o && close()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar nome</DialogTitle>
                        <DialogDescription>Atualize o nome deste super admin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor={`name-${admin.id}`}>Nome completo</Label>
                        <Input
                            id={`name-${admin.id}`}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            variant="lg"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={close} disabled={isPending}>Cancelar</Button>
                        <Button
                            pill
                            disabled={isPending}
                            onClick={() => run(() => updateSuperAdminNameAction(admin.id, name), "Nome atualizado!")}
                        >
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Redefinir senha */}
            <Dialog open={dialog === 'password'} onOpenChange={(o) => !o && close()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Redefinir senha</DialogTitle>
                        <DialogDescription>
                            Defina uma nova senha para {admin.full_name || admin.email}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor={`pass-${admin.id}`}>Nova senha</Label>
                        <Input
                            id={`pass-${admin.id}`}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                            variant="lg"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={close} disabled={isPending}>Cancelar</Button>
                        <Button
                            pill
                            disabled={isPending}
                            onClick={() => run(() => resetSuperAdminPasswordAction(admin.id, password), "Senha redefinida!")}
                        >
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Redefinir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revogar acesso */}
            <Dialog open={dialog === 'revoke'} onOpenChange={(o) => !o && close()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Revogar acesso</DialogTitle>
                        <DialogDescription>
                            {admin.full_name || admin.email} deixará de ser super admin e voltará a ser um
                            usuário comum (atleta). A conta e o histórico são mantidos. Deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={close} disabled={isPending}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            pill
                            disabled={isPending}
                            onClick={() => run(() => revokeSuperAdminAction(admin.id), "Acesso revogado.")}
                        >
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Revogar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Excluir conta */}
            <Dialog open={dialog === 'delete'} onOpenChange={(o) => !o && close()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Excluir conta</DialogTitle>
                        <DialogDescription>
                            A conta de {admin.full_name || admin.email} será <strong>excluída definitivamente</strong>.
                            Esta ação não pode ser desfeita. Deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={close} disabled={isPending}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            pill
                            disabled={isPending}
                            onClick={() => run(() => deleteSuperAdminAction(admin.id), "Conta excluída.")}
                        >
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Excluir definitivamente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

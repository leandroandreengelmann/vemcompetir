'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { removeRegistrationAction } from '../registrations-actions';
import { toast } from 'sonner';

interface Registration {
    id: string;
    status: string;
    created_at: string;
    registered_by: string;
    athlete: {
        id: string;
        full_name: string;
        belt_color: string;
        sexo: string;
        weight: number | null;
        birth_date: string;
    };
    category: {
        id: string;
        divisao_idade: string;
        categoria_peso: string;
        sexo: string;
        faixa: string;
    };
    registered_by_profile: {
        full_name: string;
    } | null;
}

interface Event {
    id: string;
    title: string;
    tenant_id: string;
}

interface RegistrationListProps {
    event: Event;
    registrations: Registration[];
    athletes: any[]; // List of my athletes is not needed anymore for this component specifically, but kept for compatibility if needed or removed
    currentUserId: string;
    currentUserTenantId: string;
}

export function RegistrationList({ event, registrations, athletes, currentUserId, currentUserTenantId }: RegistrationListProps) {
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleRemove = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta inscrição?')) return;

        setRemovingId(id);
        try {
            const result = await removeRegistrationAction(id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Inscrição removida.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao remover inscrição.');
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button asChild pill>
                    <Link href={`/academia-equipe/dashboard/eventos/${event.id}/inscrever`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Inscrição
                    </Link>
                </Button>
            </div>

            <Card className="border-none shadow-premium rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Inscrições Realizadas ({registrations.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6">Atleta</TableHead>
                                    <TableHead className="hidden sm:table-cell">Faixa</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="hidden md:table-cell">Inscrito Por</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                    <TableHead className="w-[80px] text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!registrations || registrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            Nenhuma inscrição encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    registrations.map((reg) => (
                                        <TableRow key={reg.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-foreground text-ui">{reg.athlete?.full_name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium sm:hidden">
                                                        {reg.athlete?.belt_color}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground font-medium">
                                                {reg.athlete?.belt_color}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-caption font-bold text-foreground">{reg.category?.divisao_idade}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{reg.category?.categoria_peso}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-caption font-medium hidden md:table-cell">
                                                {reg.registered_by_profile?.full_name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-muted-foreground/30 text-muted-foreground">
                                                    {reg.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                {(reg.registered_by === currentUserId || event.tenant_id === currentUserTenantId) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                                                        onClick={() => handleRemove(reg.id)}
                                                        disabled={removingId === reg.id}
                                                        pill
                                                    >
                                                        {removingId === reg.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}

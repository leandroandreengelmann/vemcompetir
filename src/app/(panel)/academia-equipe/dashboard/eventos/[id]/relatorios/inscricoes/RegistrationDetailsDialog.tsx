'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RegistrationDetailsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    registration: any;
}

export function RegistrationDetailsDialog({
    isOpen,
    onOpenChange,
    registration,
}: RegistrationDetailsDialogProps) {
    if (!registration) return null;

    const athlete = registration.athlete || {};
    const category = registration.category?.categoria_completa || 'Sem categoria';

    const formatCPF = (cpf?: string) => {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11) return cpf;
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const renderBeltBadge = (belt: string) => {
        if (!belt) return null;

        const lowerBelt = belt.toLowerCase();
        let bgClass = "bg-muted text-muted-foreground border-border";

        if (lowerBelt.includes('branca')) bgClass = "bg-white text-slate-800 border-slate-200 shadow-sm";
        else if (lowerBelt.includes('azul')) bgClass = "bg-blue-500 text-white border-blue-600 shadow-sm";
        else if (lowerBelt.includes('roxa')) bgClass = "bg-purple-500 text-white border-purple-600 shadow-sm";
        else if (lowerBelt.includes('marrom')) bgClass = "bg-amber-800 text-white border-amber-900 shadow-sm";
        else if (lowerBelt.includes('preta')) bgClass = "bg-slate-900 text-white border-slate-950 shadow-sm dark:bg-black dark:border-slate-800";
        else if (lowerBelt.includes('colorida')) bgClass = "bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none shadow-sm";
        else if (lowerBelt.includes('cinza')) bgClass = "bg-gray-400 text-white border-gray-500 shadow-sm";
        else if (lowerBelt.includes('amarela')) bgClass = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm";
        else if (lowerBelt.includes('laranja')) bgClass = "bg-orange-500 text-white border-orange-600 shadow-sm";
        else if (lowerBelt.includes('verde')) bgClass = "bg-green-600 text-white border-green-700 shadow-sm";

        return (
            <Badge variant="outline" className={cn("text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5 mt-1", bgClass)}>
                {belt}
            </Badge>
        );
    };

    const renderStatusBadge = (reg: any) => {
        const tipo = reg.tipo;
        const payerType = reg.payer_type;

        if (tipo === 'cortesia') {
            return (
                <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-pink-500/10 text-pink-700 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30">
                    CORTESIA
                </Badge>
            );
        }
        if (tipo === 'pacote') {
            return (
                <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                    PACOTE DE INSCRIÇÕES
                </Badge>
            );
        }
        if (tipo === 'evento_proprio') {
            return (
                <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                    EVENTO PRÓPRIO
                </Badge>
            );
        }
        if (tipo === 'agendado') {
            return (
                <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                    AGENDADO
                </Badge>
            );
        }
        if (tipo === 'pago') {
            return (
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        PAGO
                    </Badge>
                    {payerType && (
                        <span className="text-xs text-muted-foreground">
                            {payerType === 'ACADEMY' ? 'pela academia' : 'pelo atleta'}
                        </span>
                    )}
                </div>
            );
        }
        if (tipo === 'pendente') {
            return (
                <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    PENDENTE
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-sm px-3 py-1 font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                NA CESTA DE COMPRAS
            </Badge>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        Detalhes da Inscrição
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Visualize as informações completas referentes a este registro no evento.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-8 pb-4">
                    {/* Atleta Section */}
                    <div>
                        <h4 className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Dados do Atleta
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">NOME COMPLETO</span>
                                <p className="text-base font-semibold text-foreground tracking-tight">{athlete.full_name || 'Desconhecido'}</p>
                            </div>
                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">CPF</span>
                                <p className="text-base font-semibold text-foreground tracking-tight">{formatCPF(athlete.cpf) || 'Não informado'}</p>
                            </div>
                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">EQUIPE / ACADEMIA</span>
                                <p className="text-base font-semibold text-foreground tracking-tight">{athlete.gym_name || 'Sem Equipe (Independente)'}</p>
                            </div>
                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">FAIXA</span>
                                <div>
                                    {renderBeltBadge(athlete.belt_color)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    {/* Inscrição Section */}
                    <div>
                        <h4 className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Dados da Inscrição
                        </h4>

                        <div className="space-y-6">
                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">CATEGORIA</span>
                                <p className="text-base font-semibold text-foreground tracking-tight leading-relaxed">{category}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-4">
                                <div>
                                    <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">VALOR</span>
                                    <p className="text-xl font-bold text-foreground tracking-tight">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(registration.price || 0))}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">STATUS</span>
                                    <div className="flex flex-col items-start gap-1">
                                        {renderStatusBadge(registration)}
                                        {registration.promo_type_applied && (
                                            <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30">
                                                2ª CATEGORIA GRÁTIS
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">DATA DO REGISTRO</span>
                                <p className="text-sm font-semibold text-foreground tracking-tight">
                                    {registration.created_at ? format(new Date(registration.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

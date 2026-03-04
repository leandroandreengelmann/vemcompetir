'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface AthleteDetailsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    athlete: any;
}

export function AthleteDetailsDialog({
    isOpen,
    onOpenChange,
    athlete,
}: AthleteDetailsDialogProps) {
    if (!athlete) return null;

    const formatCPF = (cpf?: string) => {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11) return cpf;
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const getBeltBadgeStyle = (beltName: string) => {
        const bdg = beltName?.toLowerCase() || '';
        if (bdg.includes('branca')) return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600';
        if (bdg.includes('azul')) return 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-500';
        if (bdg.includes('roxa')) return 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700 dark:border-purple-600';
        if (bdg.includes('marrom')) return 'bg-amber-800 text-white border-amber-900 dark:bg-amber-900 dark:border-amber-800';
        if (bdg.includes('preta')) return 'bg-black text-white border-zinc-800 dark:bg-zinc-950 dark:border-zinc-800';
        if (bdg.includes('coral')) return 'bg-gradient-to-r from-red-600 to-black text-white border-red-900';
        if (bdg.includes('vermelha')) return 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-600';
        if (bdg.includes('cinza')) return 'bg-zinc-400 text-zinc-950 border-zinc-500 dark:bg-zinc-500 dark:text-zinc-50 dark:border-zinc-400';
        if (bdg.includes('amarela')) return 'bg-yellow-400 text-yellow-950 border-yellow-500 dark:bg-yellow-500 dark:text-yellow-50 dark:border-yellow-400';
        if (bdg.includes('laranja')) return 'bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:border-orange-500';
        if (bdg.includes('verde')) return 'bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-600';
        return 'bg-accent/5 text-muted-foreground';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        Resumo do Atleta
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Informações e categorias inscritas neste evento.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-8 pb-4">
                    <div>
                        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Identificação
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">NOME COMPLETO</span>
                                <p className="text-base font-semibold text-foreground tracking-tight">{athlete.full_name || 'Desconhecido'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">CPF</span>
                                <p className="text-base font-semibold text-foreground tracking-tight">{formatCPF(athlete.cpf) || 'Não informado'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">FAIXA</span>
                                <div>
                                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mt-1 border rounded-md shadow-sm ${getBeltBadgeStyle(athlete.belt_color)}`}>
                                        {athlete.belt_color || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    <div>
                        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Categorias Registradas ({athlete.categories?.length || 0})
                        </h4>

                        <div className="space-y-4">
                            {athlete.categories && athlete.categories.length > 0 ? (
                                <ul className="space-y-3">
                                    {athlete.categories.map((cat: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-muted-foreground/50 font-bold mt-0.5">•</span>
                                            <span className="text-sm font-semibold text-foreground tracking-tight leading-relaxed">{cat}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm font-medium text-muted-foreground">Nenhuma categoria registrada.</p>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

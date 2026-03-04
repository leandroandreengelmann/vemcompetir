import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CalendarDays, DollarSign, ArrowUpRight, AlertCircle } from "lucide-react";

interface AdminKPICardsProps {
    data: {
        totalAtletas: number;
        totalEntidades: number;
        totalEventos: number;
        eventosPendentes: number;
        receitaTotalBruta: number;
    }
}

export function AdminKPICards({ data }: AdminKPICardsProps) {
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-label font-medium">Faturamento Bruto</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-h1">{formatter.format(data.receitaTotalBruta)}</div>
                    <p className="text-caption text-muted-foreground mt-1 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        Geral acumulado
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-label font-medium">Atletas</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-h1">{data.totalAtletas}</div>
                    <p className="text-caption text-muted-foreground mt-1">
                        Cadastros ativos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-label font-medium">Equipes / Academias</CardTitle>
                    <Building2 className="h-4 w-4 text-teal-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-h1">{data.totalEntidades}</div>
                    <p className="text-caption text-muted-foreground mt-1">
                        Organizações cadastradas
                    </p>
                </CardContent>
            </Card>

            <Card className={data.eventosPendentes > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-label font-medium">Eventos</CardTitle>
                    {data.eventosPendentes > 0 ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-h1">{data.totalEventos}</div>
                    <p className="text-caption flex items-center gap-1 mt-1">
                        {data.eventosPendentes > 0 ? (
                            <span className="text-amber-600 font-medium">
                                {data.eventosPendentes} aguardando aprovação
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Tudo aprovado!</span>
                        )}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

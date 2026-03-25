import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    UsersIcon,
    BuildingsIcon,
    CalendarIcon,
    MoneyIcon,
    ArrowUpRightIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

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
                    <CardTitle className="text-panel-sm font-medium">Faturamento Bruto</CardTitle>
                    <MoneyIcon size={20} weight="duotone" className="text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-panel-lg font-black">{formatter.format(data.receitaTotalBruta)}</div>
                    <p className="text-panel-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <ArrowUpRightIcon size={20} weight="bold" className="text-emerald-500" />
                        Geral acumulado
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-panel-sm font-medium">Atletas</CardTitle>
                    <UsersIcon size={20} weight="duotone" className="text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-panel-lg font-black">{data.totalAtletas}</div>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Cadastros ativos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-panel-sm font-medium">Equipes / Academias</CardTitle>
                    <BuildingsIcon size={20} weight="duotone" className="text-teal-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-panel-lg font-black">{data.totalEntidades}</div>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Organizações cadastradas
                    </p>
                </CardContent>
            </Card>

            <Card className={data.eventosPendentes > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-panel-sm font-medium">Eventos</CardTitle>
                    {data.eventosPendentes > 0 ? (
                        <WarningCircleIcon size={20} weight="duotone" className="text-amber-500" />
                    ) : (
                        <CalendarIcon size={20} weight="duotone" className="text-muted-foreground" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-panel-lg font-black">{data.totalEventos}</div>
                    <p className="text-panel-sm flex items-center gap-1 mt-1">
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

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardData } from "./actions";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CoinsIcon,
    ArrowDownIcon,
    WarningIcon,
    XCircleIcon,
    CalendarDotsIcon,
    UsersIcon,
    GearIcon,
    PlugsConnectedIcon,
    TicketIcon,
} from "@phosphor-icons/react/dist/ssr";

function fmt(n: number): string {
    return n.toLocaleString("pt-BR");
}

export default async function AdminDashboard() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin_geral") redirect("/login");

    const data = await getDashboardData();

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Painel Administrativo"
                description="Visão operacional da plataforma"
            />

            {/* ── Bloco 1: Tokens ─────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Tokens — este mês
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tokens vendidos</CardTitle>
                            <CoinsIcon className="h-6 w-6 text-muted-foreground" weight="duotone" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{fmt(data.tokens.grantedThisMonth)}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tokens consumidos</CardTitle>
                            <ArrowDownIcon className="h-6 w-6 text-muted-foreground" weight="duotone" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{fmt(data.tokens.consumedThisMonth)}</p>
                        </CardContent>
                    </Card>

                    <Card className={data.tokens.academiesLowBalance > 0 ? "border-yellow-400" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saldo baixo</CardTitle>
                            <WarningIcon
                                className={`h-6 w-6 ${data.tokens.academiesLowBalance > 0 ? "text-yellow-500" : "text-muted-foreground"}`}
                                weight="duotone"
                            />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{fmt(data.tokens.academiesLowBalance)}</p>
                            <p className="text-xs text-muted-foreground">academias com saldo ≤ 20</p>
                        </CardContent>
                    </Card>

                    <Card className={data.tokens.academiesNegative > 0 ? "border-red-500" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saldo negativo</CardTitle>
                            <XCircleIcon
                                className={`h-6 w-6 ${data.tokens.academiesNegative > 0 ? "text-red-500" : "text-muted-foreground"}`}
                                weight="duotone"
                            />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{fmt(data.tokens.academiesNegative)}</p>
                            <p className="text-xs text-muted-foreground">academias com saldo &lt; 0</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* ── Bloco 2: Falhas de pagamento ────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Falhas de Pagamento — últimas 24h
                </h2>
                {/* Legenda dos tipos de erro */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                    <div className="rounded-md border px-3 py-2 space-y-0.5">
                        <p className="font-semibold text-foreground">Cliente Asaas</p>
                        <p>Falhou ao criar ou encontrar o cliente no Asaas. Causas comuns: chave de API inválida ou CPF ausente no perfil do atleta.</p>
                    </div>
                    <div className="rounded-md border px-3 py-2 space-y-0.5">
                        <p className="font-semibold text-foreground">Cobrança Asaas</p>
                        <p>O Asaas recusou a criação da cobrança. Causas comuns: cliente de outra conta (ID inválido), subconta do organizador inativa ou valor incorreto.</p>
                    </div>
                </div>

                <Card className={data.paymentFailures.last24h > 0 ? "border-red-500" : "border-blue-400"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${data.paymentFailures.last24h > 0 ? "text-red-600" : "text-blue-600"}`}>
                            {data.paymentFailures.last24h === 0
                                ? "Nenhuma falha registrada"
                                : `${data.paymentFailures.last24h} falha${data.paymentFailures.last24h !== 1 ? "s" : ""} registrada${data.paymentFailures.last24h !== 1 ? "s" : ""}`}
                        </CardTitle>
                        <XCircleIcon
                            className={`h-6 w-6 ${data.paymentFailures.last24h > 0 ? "text-red-500" : "text-blue-500"}`}
                            weight="fill"
                        />
                    </CardHeader>
                    {data.paymentFailures.last24h > 0 && (
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Horário</TableHead>
                                        <TableHead>Atleta</TableHead>
                                        <TableHead>Evento</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Detalhe do erro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.paymentFailures.items.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(f.created_at).toLocaleString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">{f.athlete_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{f.event_title}</TableCell>
                                            <TableCell className="text-xs text-right font-mono whitespace-nowrap">
                                                {f.total_inscricoes_snapshot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 text-xs whitespace-nowrap">
                                                    {f.error_type === 'customer_creation' ? 'Cliente Asaas' : f.error_type === 'payment_creation' ? 'Cobrança Asaas' : f.error_type ?? 'Desconhecido'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                                {f.error_details?.errors?.[0]?.description ?? f.error_details?.message ?? JSON.stringify(f.error_details)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    )}
                </Card>
            </section>

            {/* ── Bloco 4: Consumo por academia ───────────────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Consumo por Academia — este mês
                    </h2>
                    <Link
                        href="/admin/dashboard/pacotes-tokens"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <TicketIcon className="h-6 w-6" weight="duotone" />
                        Gerenciar Tokens
                    </Link>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Academia</TableHead>
                                    <TableHead className="text-right">Saldo atual</TableHead>
                                    <TableHead className="text-right">Consumido</TableHead>
                                    <TableHead className="text-right">Comprado</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.academyRanking.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="text-center text-muted-foreground py-8"
                                        >
                                            Nenhuma academia com gestão de tokens ativa.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.academyRanking.map(academy => (
                                        <TableRow key={academy.id}>
                                            <TableCell className="font-medium">{academy.name}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {fmt(academy.currentBalance)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {fmt(academy.consumedThisMonth)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {fmt(academy.grantedThisMonth)}
                                            </TableCell>
                                            <TableCell>
                                                {academy.status === "ok" && (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                        OK
                                                    </Badge>
                                                )}
                                                {academy.status === "low" && (
                                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                        Baixo
                                                    </Badge>
                                                )}
                                                {academy.status === "negative" && (
                                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                                                        Negativo
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>

            {/* ── Bloco 5: Atalhos + Alertas ──────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Atalhos Rápidos
                </h2>

                {/* Alertas operacionais */}
                {(data.operational.pendingEvents > 0 || data.operational.pendingSuggestions > 0) && (
                    <div className="flex flex-wrap gap-3 mb-2">
                        {data.operational.pendingEvents > 0 && (
                            <Link
                                href="/admin/dashboard/eventos"
                                className="flex items-center gap-2 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100 transition-colors dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-600"
                            >
                                <WarningIcon className="h-6 w-6" weight="fill" />
                                {data.operational.pendingEvents} evento{data.operational.pendingEvents !== 1 ? "s" : ""} pendente{data.operational.pendingEvents !== 1 ? "s" : ""}
                            </Link>
                        )}
                        {data.operational.pendingSuggestions > 0 && (
                            <Link
                                href="/admin/dashboard/comunidade"
                                className="flex items-center gap-2 rounded-lg border border-blue-400 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600"
                            >
                                <UsersIcon className="h-6 w-6" weight="fill" />
                                {data.operational.pendingSuggestions} sugestão{data.operational.pendingSuggestions !== 1 ? "ões" : ""} de academia na fila
                            </Link>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                        {
                            label: "Central de Atletas",
                            href: "/admin/dashboard/atletas",
                            icon: UsersIcon,
                            description: "Atletas cadastrados",
                        },
                        {
                            label: "Gestão de Tokens",
                            href: "/admin/dashboard/pacotes-tokens",
                            icon: TicketIcon,
                            description: "Pacotes e saldos",
                        },
                        {
                            label: "Eventos",
                            href: "/admin/dashboard/eventos",
                            icon: CalendarDotsIcon,
                            description: "Aprovar e gerenciar",
                        },
                        {
                            label: "Equipes & Academias",
                            href: "/admin/dashboard/equipes-academias",
                            icon: UsersIcon,
                            description: "Tenants cadastrados",
                        },
                        {
                            label: "Configurações",
                            href: "/admin/dashboard/configuracoes",
                            icon: GearIcon,
                            description: "Plataforma",
                        },
                        {
                            label: "Integrações",
                            href: "/admin/dashboard/integracoes/asaas",
                            icon: PlugsConnectedIcon,
                            description: "Asaas e APIs",
                        },
                    ].map(item => (
                        <Link key={item.href} href={item.href}>
                            <Card className="cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors h-full">
                                <CardContent className="flex flex-col gap-1.5 p-4">
                                    <item.icon className="h-6 w-6 text-primary" weight="duotone" />
                                    <p className="text-sm font-semibold leading-tight">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

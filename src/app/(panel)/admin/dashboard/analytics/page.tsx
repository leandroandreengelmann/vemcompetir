import { Suspense } from "react";
import {
    getAccessKPIs,
    getAccessTrend,
    getTopEvents,
    getRecentActivityFeed,
    getRegionalBreakdown,
} from "./actions";
import { AccessKPICards } from "./components/AccessKPICards";
import { AccessTrendChart } from "./components/AccessTrendChart";
import { TopEventsTable } from "./components/TopEventsTable";
import { ActivityFeed } from "./components/ActivityFeed";
import { RegionalChart } from "./components/RegionalChart";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
    title: "Monitoramento de Acessos | Admin COMPETIR",
    description: "Painel de analytics de tráfego da plataforma COMPETIR.",
};

// Reválida a cada 60s para dados frescos sem bloquear o render
export const revalidate = 60;

async function AnalyticsPageContent() {
    const [kpis, trend, topEvents, feed, regional] = await Promise.all([
        getAccessKPIs(),
        getAccessTrend(30),
        getTopEvents(10),
        getRecentActivityFeed(50),
        getRegionalBreakdown(),
    ]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4">
            {/* Header */}
            <AccessKPICards
                hoje={kpis.hoje}
                semana={kpis.semana}
                mes={kpis.mes}
                variacaoMes={kpis.variacaoMes}
            />

            {/* Gráfico + Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AccessTrendChart data={trend} />
                <TopEventsTable data={topEvents} />
            </div>

            {/* Feed + Regional */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeed data={feed} />
                <RegionalChart data={regional} />
            </div>
        </div>
    );
}

function AnalyticsPageSkeleton() {
    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4">
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<AnalyticsPageSkeleton />}>
            <AnalyticsPageContent />
        </Suspense>
    );
}

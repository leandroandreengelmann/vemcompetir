'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTheme } from "next-themes";

interface ChartData {
    month: string;
    faturamento: number;
    inscricoes: number;
}

interface RevenueOverTimeChartProps {
    data: ChartData[];
}

export function RevenueOverTimeChart({ data }: RevenueOverTimeChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
                    <p className="font-medium text-panel-sm mb-1">{label}</p>
                    <p className="text-emerald-500 text-sm font-bold">
                        {formatter.format(payload[0].value)}
                    </p>
                    <p className="text-muted-foreground text-panel-sm mt-1">
                        {payload[1].value} Inscrições
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-panel-md font-semibold">Faturamento Bruto</CardTitle>
                <CardDescription>Evolução mensal de receitas arrecadadas pelas inscrições.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    {data.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p>Sem dados financeiros no momento.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e5e7eb'} />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis 
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 12 }}
                                    tickFormatter={(value) => `R$${value}`}
                                    dx={-10}
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    hide 
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="faturamento" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="inscricoes" 
                                    stroke="transparent" // Invisible line just for tooltip access
                                    dot={false}
                                    activeDot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

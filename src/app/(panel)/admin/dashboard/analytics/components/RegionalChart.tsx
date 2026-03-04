'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useTheme } from "next-themes";

interface RegionalChartProps {
    data: { region: string; count: number }[];
}

const COLORS = [
    '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

export function RegionalChart({ data }: RegionalChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
                    <p className="font-medium text-ui">{label}</p>
                    <p className="text-sky-500 font-bold text-sm mt-1">
                        {payload[0].value.toLocaleString('pt-BR')} acessos
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-h3">Acessos por Região</CardTitle>
                <CardDescription>De onde vêm os visitantes da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[280px] w-full mt-2">
                    {data.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-ui">
                            Sem dados regionais ainda.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#333' : '#e5e7eb'} />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 11 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="region"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 11 }}
                                    width={80}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#ffffff08' : '#00000005' }} />
                                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                    {data.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

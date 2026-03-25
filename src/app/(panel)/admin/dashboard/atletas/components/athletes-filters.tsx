'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FunnelIcon } from '@phosphor-icons/react';

interface AthletesFiltersProps {
    currentDe?: string;
    currentAte?: string;
}

export function AthletesFilters({ currentDe, currentAte }: AthletesFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [de, setDe] = useState(currentDe ?? '');
    const [ate, setAte] = useState(currentAte ?? '');

    const now = new Date();
    const todayStr = format(startOfDay(now), 'yyyy-MM-dd');
    const weekStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStr = format(startOfMonth(now), 'yyyy-MM-dd');
    const todayEndStr = format(endOfDay(now), 'yyyy-MM-dd');

    const isActive = (start: string) =>
        currentDe === start && currentAte === todayEndStr;

    const applyFilter = (startDate: Date, endDate: Date) => {
        const params = new URLSearchParams();
        params.set('de', format(startDate, 'yyyy-MM-dd'));
        params.set('ate', format(endDate, 'yyyy-MM-dd'));
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleCustom = () => {
        if (!de || !ate) return;
        const params = new URLSearchParams();
        params.set('de', de);
        params.set('ate', ate);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <Card>
            <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex items-center gap-2">
                        <FunnelIcon size={16} weight="duotone" className="text-muted-foreground" />
                        <span className="text-panel-sm font-medium text-muted-foreground">Período:</span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant={isActive(todayStr) ? 'default' : 'outline'}
                            size="sm"
                            pill
                            onClick={() => applyFilter(startOfDay(now), endOfDay(now))}
                        >
                            Hoje
                        </Button>
                        <Button
                            variant={isActive(weekStr) ? 'default' : 'outline'}
                            size="sm"
                            pill
                            onClick={() => applyFilter(startOfWeek(now, { weekStartsOn: 1 }), endOfDay(now))}
                        >
                            Esta Semana
                        </Button>
                        <Button
                            variant={isActive(monthStr) ? 'default' : 'outline'}
                            size="sm"
                            pill
                            onClick={() => applyFilter(startOfMonth(now), endOfDay(now))}
                        >
                            Este Mês
                        </Button>
                    </div>

                    <div className="flex items-end gap-2 ml-auto">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-medium">De</span>
                            <Input
                                type="date"
                                value={de}
                                onChange={(e) => setDe(e.target.value)}
                                className="h-9 w-36 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground font-medium">Até</span>
                            <Input
                                type="date"
                                value={ate}
                                onChange={(e) => setAte(e.target.value)}
                                className="h-9 w-36 text-sm"
                            />
                        </div>
                        <Button size="sm" pill onClick={handleCustom} disabled={!de || !ate}>
                            Filtrar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

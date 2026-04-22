'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';

interface CollapsibleTableSectionProps {
    totalCount: number;
    previewRows?: number;
    forceOpen?: boolean;
    children: ReactNode;
}

const ROW_SELECTOR = 'tbody > tr';

export function CollapsibleTableSection({
    totalCount,
    previewRows = 3,
    forceOpen = false,
    children,
}: CollapsibleTableSectionProps) {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);

    const effectiveOpen = open || forceOpen;
    const needsCollapse = totalCount > previewRows;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!needsCollapse || !wrapperRef.current) return;
        const rows = wrapperRef.current.querySelectorAll<HTMLElement>(ROW_SELECTOR);
        if (rows.length === 0) return;

        const tableEl = wrapperRef.current.querySelector('table');
        const headerEl = tableEl?.querySelector('thead');
        const headerHeight = headerEl?.getBoundingClientRect().height ?? 0;

        let sum = headerHeight;
        const visible = Math.min(previewRows, rows.length);
        for (let i = 0; i < visible; i++) {
            sum += rows[i].getBoundingClientRect().height;
        }
        if (rows.length > visible) {
            sum += rows[visible].getBoundingClientRect().height * 0.75;
        }
        setCollapsedHeight(Math.round(sum));
    }, [needsCollapse, previewRows, totalCount, mounted]);

    const isCollapsed = mounted && !effectiveOpen && needsCollapse && collapsedHeight !== null;
    const wrapperStyle = isCollapsed ? { maxHeight: `${collapsedHeight}px` } : undefined;

    return (
        <div>
            <div
                ref={wrapperRef}
                className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
                style={wrapperStyle}
            >
                {children}
                {isCollapsed && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/90 to-transparent"
                    />
                )}
            </div>
            {needsCollapse && !forceOpen && (
                <div className="flex justify-center border-t border-border/40 p-4">
                    <Button
                        pill
                        variant="ghost"
                        size="lg"
                        onClick={() => setOpen((v) => !v)}
                        className="gap-2 px-6 h-11 text-panel-sm font-semibold text-muted-foreground hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
                    >
                        {open ? (
                            <>
                                <CaretUpIcon size={28} weight="bold" />
                                Ver menos
                            </>
                        ) : (
                            <>
                                <CaretDownIcon size={28} weight="bold" />
                                Ver todos os {totalCount}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

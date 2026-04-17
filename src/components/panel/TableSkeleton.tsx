import { cn } from '@/lib/utils';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function TableSkeleton({ rows = 6, columns = 4, className }: TableSkeletonProps) {
    return (
        <div className={cn('rounded-xl border overflow-hidden', className)}>
            <div className="border-b bg-muted/40 px-4 py-3 flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`h-${i}`}
                        className="h-3 rounded-md bg-muted-foreground/20 animate-pulse"
                        style={{ width: i === 0 ? '22%' : `${Math.max(12, 78 / (columns - 1))}%` }}
                    />
                ))}
            </div>
            <div className="divide-y">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={`r-${r}`} className="px-4 py-4 flex gap-4 items-center">
                        {Array.from({ length: columns }).map((_, c) => (
                            <div
                                key={`c-${r}-${c}`}
                                className="h-3.5 rounded-md bg-muted animate-pulse"
                                style={{ width: c === 0 ? '22%' : `${Math.max(12, 78 / (columns - 1))}%` }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

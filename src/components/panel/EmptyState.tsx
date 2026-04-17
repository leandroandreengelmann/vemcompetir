import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 gap-3',
                className,
            )}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="text-panel-base font-semibold">{title}</p>
                {description && (
                    <p className="text-panel-sm text-muted-foreground max-w-md">{description}</p>
                )}
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    );
}

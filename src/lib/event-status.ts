/**
 * Centralized event status badge classes.
 * Use these in any component that displays event status badges
 * to ensure visual consistency across the panel.
 */

export type EventStatus = 'pendente' | 'aprovado' | 'publicado' | string;

export function getEventStatusClasses(status: EventStatus): string {
    switch (status) {
        case 'pendente':
            return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
        case 'aprovado':
            return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
        case 'publicado':
            return 'bg-blue-600 text-white border-none shadow-md hover:bg-blue-700';
        default:
            return 'bg-muted/50 text-muted-foreground border-border';
    }
}

export function getEventStatusVariant(status: EventStatus): 'default' | 'outline' {
    return status === 'publicado' ? 'default' : 'outline';
}

export const EVENT_STATUS_BASE_CLASSES =
    'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm';

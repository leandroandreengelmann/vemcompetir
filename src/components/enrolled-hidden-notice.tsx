import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils';

/** Aviso exibido no lugar da lista de inscritos quando o organizador oculta essa informação. */
export function EnrolledHiddenNotice({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground',
                className,
            )}
        >
            <EyeSlashIcon size={20} weight="duotone" className="shrink-0" />
            <span className="text-panel-sm font-medium">
                O organizador optou por não exibir os inscritos desta categoria.
            </span>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LinkBreakIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { unclaimAthleteAction } from './actions';

interface UnclaimAthleteButtonProps {
    athleteId: string;
    athleteName: string;
}

export function UnclaimAthleteButton({ athleteId, athleteName }: UnclaimAthleteButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        const result = await unclaimAthleteAction(athleteId);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }
        setOpen(false);
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
            <DialogTrigger asChild>
                <Button
                    pill
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title={`Desvincular ${athleteName}`}
                >
                    <LinkBreakIcon size={24} weight="duotone" />
                    <span className="sr-only">Desvincular</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Desvincular atleta</DialogTitle>
                    <DialogDescription>
                        <b>{athleteName}</b> será removido da sua academia. O atleta mantém a conta própria e pode se vincular a outra academia.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button pill variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button pill variant="destructive" onClick={handleConfirm} disabled={loading} className="gap-2">
                        {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                        Desvincular
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

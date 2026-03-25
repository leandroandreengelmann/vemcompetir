'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { deleteAthleteAction } from '../actions';
import { DeleteConfirmationDialog } from '@/components/panel/DeleteConfirmationDialog';

interface DeleteAthleteButtonProps {
    athleteId: string;
    athleteName: string;
    academyId: string;
}

export default function DeleteAthleteButton({ athleteId, athleteName, academyId }: DeleteAthleteButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteAthleteAction(athleteId, academyId);

        if (result.error) {
            alert(result.error);
            setLoading(false);
        } else {
            router.refresh();
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                disabled={loading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                pill
            >
                {loading
                    ? <SpinnerGapIcon size={20} weight="bold" className="animate-spin" />
                    : <TrashIcon size={20} weight="duotone" />
                }
                <span className="sr-only">Excluir Atleta</span>
            </Button>

            <DeleteConfirmationDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Atleta"
                description={`Atenção! Esta ação não pode ser desfeita.\nTodas as inscrições em eventos serão removidas.`}
                itemName={athleteName}
                loading={loading}
            />
        </>
    );
}

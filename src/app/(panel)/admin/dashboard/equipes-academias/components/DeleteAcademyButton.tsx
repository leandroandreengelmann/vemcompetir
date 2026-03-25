'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { deleteAcademyAction } from '../actions';
import { DeleteConfirmationDialog } from '@/components/panel/DeleteConfirmationDialog';

interface DeleteAcademyButtonProps {
    academyId: string;
    academyName: string;
}

export default function DeleteAcademyButton({ academyId, academyName }: DeleteAcademyButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteAcademyAction(academyId);

        if (result.error) {
            alert(result.error);
            setLoading(false);
        } else {
            router.push('/admin/dashboard/equipes-academias');
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
                <span className="sr-only">Excluir Academia</span>
            </Button>

            <DeleteConfirmationDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Academia / Equipe"
                description={`Atenção! Esta ação não pode ser desfeita.\nTodos os atletas vinculados serão desvinculados automaticamente.`}
                itemName={academyName}
                loading={loading}
            />
        </>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { deleteAdminEventAction } from '../actions';
import { DeleteConfirmationDialog } from '@/components/panel/DeleteConfirmationDialog';

interface AdminDeleteEventButtonProps {
    eventId: string;
    eventTitle: string;
}

export default function AdminDeleteEventButton({ eventId, eventTitle }: AdminDeleteEventButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = async () => {

        setLoading(true);
        const result = await deleteAdminEventAction(eventId);

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
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={loading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                pill
            >
                {loading ? <SpinnerGapIcon size={20} weight="bold" className="animate-spin" /> : <TrashIcon size={20} weight="duotone" />}
                <span className="sr-only">Excluir Evento</span>
            </Button>

            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Evento"
                description={`Atenção! Esta ação não pode ser desfeita.`}
                itemName={eventTitle}
                loading={loading}
            />
        </>
    );
}

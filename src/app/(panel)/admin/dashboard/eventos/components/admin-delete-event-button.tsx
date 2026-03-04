'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

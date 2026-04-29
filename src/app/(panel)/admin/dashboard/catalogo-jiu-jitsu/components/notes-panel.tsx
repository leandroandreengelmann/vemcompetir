'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NoteIcon, TrashIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { addNote, deleteNote, type JjLabNote } from '../actions';

export function NotesPanel({ importId, notes }: { importId: string; notes: JjLabNote[] }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleAdd() {
        if (!content.trim()) return;
        setLoading(true);
        try {
            const r = await addNote(importId, content);
            if (r.error) toast.error(r.error);
            else {
                setContent('');
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        const r = await deleteNote(id, importId);
        if (r.error) toast.error(r.error);
        else router.refresh();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-panel-md font-semibold inline-flex items-center gap-2">
                    <NoteIcon size={20} weight="duotone" /> Anotações
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Textarea
                        placeholder="Anote padrões, inconsistências, decisões sobre esse CSV..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="bg-background min-h-[80px]"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleAdd} disabled={loading || !content.trim()} pill>
                            {loading ? 'Salvando...' : 'Adicionar nota'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {notes.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Sem anotações ainda.</p>
                    )}
                    {notes.map((n) => (
                        <div key={n.id} className="border rounded-lg p-3 bg-muted/30 group">
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm whitespace-pre-wrap flex-1">{n.content}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 h-7 w-7"
                                    onClick={() => handleDelete(n.id)}
                                >
                                    <TrashIcon size={14} className="text-destructive" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(n.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

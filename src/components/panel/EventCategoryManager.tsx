'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { linkCategoryTables, unlinkCategoryTable, getEventCategoryTables, getAvailableCategoryTables } from '@/app/(panel)/actions/event-categories';
import { CategoryTable } from '@/app/(panel)/admin/actions/categories';
import Link from 'next/link';

interface EventCategoryManagerProps {
    eventId: string;
    isSuperAdmin?: boolean;
}

export function EventCategoryManager({ eventId, isSuperAdmin }: EventCategoryManagerProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availableTables, setAvailableTables] = useState<CategoryTable[]>([]);
    const [linkedTables, setLinkedTables] = useState<CategoryTable[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    async function loadData() {
        setLoading(true);
        try {
            const [all, linked] = await Promise.all([
                getAvailableCategoryTables(),
                getEventCategoryTables(eventId)
            ]);
            setAvailableTables(all);
            setLinkedTables(linked);
            setSelectedIds(linked.map(t => t.id));
        } catch (error) {
            toast.error("Erro ao carregar categorias.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [eventId]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await linkCategoryTables(eventId, selectedIds);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Categorias vinculadas com sucesso.");
            loadData();
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Available Tables */}
                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Grupos Disponíveis
                        </CardTitle>
                        <Button
                            pill
                            onClick={handleSave}
                            disabled={saving}
                            className="h-9 px-4"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Seleção
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-caption text-muted-foreground mb-4">
                            Selecione os grupos de categorias que farão parte deste evento.
                        </p>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {availableTables.map(table => (
                                <div
                                    key={table.id}
                                    className="flex items-center space-x-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => handleToggle(table.id)}
                                >
                                    <Checkbox
                                        id={table.id}
                                        checked={selectedIds.includes(table.id)}
                                        onCheckedChange={() => handleToggle(table.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-ui font-medium">{table.name}</span>
                                            <Badge variant="outline" className="text-label px-3 py-1 font-semibold rounded-full bg-primary/5 text-primary border-primary/20">
                                                {table.count} Categorias
                                            </Badge>
                                        </div>
                                        {table.description && (
                                            <p className="text-caption text-muted-foreground line-clamp-1 mt-0.5">
                                                {table.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Currently Linked */}
                <Card className="w-full md:w-80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ListChecks className="h-5 w-5" />
                            Já Vinculados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {linkedTables.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-caption border-2 border-dashed rounded-xl">
                                    Nenhum grupo vinculado.
                                </div>
                            ) : (
                                linkedTables.map(table => (
                                    <div key={table.id} className="flex flex-col p-3 rounded-xl bg-primary/5 border border-primary/10">
                                        <span className="text-ui font-medium mb-1">{table.name}</span>
                                        <div className="flex items-center justify-between">
                                            <Badge className="text-label px-2 py-0.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 border-none rounded-full">
                                                {table.count} categorias
                                            </Badge>
                                            <Button variant="outline" size="sm" asChild pill className="h-8">
                                                <Link href={`/admin/dashboard/eventos/${eventId}/categorias/${table.id}/precos`}>
                                                    Editar Valores
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { CategoryRow, CategoryTable } from '../../../../actions/categories';
import { CategoryForm } from './category-form';
import { CSVImporter } from './csv-importer';
import { CategoryListTable } from './category-list-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryTableDetailsProps {
    table: CategoryTable;
    rows: CategoryRow[];
}

export function CategoryTableDetails({ table, rows }: CategoryTableDetailsProps) {
    const [editingRow, setEditingRow] = useState<CategoryRow | null>(null);
    const [activeTab, setActiveTab] = useState("manual");

    const handleEdit = (row: CategoryRow) => {
        setEditingRow(row);
        setActiveTab("manual");
        // Scroll to form?
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingRow(null);
    };

    const handleSuccess = () => {
        setEditingRow(null);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{editingRow ? 'Editar Categoria' : 'Adicionar Categoria'}</CardTitle>
                        <CardDescription>
                            {editingRow
                                ? 'Edite os dados da categoria selecionada.'
                                : 'Adicione novas categorias à tabela.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="manual" disabled={!!editingRow}>Cadastro Manual</TabsTrigger>
                                <TabsTrigger value="import" disabled={!!editingRow}>Importar CSV</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual">
                                <CategoryForm
                                    tableId={table.id}
                                    initialData={editingRow}
                                    onCancelEdit={handleCancelEdit}
                                    onSuccess={handleSuccess}
                                />
                            </TabsContent>
                            <TabsContent value="import">
                                <CSVImporter tableId={table.id} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="hidden md:block bg-muted/30 rounded-lg p-6 border border-dashed flex flex-col items-center justify-center text-center">
                    <h3 className="text-panel-md font-semibold mb-2">Resumo da Tabela</h3>
                    <p className="text-panel-sm text-muted-foreground mb-4">
                        Esta tabela possui <strong>{rows.length}</strong> categorias cadastradas.
                    </p>
                    <div className="text-panel-sm text-muted-foreground w-full text-left space-y-2 max-h-[300px] overflow-y-auto">
                        <p><strong>Exemplos de categorias geradas:</strong></p>
                        <ul className="list-disc list-inside">
                            {rows.slice(0, 5).map(row => (
                                <li key={row.id} className="truncate">{row.categoria_completa}</li>
                            ))}
                            {rows.length === 0 && <li>Nenhuma categoria cadastrada.</li>}
                        </ul>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Categorias Cadastradas</CardTitle>
                    <CardDescription>
                        Gerencie as categorias existentes nesta tabela.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CategoryListTable
                        rows={rows}
                        tableId={table.id}
                        onEdit={handleEdit}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

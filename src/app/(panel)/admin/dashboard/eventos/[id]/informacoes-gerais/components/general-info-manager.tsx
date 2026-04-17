"use client";

import React, { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    createGeneralInfoAction,
    updateGeneralInfoAction,
    deleteGeneralInfoAction,
    uploadInfoAssetAction,
    deleteInfoAssetAction,
    reorderGeneralInfosAction
} from "../actions";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Trash2, FileText, Image as ImageIcon, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { confirmAsync } from "@/components/panel/ConfirmDialog";

interface Asset {
    id: string;
    info_id: string;
    asset_type: 'image' | 'pdf';
    storage_path: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    public_url?: string; // Pre-computed on server for reliable display
}

interface GeneralInfo {
    id: string;
    title: string;
    content?: string;
    text_content_json: any;
    sort_order: number;
    assets?: Asset[];
}

interface GeneralInfoManagerProps {
    eventId: string;
    tenantId: string;
    initialInfos: GeneralInfo[];
}

interface SortableItemProps {
    info: GeneralInfo;
    index: number;
    loading: string | null;
    onUpdate: (infoId: string, title: string, contentJson: any, contentHtml: string) => void;
    onDelete: (infoId: string) => void;
    onFileUpload: (infoId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteAsset: (infoId: string, assetId: string, storagePath: string) => void;
    setInfos: React.Dispatch<React.SetStateAction<GeneralInfo[]>>;
    infos: GeneralInfo[];
}

function SortableItem({
    info,
    index,
    loading,
    onUpdate,
    onDelete,
    onFileUpload,
    onDeleteAsset,
    setInfos,
    infos
}: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: info.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    const formattedNumber = (index + 1).toString().padStart(2, '0');

    return (
        <div ref={setNodeRef} style={style} className="group relative">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                    value={info.id}
                    className="border rounded-xl px-4 bg-card shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:bg-muted p-1 rounded transition-colors"
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <AccordionTrigger className="hover:no-underline py-4 flex-1">
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground font-mono text-xs">{formattedNumber}.</span>
                                <span className="text-panel-sm font-medium">{info.title}</span>
                            </div>
                        </AccordionTrigger>
                    </div>
                    <AccordionContent className="pt-2 pb-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-panel-sm font-medium">Título do Tópico</label>
                                <div className="p-1">
                                    <Input variant="lg"
                                        className="text-panel-md font-semibold"
                                        defaultValue={info.title}
                                        onBlur={(e) => {
                                            if (e.target.value !== info.title) {
                                                setInfos(infos.map(i => i.id === info.id ? { ...i, title: e.target.value } : i));
                                            }
                                        }}
                                        placeholder="Ex: Regulamento, Premiação..."
                                    />
                                </div>
                            </div>

                            <Tabs defaultValue="text" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
                                    <TabsTrigger value="text" className="data-[state=active]:bg-background">Texto</TabsTrigger>
                                    <TabsTrigger value="media" className="data-[state=active]:bg-background">Mídia</TabsTrigger>
                                </TabsList>

                                <TabsContent value="text" className="space-y-4">
                                    <RichTextEditor
                                        value={info.text_content_json}
                                        onChange={({ json, html }) => {
                                            setInfos(prev => prev.map(i => i.id === info.id ? {
                                                ...i,
                                                text_content_json: json,
                                                content: html
                                            } : i));
                                        }}
                                    />
                                </TabsContent>

                                <TabsContent value="media" className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {info.assets?.map((asset) => (
                                            <div key={asset.id} className="group relative aspect-square rounded-xl border bg-muted/10 overflow-hidden">
                                                {asset.asset_type === 'image' ? (
                                                    <img
                                                        src={asset.public_url || `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()}/storage/v1/object/public/event-images/${asset.storage_path}`}
                                                        alt={asset.file_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <span className="text-xs text-center line-clamp-2">{asset.file_name}</span>
                                                    </div>
                                                )}
                                                {/* Fallback shown when image fails to load */}
                                                <div className="hidden w-full h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
                                                    <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                                                    <span className="text-[10px] text-center line-clamp-2">{asset.file_name}</span>
                                                </div>
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        pill
                                                        className="h-8 w-8"
                                                        onClick={() => onDeleteAsset(info.id, asset.id, asset.storage_path)}
                                                        disabled={loading === `asset-${asset.id}`}
                                                    >
                                                        {loading === `asset-${asset.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                    <a
                                                        href={asset.public_url || `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()}/storage/v1/object/public/event-images/${asset.storage_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center rounded-md bg-background text-ui font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8"
                                                        title="Ver arquivo"
                                                    >
                                                        <ImageIcon className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}

                                        <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-xl hover:bg-muted/20 cursor-pointer transition-colors relative">
                                            <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionar</span>
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => onFileUpload(info.id, e)}
                                                disabled={loading === `upload-${info.id}`}
                                                accept="image/*,application/pdf"
                                            />
                                            {loading === `upload-${info.id}` && (
                                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <Button
                                    variant="destructive"
                                    pill
                                    onClick={() => onDelete(info.id)}
                                    disabled={!!loading}
                                    className="h-10 px-6"
                                >
                                    Excluir tópico
                                </Button>
                                <Button
                                    pill
                                    onClick={() => {
                                        const currentInfo = infos.find(i => i.id === info.id);
                                        if (currentInfo) {
                                            onUpdate(currentInfo.id, currentInfo.title, currentInfo.text_content_json, currentInfo.content || "");
                                        }
                                    }}
                                    disabled={!!loading}
                                    className="h-10 min-w-[140px]"
                                >
                                    {loading === info.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar tópico
                                </Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

export function GeneralInfoManager({ eventId, tenantId, initialInfos }: GeneralInfoManagerProps) {
    const [infos, setInfos] = useState<GeneralInfo[]>(
        [...initialInfos].sort((a, b) => a.sort_order - b.sort_order)
    );
    const [loading, setLoading] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = infos.findIndex((i) => i.id === active.id);
            const newIndex = infos.findIndex((i) => i.id === over.id);

            const newOrder = arrayMove(infos, oldIndex, newIndex);

            // Optimistic update
            const updatedItems = newOrder.map((item, index) => ({
                ...item,
                sort_order: index
            }));

            setInfos(updatedItems);

            // Persist
            const resultAction = await reorderGeneralInfosAction(
                eventId,
                updatedItems.map(item => ({ id: item.id, sort_order: item.sort_order }))
            );

            if (resultAction.error) {
                toast.error("Erro ao reordenar: " + resultAction.error, {
                    className: "!bg-destructive !text-destructive-foreground !border-destructive",
                    icon: <AlertCircle className="h-4 w-4" />
                });
            } else {
                toast.success("Ordem atualizada.", {
                    description: "A nova sequência dos tópicos foi salva com sucesso.",
                    className: "!bg-emerald-600 !text-white !border-emerald-700 [&>div>div]:!text-white/90",
                    icon: <CheckCircle2 className="h-4 w-4" />
                });
            }
        }
    };

    const handleAddTopic = async () => {
        setLoading("new");
        const result = await createGeneralInfoAction(eventId, tenantId);
        if (result.error) {
            toast.error(result.error, {
                className: "!bg-destructive !text-destructive-foreground !border-destructive",
                icon: <AlertCircle className="h-4 w-4" />
            });
        } else if (result.data) {
            setInfos([...infos, { ...result.data, assets: [] }]);
            toast.success("Tópico criado com sucesso.", {
                className: "!bg-emerald-600 !text-white !border-emerald-700",
                icon: <CheckCircle2 className="h-4 w-4" />
            });
        }
        setLoading(null);
    };

    const handleUpdateTopic = async (infoId: string, title: string, contentJson: any, contentHtml: string) => {
        setLoading(infoId);
        const result = await updateGeneralInfoAction(infoId, eventId, {
            title,
            text_content_json: contentJson,
            content: contentHtml
        });

        if (result.error) {
            toast.error(result.error, {
                className: "!bg-destructive !text-destructive-foreground !border-destructive",
                icon: <AlertCircle className="h-4 w-4" />
            });
        } else {
            toast.success("Alterações salvas.", {
                description: "O conteúdo do tópico foi atualizado corretamente.",
                className: "!bg-emerald-600 !text-white !border-emerald-700 [&>div>div]:!text-white/90",
                icon: <CheckCircle2 className="h-4 w-4" />
            });
        }
        setLoading(null);
    };

    const handleDeleteTopic = async (infoId: string) => {
        const ok = await confirmAsync({
            variant: 'destructive',
            title: 'Excluir tópico?',
            description: 'O tópico e todos os arquivos anexados serão removidos permanentemente.',
            confirmLabel: 'Excluir',
        });
        if (!ok) return;

        setLoading(infoId);
        const result = await deleteGeneralInfoAction(infoId, eventId);
        if (result.error) {
            toast.error(result.error, {
                className: "!bg-destructive !text-destructive-foreground !border-destructive",
                icon: <AlertCircle className="h-4 w-4" />
            });
        } else {
            setInfos(infos.filter(i => i.id !== infoId));
            toast.success("Tópico excluído.", {
                className: "!bg-emerald-600 !text-white !border-emerald-700",
                icon: <CheckCircle2 className="h-4 w-4" />
            });
        }
        setLoading(null);
    };

    const handleFileUpload = async (infoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setLoading(`upload-${infoId}`);
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append("file", files[i]);
            formData.append("infoId", infoId);
            formData.append("eventId", eventId);
            formData.append("tenantId", tenantId);

            const result = await uploadInfoAssetAction(formData);
            if (result.error) {
                toast.error(`Erro no arquivo ${files[i].name}: ${result.error}`, {
                    className: "!bg-destructive !text-destructive-foreground !border-destructive",
                    icon: <AlertCircle className="h-4 w-4" />
                });
            } else if (result.asset) {
                setInfos(current => current.map(info =>
                    info.id === infoId
                        ? { ...info, assets: [...(info.assets || []), result.asset] }
                        : info
                ));
            }
        }
        toast.success("Arquivos enviados.", {
            description: "Mídias adicionadas ao tópico com sucesso.",
            className: "!bg-emerald-600 !text-white !border-emerald-700 [&>div>div]:!text-white/90",
            icon: <CheckCircle2 className="h-4 w-4" />
        });
        setLoading(null);
        e.target.value = "";
    };

    const handleDeleteAsset = async (infoId: string, assetId: string, storagePath: string) => {
        setLoading(`asset-${assetId}`);
        const result = await deleteInfoAssetAction(assetId, storagePath, eventId);
        if (result.error) {
            toast.error(result.error, {
                className: "!bg-destructive !text-destructive-foreground !border-destructive",
                icon: <AlertCircle className="h-4 w-4" />
            });
        } else {
            setInfos(current => current.map(info =>
                info.id === infoId
                    ? { ...info, assets: (info.assets || []).filter(a => a.id !== assetId) }
                    : info
            ));
            toast.success("Arquivo removido.", {
                description: "O arquivo foi excluído permanentemente.",
                className: "!bg-emerald-600 !text-white !border-emerald-700 [&>div>div]:!text-white/90",
                icon: <CheckCircle2 className="h-4 w-4" />
            });
        }
        setLoading(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
                <div>
                    <h2 className="text-panel-md font-semibold">Tópicos do Evento</h2>
                    <p className="text-panel-sm text-muted-foreground">Adicione e organize o conteúdo do evento.</p>
                </div>
                <Button
                    pill
                    onClick={handleAddTopic}
                    disabled={!!loading}
                    className="h-10 px-6"
                >
                    {loading === "new" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adicionar tópico
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={infos.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {infos.map((info, index) => (
                            <SortableItem
                                key={info.id}
                                info={info}
                                index={index}
                                loading={loading}
                                onUpdate={handleUpdateTopic}
                                onDelete={handleDeleteTopic}
                                onFileUpload={handleFileUpload}
                                onDeleteAsset={handleDeleteAsset}
                                setInfos={setInfos}
                                infos={infos}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {infos.length === 0 && (
                <Card className="border-dashed bg-muted/5">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p>Nenhum tópico configurado para este evento.</p>
                        <Button variant="link" onClick={handleAddTopic} className="mt-2">Clique para adicionar o primeiro</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

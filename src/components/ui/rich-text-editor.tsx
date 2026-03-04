"use client";

import { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Undo,
    Redo,
    Type,
    Baseline,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Custom FontSize Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: { chain: any }) => {
                return chain().setMark('textStyle', { fontSize }).run();
            },
            unsetFontSize: () => ({ chain }: { chain: any }) => {
                return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
            },
        } as any
    },
});

interface RichTextEditorProps {
    value: any;
    onChange: (data: { json: any; html: string }) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            FontSize,
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange({
                json: editor.getJSON(),
                html: editor.getHTML()
            });
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-[150px] px-4 py-3 focus:outline-none",
            },
        },
    });

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({
        onClick,
        active,
        children,
        title,
        className
    }: {
        onClick: () => void;
        active?: boolean;
        children: React.ReactNode;
        title: string;
        className?: string;
    }) => (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            pill
            onClick={onClick}
            className={cn(
                "h-8 w-8 p-0",
                active && "bg-muted text-primary",
                className
            )}
            title={title}
        >
            {children}
        </Button>
    );

    const sizeMap: Record<string, string> = {
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "18": "18px",
        "20": "20px",
        "24": "24px",
        "32": "32px",
        "48": "48px",
    };

    return (
        <div className="p-[2px]">
            <div className="border border-input rounded-xl bg-background focus-within:ring-1 focus-within:ring-ring transition-all">
                <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/20">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive("bold")}
                        title="Negrito"
                    >
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive("italic")}
                        title="Itálico"
                    >
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive("underline")}
                        title="Sublinhado"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive("heading", { level: 1 })}
                        title="Título 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive("heading", { level: 2 })}
                        title="Título 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive("heading", { level: 3 })}
                        title="Título 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive("bulletList")}
                        title="Lista de Marcadores"
                    >
                        <List className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive("orderedList")}
                        title="Lista Numerada"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Font Size Selector */}
                    <Select
                        onValueChange={(value) => (editor.commands as any).setFontSize(sizeMap[value])}
                        value={Object.entries(sizeMap).find(([_, v]) => editor.isActive('textStyle', { fontSize: v }))?.[0] || "16"}
                    >
                        <SelectTrigger className="h-8 w-[70px] text-xs border-none bg-transparent shadow-none hover:bg-muted rounded-full focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(sizeMap).map(size => (
                                <SelectItem key={size} value={size} className="text-xs">
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Global Color Picker */}
                    <div className="relative flex items-center group">
                        <ToolbarButton
                            onClick={() => { }}
                            title="Cor do Texto"
                            className="pointer-events-none"
                        >
                            <Type className="h-4 w-4" style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }} />
                        </ToolbarButton>
                        <input
                            type="color"
                            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                            value={editor.getAttributes('textStyle').color || "#000000"}
                            className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                        />
                    </div>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetColor().run()}
                        title="Remover Cor"
                    >
                        <Baseline className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="ml-auto flex items-center gap-1">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            title="Desfazer"
                        >
                            <Undo className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            title="Refazer"
                        >
                            <Redo className="h-4 w-4" />
                        </ToolbarButton>
                    </div>
                </div>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

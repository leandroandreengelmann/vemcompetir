'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, SpinnerGapIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { changeCategoryAction } from '../../../../registrations-actions';

interface Category {
    id: string;
    categoria_completa: string;
    faixa?: string;
    divisao_idade?: string;
    categoria_peso?: string;
    sexo?: string;
}

interface Props {
    registrationId: string;
    eventId: string;
    eventTitle: string;
    athleteName: string;
    currentCategory: Category;
    availableCategories: Category[];
    deadlineDate: string;
}

export default function ChangeCategoryForm({
    registrationId,
    eventId,
    eventTitle,
    athleteName,
    currentCategory,
    availableCategories,
    deadlineDate,
}: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit() {
        if (!selected) return;
        setLoading(true);
        setError(null);

        const result = await changeCategoryAction(registrationId, selected);

        if ('error' in result && result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push(`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`);
        router.refresh();
    }

    return (
        <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-lg space-y-8">
                {/* Header */}
                <div className="space-y-6">
                    <Link
                        href={`/academia-equipe/dashboard/eventos/${eventId}/inscricoes`}
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar para inscrições
                    </Link>

                    <div className="space-y-1">
                        <h1 className="text-panel-lg font-black tracking-tight flex items-center gap-2">
                            <ArrowsClockwiseIcon size={24} weight="duotone" className="text-primary" />
                            Trocar Categoria
                        </h1>
                        <p className="text-panel-sm text-muted-foreground">{eventTitle}</p>
                    </div>
                </div>

                {/* Info do atleta e categoria atual */}
                <div className="rounded-2xl border bg-muted/30 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-ui text-muted-foreground font-medium">Atleta</span>
                        <span className="text-ui font-bold">{athleteName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-ui text-muted-foreground font-medium">Categoria atual</span>
                        <span className="text-ui font-bold text-right max-w-[60%]">{currentCategory.categoria_completa}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-ui text-muted-foreground font-medium">Prazo para troca</span>
                        <Badge variant="outline" className="font-semibold">{deadlineDate}</Badge>
                    </div>
                </div>

                {/* Lista de categorias */}
                <div className="space-y-3">
                    <h2 className="text-panel-md font-semibold">Selecione a nova categoria</h2>

                    {availableCategories.length === 0 ? (
                        <p className="text-ui text-muted-foreground text-center py-8">
                            Nenhuma outra categoria disponível neste evento.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {availableCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelected(cat.id)}
                                    className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
                                        selected === cat.id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/40 hover:bg-muted/30'
                                    }`}
                                >
                                    <p className="text-ui font-semibold text-foreground">
                                        {cat.categoria_completa}
                                    </p>
                                    {(cat.divisao_idade || cat.categoria_peso) && (
                                        <p className="text-caption text-muted-foreground mt-0.5">
                                            {[cat.divisao_idade, cat.categoria_peso].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-lg text-center">
                        {error}
                    </div>
                )}

                <Button
                    pill
                    className="w-full h-12 text-ui font-semibold"
                    disabled={!selected || loading}
                    onClick={handleSubmit}
                >
                    {loading ? (
                        <>
                            <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Confirmar Troca'
                    )}
                </Button>
            </div>
        </div>
    );
}

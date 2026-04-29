import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { PreviewTabs } from '../components/preview-tabs';

export default function PreviewAdultMalePage() {
    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" pill>
                <Link href="/admin/dashboard/catalogo-jiu-jitsu" className="inline-flex items-center gap-1">
                    <ArrowLeftIcon size={16} weight="bold" /> Voltar ao laboratório
                </Link>
            </Button>

            <SectionHeader
                title="Preview · Adulto Masculino"
                description="Demonstração visual do modelo de 5 eixos aplicado a uma única faixa etária + gênero. Alterne entre como o admin enxerga e como o atleta vê durante a inscrição."
            />

            <PreviewTabs />
        </div>
    );
}

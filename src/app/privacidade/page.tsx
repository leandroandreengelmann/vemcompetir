import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';

export const metadata = {
    title: 'Política de Privacidade — Competir',
    description: 'Conheça a Política de Privacidade da plataforma Competir.',
};

export default async function PrivacidadePage() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('privacy_policies')
        .select('version, content, created_at')
        .eq('is_active', true)
        .single();

    const renderContent = (text: string) =>
        text.split('\n').map((line, i) => {
            const isMainTitle = /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s—]{10,}$/.test(line.trim()) && line.trim().length > 0;
            const isSection = /^\d+\./.test(line.trim());
            const isSubItem = /^[a-z]\)/.test(line.trim());

            if (!line.trim()) return <div key={i} className="h-3" />;
            if (isMainTitle) return <h1 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">{line}</h1>;
            if (isSection) return <h2 key={i} className="text-base font-bold text-foreground mt-6 mb-2">{line}</h2>;
            if (isSubItem) return <p key={i} className="text-sm text-muted-foreground leading-relaxed pl-4">{line}</p>;
            return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
        });

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                    <ArrowLeftIcon size={16} weight="duotone" />
                    Voltar ao início
                </Link>

                {data ? (
                    <div className="prose-sm">
                        <div className="space-y-1">
                            {renderContent(data.content)}
                        </div>
                        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground">
                            Versão {data.version} — Atualizada em {new Date(data.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-16">
                        Política de privacidade não disponível no momento.
                    </p>
                )}
            </div>
        </div>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Sobre Nós | COMPETIR",
    description:
        "Conheça a plataforma COMPETIR: missão, visão e valores. Transformando a gestão de eventos e a experiência do atleta competidor.",
};

const pillars = [
    {
        title: "Transparência",
        description:
            "Processos claros e verificáveis em cada etapa, da inscrição ao resultado final. Nada escondido, tudo acessível.",
    },
    {
        title: "Simplicidade",
        description:
            "Tecnologia que sai do caminho. Interfaces limpas e fluxos diretos para que você foque no que importa: competir.",
    },
    {
        title: "Competitividade",
        description:
            "Ferramentas que elevam o nível. Desde a gestão profissional de categorias até a experiência do atleta no tatame.",
    },
];

const steps = [
    {
        number: "01",
        title: "Encontre",
        description:
            "Navegue pelos eventos disponíveis e descubra as competições que combinam com o seu nível e objetivos.",
    },
    {
        number: "02",
        title: "Inscreva-se",
        description:
            "Escolha suas categorias, confirme sua inscrição e receba a verificação instantânea. Sem burocracia.",
    },
    {
        number: "03",
        title: "Compita",
        description:
            "Chegue preparado. Acompanhe todas as informações do evento em um só lugar e foque na sua performance.",
    },
];

export default function SobrePage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            {/* 1. Hero Section */}
            <section className="bg-primary text-primary-foreground pt-[calc(var(--header-height,90px)+4rem)] pb-24 md:pb-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-3xl space-y-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground/40">
                            Sobre a Plataforma
                        </p>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05]">
                            Onde a preparação encontra a oportunidade.
                        </h1>
                        <p className="text-body text-primary-foreground/60 max-w-xl leading-relaxed">
                            A COMPETIR nasceu para resolver um problema real: conectar atletas, academias e organizadores
                            em uma experiência única, eliminando a fricção entre quem quer competir e quem organiza a competição.
                        </p>
                    </div>
                </div>
            </section>

            <main className="flex-1">
                {/* 2. Missão & Visão */}
                <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-1 bg-primary rounded-full" />
                                <h2 className="text-h3 font-black uppercase tracking-widest">
                                    Missão
                                </h2>
                            </div>
                            <p className="text-body text-muted-foreground leading-relaxed pl-5">
                                Democratizar o acesso a competições de alto nível, oferecendo uma plataforma onde
                                qualquer atleta pode encontrar, se inscrever e participar de eventos com a mesma
                                facilidade e profissionalismo que os melhores do mundo.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-1 bg-primary rounded-full" />
                                <h2 className="text-h3 font-black uppercase tracking-widest">
                                    Visão
                                </h2>
                            </div>
                            <p className="text-body text-muted-foreground leading-relaxed pl-5">
                                Ser a referência em gestão de eventos competitivos no Brasil, criando um ecossistema
                                onde tecnologia e esporte se encontram para elevar a experiência de todos os envolvidos —
                                do atleta ao organizador.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Pilares / Valores */}
                <section className="bg-muted/30 border-y">
                    <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                        <div className="space-y-4 mb-16">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                                Nossos Pilares
                            </p>
                            <h2 className="text-h1 font-black tracking-tighter">
                                O que nos move
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {pillars.map((pillar) => (
                                <div
                                    key={pillar.title}
                                    className="p-8 rounded-[7px] bg-background border border-border/50 space-y-4 transition-all hover:border-border hover:shadow-lg"
                                >
                                    <h3 className="text-h3 font-black uppercase tracking-widest">
                                        {pillar.title}
                                    </h3>
                                    <p className="text-body text-muted-foreground leading-relaxed">
                                        {pillar.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. Como Funciona */}
                <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                    <div className="space-y-4 mb-16">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                            Como Funciona
                        </p>
                        <h2 className="text-h1 font-black tracking-tighter">
                            Simples como deve ser
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
                        {steps.map((step) => (
                            <div key={step.number} className="space-y-5">
                                <span className="text-6xl font-black text-muted-foreground/10 leading-none block">
                                    {step.number}
                                </span>
                                <h3 className="text-h2 font-black uppercase tracking-wider">
                                    {step.title}
                                </h3>
                                <p className="text-body text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. CTA Final */}
                <section className="border-t">
                    <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center gap-10">
                        <div className="space-y-4 max-w-lg">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                                O tatame espera por você
                            </h2>
                            <p className="text-body text-muted-foreground">
                                Explore os eventos disponíveis e dê o próximo passo na sua jornada competitiva.
                            </p>
                        </div>
                        <Link href="/">
                            <Button
                                variant="default"
                                pill
                                className="h-12 px-10 text-ui font-bold text-white shadow-lg shadow-primary/20"
                            >
                                Ver Eventos
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}

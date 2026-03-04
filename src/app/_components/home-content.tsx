"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PublicEvent } from "../eventos/_data/events";
import { EventCard } from "../eventos/_components/event-card";
import { Trophy, ChevronRight, ShieldCheck, Users, Flame } from 'lucide-react';
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { motion } from "framer-motion";
import { ComicText } from "@/components/ui/comic-text";
import { TatameCard } from "@/components/ui/tatame-card";

interface HomeContentProps {
    events: PublicEvent[];
}

const STATS = [
    { icon: Users, label: "Atletas", value: "500+" },
    { icon: Trophy, label: "Eventos", value: "50+" },
    { icon: ShieldCheck, label: "Estados", value: "10+" },
];

export function HomeContent({ events }: HomeContentProps) {
    return (
        <main className="min-h-screen bg-[#F8FAFC] relative text-foreground overflow-x-hidden pt-[var(--header-height,4rem)]">
            <PublicHeader />

            {/* Hero Section */}
            <section className="relative py-20 px-4 overflow-hidden">
                {/* Background Pattern - Halftone sutil */}
                <div
                    className="absolute inset-0 -z-10 opacity-10"
                    style={{
                        backgroundImage: `radial-gradient(#000 1px, transparent 0)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
                    <motion.div
                        initial={{ rotate: -5, scale: 0.9, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 10 }}
                    >
                        <ComicText scale="lg" className="mb-4">
                            COMPETIR
                        </ComicText>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4 relative"
                    >
                        {/* Faixa diagonal vermelha atrás do H1 */}
                        <div className="relative inline-block">
                            <div
                                className="absolute -inset-x-6 inset-y-1 bg-[#EF4444] -z-10 border-2 border-black"
                                style={{ transform: "skewX(-4deg)" }}
                            />
                            <h1 className="font-bangers text-4xl md:text-6xl lg:text-7xl text-white leading-none uppercase tracking-wide relative z-10 px-4">
                                Onde os Campeões{" "}
                                <span className="text-[#FACC15]">se Encontram</span>
                            </h1>
                        </div>
                        <p className="text-body text-neutral-600 max-w-xl mx-auto font-medium text-lg italic uppercase">
                            A plataforma definitiva para quem vive o tatame. <br />
                            Inscrições abertas para as maiores copas do Brasil.
                        </p>
                    </motion.div>

                    {/* CTAs */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="flex flex-col sm:flex-row items-center gap-4 pt-4"
                    >
                        <Link href="/login">
                            <Button
                                size="lg"
                                pill
                                className="h-16 px-12 text-xl font-black bg-[#FACC15] text-black border-4 border-black shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000] transition-all gap-3"
                            >
                                ENTRAR NO COMBATE
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </Link>
                        <Link href="#eventos">
                            <Button
                                size="lg"
                                pill
                                variant="outline"
                                className="h-16 px-12 text-xl font-black text-black border-4 border-black shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000] transition-all bg-white hover:bg-[#F8FAFC]"
                            >
                                VER EVENTOS
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Estatísticas animadas */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full max-w-lg"
                    >
                        {STATS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7 + i * 0.1, type: "spring" }}
                                className="flex-1 w-full"
                            >
                                <TatameCard
                                    teethCount={6}
                                    teethDepth={3}
                                    borderColor="black"
                                    bgColor="white"
                                    className="text-center"
                                >
                                    <div className="flex flex-col items-center gap-1 py-2">
                                        <stat.icon className="h-5 w-5 text-[#EF4444]" />
                                        <span className="font-bangers text-3xl text-black leading-none">{stat.value}</span>
                                        <span className="text-label text-black/50 uppercase">{stat.label}</span>
                                    </div>
                                </TatameCard>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Grid de Eventos */}
            <section id="eventos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-white border-y-4 border-black">
                {/* Banner de destaque */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-8 bg-[#FACC15] border-4 border-black shadow-[4px_4px_0px_#000] px-6 py-3 w-fit"
                >
                    <Flame className="h-6 w-6 text-black" />
                    <span className="font-bangers text-2xl uppercase tracking-widest text-black">
                        Inscrições Abertas
                    </span>
                </motion.div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div className="space-y-2">
                        <h2 className="font-bangers text-5xl text-black uppercase tracking-tight">Copa em Destaque</h2>
                        <div className="h-2 w-32 bg-[#FACC15] border-2 border-black" />
                    </div>
                    <p className="font-bold text-black/60 uppercase text-sm tracking-widest">
                        {events.length} Campeonato{events.length !== 1 ? 's' : ''} disponível{events.length !== 1 ? 'is' : ''}
                    </p>
                </div>

                {events.length === 0 ? (
                    <TatameCard
                        teethCount={12}
                        teethDepth={5}
                        borderColor="black"
                        bgColor="#F1F5F9"
                        className="w-full"
                    >
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Trophy className="h-20 w-20 text-black/10 mb-4" />
                            <h2 className="font-bangers text-3xl text-black/40 uppercase">Nenhum evento no radar</h2>
                            <p className="text-caption text-black/30 mt-2 uppercase tracking-widest">Em breve novos campeonatos</p>
                        </div>
                    </TatameCard>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                        {events.map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                                viewport={{ once: true }}
                            >
                                <EventCard event={event} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}

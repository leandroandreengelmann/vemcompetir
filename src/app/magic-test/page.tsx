'use client';

import { BorderBeam } from '@/components/magicui/border-beam';
import { Meteors } from '@/components/magicui/meteors';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MagicTestPage() {
    return (
        <div className="min-h-screen bg-neutral-950 p-8 flex flex-col items-center justify-center space-y-12 overflow-hidden relative">

            <div className="absolute inset-0 pointer-events-none">
                <Meteors number={30} />
            </div>

            <Link href="/atleta/dashboard" className="z-10">
                <Button variant="outline" className="gap-2 bg-transparent text-white border-neutral-800 hover:bg-neutral-800 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
            </Link>

            <div className="flex flex-col md:flex-row gap-8 z-10">
                <Card className="w-full max-w-sm bg-neutral-900 border-neutral-800 text-white relative overflow-hidden">
                    <BorderBeam size={250} duration={12} delay={9} />
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Border Beam</CardTitle>
                        <CardDescription className="text-neutral-400">Um feixe de luz que percorre a borda.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-neutral-300">
                            Este card possui um efeito de Border Beam animado.
                            É ótimo para destacar planos premium ou cards importantes.
                        </p>
                        <div className="h-24 bg-neutral-800/50 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-mono text-neutral-500">Conteúdo do Card</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="w-full max-w-sm bg-neutral-900 border-neutral-800 text-white relative overflow-hidden">
                    <BorderBeam size={250} duration={12} delay={9} colorFrom="#ff0000" colorTo="#ffcc00" />
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Custom Beam</CardTitle>
                        <CardDescription className="text-neutral-400">Cores personalizadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-neutral-300">
                            Podemos customizar as cores e a velocidade da animação.
                        </p>
                        <Button className="w-full bg-neutral-100 text-black hover:bg-neutral-200">
                            Ação Principal
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="z-10 text-center space-y-2">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-600">
                    Magic UI Integration
                </h2>
                <p className="text-neutral-500 max-w-lg mx-auto">
                    Meteors caindo no fundo e Border Beams nos cards. Tudo construído com Tailwind CSS e Framer Motion (opcional).
                </p>
            </div>
        </div>
    );
}

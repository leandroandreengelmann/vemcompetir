'use client';

import { Spinner } from '@/components/kibo-ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function KiboTestPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center space-y-8">
            <Link href="/atleta/dashboard">
                <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
            </Link>

            <Card className="w-full max-w-md border-2 shadow-xl">
                <CardHeader className="text-center border-b bg-white">
                    <CardTitle className="text-2xl font-black italic tracking-tighter">KIBO UI TEST</CardTitle>
                </CardHeader>
                <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center space-y-6">
                    <div className="p-4 bg-black rounded-2xl">
                        <Spinner className="text-white h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground font-medium">O componente Spinner foi instalado com sucesso!</p>

                    <div className="grid grid-cols-3 gap-6 w-full">
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="throbber" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Throbber</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="pinwheel" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Pinwheel</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="circle-filled" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Circle</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="ellipsis" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Ellipsis</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="ring" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Ring</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner variant="bars" />
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Bars</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

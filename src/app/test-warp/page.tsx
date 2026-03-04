"use client";

import React from "react";
import { WarpBackground } from "@/components/ui/warp-background";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export default function TestWarpPage() {
    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <WarpBackground
                beamsPerSide={5}
                gridColor="rgba(0, 0, 0, 0.05)"
                className="flex items-center justify-center"
            >
                <Card className="w-80 shadow-2xl border-white/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
                    <CardContent className="flex flex-col gap-2 p-6">
                        <CardTitle className="text-xl font-bold tracking-tight">
                            Congratulations on Your Promotion!
                        </CardTitle>
                        <CardDescription className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Your hard work and dedication have paid off. We&apos;re thrilled to
                            see you take this next step in your career. Keep up the fantastic
                            work!
                        </CardDescription>
                    </CardContent>
                </Card>
            </WarpBackground>
        </main>
    );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
    return (
        <header className="fixed top-0 left-0 w-full z-50 h-[var(--header-height,90px)] bg-white border-b border-border flex items-center justify-between px-6 sm:px-8">
            <Link href="/" className="flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                <img
                    src="/logo-camaleao-black.png"
                    alt="COMPETIR"
                    className="h-10 sm:h-12 w-auto object-contain"
                />
            </Link>
            <Link href="/login">
                <Button variant="default" size="default" pill className="h-12 px-8">
                    Entrar
                </Button>
            </Link>
        </header>
    );
}

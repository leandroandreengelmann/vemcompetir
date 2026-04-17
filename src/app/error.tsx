'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[App Error]', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="size-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">Algo deu errado do nosso lado</h1>
                    <p className="text-sm text-muted-foreground">
                        Já registramos o erro. Tente de novo em instantes ou volte ao início.
                    </p>
                    {error.digest && (
                        <p className="text-[11px] text-muted-foreground font-mono pt-2">
                            Código: {error.digest}
                        </p>
                    )}
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <Home className="size-4" aria-hidden="true" />
                            Início
                        </Link>
                    </Button>
                    <Button onClick={reset}>
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Tentar de novo
                    </Button>
                </div>
            </div>
        </div>
    );
}

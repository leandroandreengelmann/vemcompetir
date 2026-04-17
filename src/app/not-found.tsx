import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileX, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="size-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <FileX className="size-10 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <p className="text-5xl font-bold tracking-tight">404</p>
                    <h1 className="text-xl font-semibold">Não encontramos esta página</h1>
                    <p className="text-sm text-muted-foreground">
                        O endereço pode ter mudado ou o conteúdo não está mais disponível.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button asChild>
                        <Link href="/">
                            <Home className="size-4" aria-hidden="true" />
                            Voltar ao início
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

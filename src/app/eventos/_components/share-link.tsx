'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function ShareLink() {
    const [currentUrl, setCurrentUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Set URL after component mounts on client
        setCurrentUrl(window.location.href);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl);
            setCopied(true);
            toast.success('Link copiado com sucesso!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar:', err);
            toast.error('Erro ao copiar o link.');
        }
    };

    if (!currentUrl) return null;

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                <LinkIcon className="h-3 w-3" />
                Compartilhe este evento
            </p>
            <div
                onClick={handleCopy}
                className="group relative flex items-center justify-between gap-4 p-4 rounded-[7px] bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/30 hover:border-border/80 transition-all duration-300"
            >
                <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
                        Clique no link para copiar e compartilhar
                    </span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-md">
                        {currentUrl}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {copied && (
                    <div className="absolute inset-0 bg-green-500/5 rounded-[7px] pointer-events-none" />
                )}
            </div>
        </div>
    );
}

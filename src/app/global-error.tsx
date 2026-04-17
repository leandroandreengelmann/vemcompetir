'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Global Error]', error);
    }, [error]);

    return (
        <html lang="pt-BR">
            <body
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    background: '#ffffff',
                    color: '#0a0a0a',
                }}
            >
                <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 16px',
                            borderRadius: '999px',
                            background: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                        }}
                    >
                        ⚠️
                    </div>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                        Erro inesperado
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                        Algo quebrou antes mesmo da página carregar. Tente recarregar.
                    </p>
                    {error.digest && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', marginBottom: '16px' }}>
                            Código: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            background: '#0a0a0a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '999px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Tentar de novo
                    </button>
                </div>
            </body>
        </html>
    );
}

'use client';

import React, { useState } from 'react';

const colors = {
    brand: [
        { name: 'Primary 600', class: 'bg-brand-600', hex: '#535862' },
        { name: 'Primary 700', class: 'bg-brand-700', hex: '#414651' },
        { name: 'Primary 800 (Base)', class: 'bg-brand-800', hex: '#252B37' },
        { name: 'Primary 900', class: 'bg-brand-900', hex: '#181D27' },
        { name: 'Primary 950', class: 'bg-brand-950', hex: '#0A0D12' },
    ],
    ui: [
        { name: 'Background', class: 'bg-background', border: true },
        { name: 'Foreground', class: 'bg-foreground', text: 'text-background' },
        { name: 'Card', class: 'bg-card', border: true },
        { name: 'Muted', class: 'bg-muted', border: true },
        { name: 'Primary (Shadcn)', class: 'bg-primary', text: 'text-primary-foreground' },
        { name: 'Secondary', class: 'bg-secondary', border: true },
        { name: 'Accent', class: 'bg-accent', text: 'text-accent-foreground' },
    ],
    status: [
        { name: 'Success', class: 'bg-success', text: 'text-white' },
        { name: 'Warning', class: 'bg-warning', text: 'text-white' },
        { name: 'Destructive', class: 'bg-destructive', text: 'text-white' },
    ]
};

export default function CoresPage() {
    const [isDark, setIsDark] = useState(false);

    const toggleDarkMode = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className="min-h-screen p-8 transition-colors duration-300">
            <div className="max-w-5xl mx-auto space-y-12">
                <header className="flex justify-between items-end border-b pb-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Design System COMPETIR</h1>
                        <p className="text-muted-foreground mt-2">Visualização de tokens, cores e componentes de UI.</p>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Mudar para {isDark ? 'Light' : 'Dark'} Mode
                    </button>
                </header>

                <section>
                    <h2 className="text-2xl font-semibold mb-6">Paleta Primária (Brand)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {colors.brand.map((color) => (
                            <div key={color.name} className="space-y-2">
                                <div className={`h-24 rounded-xl shadow-sm border ${color.class}`} />
                                <div>
                                    <p className="font-medium text-sm">{color.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono uppercase">{color.hex}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-6">Semantic UI (Shadcn/Tokens)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {colors.ui.map((color) => (
                            <div key={color.name} className="space-y-2">
                                <div className={`h-20 rounded-lg shadow-sm flex items-center justify-center p-4 border ${color.class} ${color.text || 'text-foreground'}`}>
                                    <span className="text-xs font-semibold uppercase tracking-wider">Amostra</span>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{color.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono italic">{color.class}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-6">Estados do Sistema</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {colors.status.map((color) => (
                            <div key={color.name} className="flex items-center gap-4 p-4 border rounded-xl bg-card">
                                <div className={`h-12 w-12 rounded-full border shadow-inner ${color.class}`} />
                                <div>
                                    <p className="font-semibold">{color.name}</p>
                                    <p className="text-xs text-muted-foreground uppercase font-mono">{color.class}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="pt-8 border-t border-dashed">
                    <h2 className="text-xl font-semibold mb-6 text-muted-foreground">Exemplo de Botões</h2>
                    <div className="flex flex-wrap gap-4">
                        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:ring-2 ring-primary ring-offset-2 transition-all">Botão Primary</button>
                        <button className="px-6 py-2 bg-secondary text-secondary-foreground border rounded-md font-medium hover:bg-muted transition-colors">Botão Secondary</button>
                        <button className="px-6 py-2 bg-destructive text-destructive-foreground rounded-md font-medium hover:opacity-90 transition-opacity outline-none">Botão Destructive</button>
                        <button className="px-6 py-2 text-primary font-medium hover:underline underline-offset-4">Texto Link</button>
                    </div>
                </section>

                <footer className="pt-12 pb-8 text-center text-muted-foreground text-sm">
                    <p>© 2024 COMPETIR - Design System Restritivo v1.0</p>
                </footer>
            </div>
        </div>
    );
}

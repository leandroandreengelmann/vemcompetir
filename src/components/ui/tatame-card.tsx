
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface TatameCardProps extends React.HTMLAttributes<HTMLDivElement> {
    teethCount?: number;
    teethDepth?: number;
    borderColor?: string;
    bgColor?: string;
}

export function TatameCard({
    children,
    className,
    teethCount = 8, // Ajustado para 8 dentes por lado (padrão)
    teethDepth = 4, // Reduzido para ser sutil e não cortar conteúdo
    borderColor = "hsl(var(--primary))",
    bgColor = "hsla(var(--primary), 0.05)",
    ...props
}: TatameCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const pathData = useMemo(() => {
        const { width: w, height: h } = dimensions;
        if (w === 0 || h === 0) return "";

        // Margem de segurança para os dentes não saírem do SVG viewBox
        const margin = teethDepth * 2;
        const cornerRadius = 6;

        // Dimensões internas (onde o path "corre")
        // O path será desenhado com um stroke, então precisamos considerar margin
        const startX = margin;
        const startY = margin;
        const innerW = w - (margin * 2);
        const innerH = h - (margin * 2);

        const tD = teethDepth;

        // Gerador de aresta (Edge Generator)
        // Retorna string de comandos SVG (sem M inicial)
        const generateEdge = (length: number, count: number) => {
            const segmentLen = length / count;
            const toothWidth = segmentLen * 0.5;
            const gap = (segmentLen - toothWidth) / 2;

            let d = "";
            for (let i = 0; i < count; i++) {
                // Linha reta
                d += `l ${gap} 0 `;
                // Dente (sai para fora: -y relativo a rotação base que é +x)
                // Vamos assumir que "fora" é sempre à esquerda do vetor de direção? 
                // Não, vamos hardcode a forma: dente para "fora" do card.

                // Sai
                d += `c 1 0 1 -${tD} ${tD} -${tD} `;
                // Topo
                d += `l ${toothWidth - (tD * 2)} 0 `;
                // Volta
                d += `c ${tD * 0.8} 0 ${tD * 0.8} ${tD} ${tD} ${tD} `;

                // Linha reta final do segmento
                d += `l ${gap} 0 `;
            }
            return d;
        };

        // Construção do Path
        // Começa Top-Left (após a curva)
        let d = `M ${startX + cornerRadius} ${startY} `;

        // --- TOP EDGE (Esquerda -> Direita) ---
        // Dentes para CIMA (-y)
        const topEdge = generateEdge(innerW - (cornerRadius * 2), teethCount);
        d += topEdge;

        // Canto Top-Right
        d += `a ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} ${cornerRadius} `;

        // --- RIGHT EDGE (Cima -> Baixo) ---
        // Dentes para DIREITA (+x)
        // Precisamos rotacionar a lógica do generateEdge.
        // Faremos manual no loop para garantir.

        const rightLen = innerH - (cornerRadius * 2);
        const rSeg = rightLen / teethCount;
        const rTooth = rSeg * 0.5;
        const rGap = (rSeg - rTooth) / 2;

        for (let i = 0; i < teethCount; i++) {
            d += `l 0 ${rGap} `;
            // Dente (+x)
            d += `c 0 1 ${tD} 1 ${tD} ${tD} `;
            d += `l 0 ${rTooth - (tD * 2)} `;
            d += `c 0 ${tD * 0.8} -${tD} ${tD * 0.8} -${tD} ${tD} `;
            d += `l 0 ${rGap} `;
        }

        // Canto Bottom-Right
        d += `a ${cornerRadius} ${cornerRadius} 0 0 1 -${cornerRadius} ${cornerRadius} `;

        // --- BOTTOM EDGE (Direita -> Esquerda) ---
        // Dentes para BAIXO (+y)
        const bLen = innerW - (cornerRadius * 2);
        const bSeg = bLen / teethCount;
        const bTooth = bSeg * 0.5;
        const bGap = (bSeg - bTooth) / 2;

        for (let i = 0; i < teethCount; i++) {
            d += `l -${bGap} 0 `;
            // Dente (+y)
            d += `c -1 0 -1 ${tD} -${tD} ${tD} `;
            d += `l -${bTooth - (tD * 2)} 0 `;
            d += `c -${tD * 0.8} 0 -${tD * 0.8} -${tD} -${tD} -${tD} `;
            d += `l -${bGap} 0 `;
        }

        // Canto Bottom-Left
        d += `a ${cornerRadius} ${cornerRadius} 0 0 1 -${cornerRadius} -${cornerRadius} `;

        // --- LEFT EDGE (Baixo -> Cima) ---
        // Dentes para ESQUERDA (-x)
        const lLen = innerH - (cornerRadius * 2);
        const lSeg = lLen / teethCount;
        const lTooth = lSeg * 0.5;
        const lGap = (lSeg - lTooth) / 2;

        for (let i = 0; i < teethCount; i++) {
            d += `l 0 -${lGap} `;
            // Dente (-x)
            d += `c 0 -1 -${tD} -1 -${tD} -${tD} `;
            d += `l 0 -${lTooth - (tD * 2)} `;
            d += `c 0 -${tD * 0.8} ${tD} -${tD * 0.8} ${tD} -${tD} `;
            d += `l 0 -${lGap} `;
        }

        // Canto Top-Left (fechamento)
        d += `a ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} -${cornerRadius} `;
        d += "Z";

        return d;
    }, [dimensions, teethCount, teethDepth]);


    return (
        <div
            ref={containerRef}
            className={cn("relative group select-none", className)}
            // Padding compensa a margem do SVG para que o conteúdo fique dentro da "safe area"
            style={{ padding: `${teethDepth * 3}px` }}
            {...props}
        >
            {/* Background Shape */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
                <svg
                    width="100%"
                    height="100%"
                    className="overflow-visible transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-lg"
                >
                    {/* Fill & Border */}
                    <path
                        d={pathData}
                        fill={bgColor}
                        stroke={borderColor}
                        strokeWidth="2"
                        className="transition-all duration-300"
                    />

                    {/* Highlight (Top/Left) */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="pointer-events-none mix-blend-overlay"
                        transform="translate(-1, -1)"
                    />

                    {/* Shadow (Bottom/Right) */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeOpacity="0.1"
                        className="pointer-events-none"
                        transform="translate(1, 1)"
                    />
                </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    )
}

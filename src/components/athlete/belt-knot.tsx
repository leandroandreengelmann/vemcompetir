import * as React from "react";
import Image from "next/image";
import { BELT_COLORS } from "@/lib/belt-theme";

type Belt =
    | "white" | "blue" | "purple" | "brown" | "black"
    | "yellow" | "orange" | "green" | "cinza"
    | string;

type BeltKnotProps = {
    beltColor?: Belt;
    className?: string;
    title?: string;
};

// Configurações individuais para normalizar o visual das imagens sólidas
const BELT_CONFIG: Record<string, { src: string; scale?: string }> = {
    branca: { src: "/assets/belts/branca.png", scale: "scale-110" },
    cinza: { src: "/assets/belts/cinza.png", scale: "scale-110" },
    amarela: { src: "/assets/belts/amarela.png", scale: "scale-110" },
    laranja: { src: "/assets/belts/laranja.png", scale: "scale-110" },
    verde: { src: "/assets/belts/verde.png", scale: "scale-110" },
    azul: { src: "/assets/belts/azul.png", scale: "scale-110" },
    roxa: { src: "/assets/belts/roxa.png", scale: "scale-110" },
    marrom: { src: "/assets/belts/marrom.png", scale: "scale-110" },
    preta: { src: "/assets/belts/preta.png", scale: "scale-110" },
};

export function BeltKnot({
    beltColor,
    className,
    title = "Faixa",
}: BeltKnotProps) {
    let normalizedColor = (beltColor ?? "").toLowerCase().trim();

    // Extract the primary base color for UI and Icons (e.g. "cinza" from "cinza e branca")
    const splitters = [' e ', ' / ', '-', '/'];
    for (const s of splitters) {
        if (normalizedColor.includes(s)) {
            normalizedColor = normalizedColor.split(s)[0].trim();
            break;
        }
    }

    const config = BELT_CONFIG[normalizedColor];

    if (config) {
        return (
            <div className={className ?? "w-[200px] h-[110px] sm:w-[240px] sm:h-[130px] relative"}>
                <Image
                    src={config.src}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 200px, 240px"
                    className={`object-contain transition-transform duration-300 ${config.scale || 'scale-100'}`}
                    priority
                />
            </div>
        );
    }

    // Fallback para o SVG dinâmico se a imagem não existir (usar cor base)
    const baseHex = BELT_COLORS[normalizedColor as keyof typeof BELT_COLORS] || BELT_COLORS.branca;
    const isBlackBelt = normalizedColor === "preta" || normalizedColor === "black";

    // Simplificando o fallback para usar a cor base
    const beltBase = baseHex;
    const beltHighlight = baseHex;
    const beltShadow = baseHex; // Com opacidade aplicada no render
    const capFill = isBlackBelt ? "#FFFFFF" : "#0A0D12";
    const dropShadow = "drop-shadow(0 1px 0 rgba(0,0,0,0.06))";

    return (
        <div
            className={className ?? "w-[200px] h-[110px] sm:w-[240px] sm:h-[130px]"}
            aria-label={title}
            role="img"
        >
            <svg
                viewBox="0 0 240 140"
                width="100%"
                height="100%"
                style={{ filter: dropShadow }}
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* Sombra de baixo */}
                <path d="M52 52 C78 30, 100 28, 120 34 C140 28, 162 30, 188 52 L176 70 C154 54, 140 54, 120 60 C100 54, 86 54, 64 70 Z" fill={beltShadow} opacity={0.8} />

                {/* Meio Base */}
                <path d="M56 50 C82 28, 104 26, 120 32 C136 26, 158 28, 184 50 L172 64 C152 50, 140 50, 120 56 C100 50, 88 50, 68 64 Z" fill={beltBase} />

                {/* Nó central - Traseiro */}
                <rect x="92" y="42" width="56" height="34" rx="14" fill={beltShadow} opacity={0.85} />

                {/* Nó central - Frente */}
                <path d="M98 44 C108 38, 132 38, 142 44 C148 48, 148 70, 142 74 C132 80, 108 80, 98 74 C92 70, 92 48, 98 44 Z" fill={beltHighlight} />

                {/* Contorno do Nó */}
                <path d="M104 50 C112 46, 128 46, 136 50" stroke="rgba(0,0,0,0.15)" strokeWidth="3" strokeLinecap="round" fill="none" />

                {/* Perna Direita */}
                <path d="M98 72 L78 118 C76 123, 80 128, 86 128 L112 128 C118 128, 120 122, 116 116 L104 74 C102 68, 100 68, 98 72 Z" fill={beltBase} />
                <path d="M98 72 L86 116 C84 121, 87 126, 92 126 L112 126 C116 126, 118 122, 114 116 L104 74 Z" fill="#000000" opacity="0.15" />

                {/* Perna Esquerda */}
                <path d="M142 72 L154 74 L176 116 C180 122, 178 128, 172 128 L146 128 C140 128, 136 123, 138 118 L150 74 C152 68, 146 68, 142 72 Z" fill={beltBase} />
                <path d="M154 74 L174 116 C178 122, 176 126, 170 126 L146 126 C142 126, 139 123, 140 118 L150 74 Z" fill="#000000" opacity="0.15" />

                {/* Pontas pretas */}
                <rect x="84" y="118" width="30" height="10" rx="5" fill={capFill} />
                <rect x="146" y="118" width="30" height="10" rx="5" fill={capFill} />
            </svg>
        </div>
    );
}

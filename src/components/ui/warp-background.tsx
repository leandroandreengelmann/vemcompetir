"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WarpBackgroundProps {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
    gridColor?: string;
    beamsPerSide?: number;
}

export function WarpBackground({
    children,
    className,
    containerClassName,
    gridColor = "rgba(0, 0, 0, 0.05)",
    beamsPerSide = 3,
}: WarpBackgroundProps) {
    const beams = React.useMemo(() => {
        const colors = [
            "from-blue-500",
            "from-teal-500",
            "from-cyan-500",
            "from-pink-500",
            "from-orange-500",
            "from-emerald-500",
        ];

        return Array.from({ length: beamsPerSide * 2 }).map((_, i) => ({
            id: i,
            color: colors[i % colors.length],
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4,
            width: 15 + Math.random() * 30,
            x: (i / (beamsPerSide * 2)) * 100,
        }));
    }, [beamsPerSide]);

    return (
        <div
            className={cn(
                "relative flex min-h-[400px] w-full items-center justify-center overflow-hidden bg-background",
                containerClassName,
            )}
        >
            {/* Grid de Túnel (SVG) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="opacity-60"
                >
                    <defs>
                        <mask id="fadeMask">
                            <radialGradient id="grad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="black" />
                                <stop offset="80%" stopColor="white" />
                            </radialGradient>
                        </mask>
                    </defs>

                    <g stroke={gridColor} strokeWidth="0.1" fill="none">
                        {/* Linhas Radiais (vão para o centro) */}
                        {[...Array(20)].map((_, i) => {
                            const angle = (i / 20) * 360;
                            const rad = (angle * Math.PI) / 180;
                            return (
                                <line
                                    key={`radial-${i}`}
                                    x1="50"
                                    y1="50"
                                    x2={50 + Math.cos(rad) * 100}
                                    y2={50 + Math.sin(rad) * 100}
                                />
                            );
                        })}

                        {/* Retângulos Concêntricos (os "quadradinhos") */}
                        {[...Array(15)].map((_, i) => {
                            const size = (i + 1) * 7;
                            return (
                                <rect
                                    key={`rect-${i}`}
                                    x={50 - size / 2}
                                    y={50 - size / 2}
                                    width={size}
                                    height={size}
                                />
                            );
                        })}
                    </g>
                </svg>

                {/* Overlay de gradiente para suavizar o centro */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--background)_10%,transparent_70%)]" />
            </div>

            {/* Beams seguindo as linhas verticais (simulado) */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                {beams.map((beam) => (
                    <motion.div
                        key={beam.id}
                        className={cn(
                            "absolute bottom-0 h-1/2 bg-gradient-to-t to-transparent opacity-0",
                            beam.color
                        )}
                        style={{
                            left: `${beam.x}%`,
                            width: `${beam.width}px`,
                            clipPath: `polygon(${50 - beam.x}% 0, ${55 - beam.x}% 0, 100% 100%, 0% 100%)`,
                        }}
                        animate={{
                            bottom: ["-50%", "100%"],
                            opacity: [0, 0.4, 0],
                        }}
                        transition={{
                            duration: beam.duration,
                            repeat: Infinity,
                            delay: beam.delay,
                            ease: "linear",
                        }}
                    />
                ))}
            </div>

            {/* Content Layer */}
            <div className={cn("relative z-10 w-full flex justify-center p-4", className)}>
                {children}
            </div>
        </div>
    );
}

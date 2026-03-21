'use client';

import { Link as LinkIcon } from 'lucide-react';

interface Topic {
    title: string;
    content: string;
}

interface ShareLinkProps {
    eventTitle: string;
    eventDate?: string | null;
    eventVenue?: string | null;
    eventCity?: string | null;
    eventState?: string | null;
    registrationCount?: number;
    minPrice?: number | null;
    topics?: Topic[];
    canonicalUrl: string;
}

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// Emojis via String.fromCodePoint para evitar problemas de encoding no Windows
const EM = {
    sport:    String.fromCodePoint(0x1F94B), // 🥋
    calendar: String.fromCodePoint(0x1F4C5), // 📅
    pin:      String.fromCodePoint(0x1F4CD), // 📍
    money:    String.fromCodePoint(0x1F4B0), // 💰
    people:   String.fromCodePoint(0x1F465), // 👥
    clipboard:String.fromCodePoint(0x1F4CB), // 📋
};

function buildWhatsAppMessage({
    eventTitle,
    eventDate,
    eventVenue,
    eventCity,
    eventState,
    minPrice,
    registrationCount,
    topics,
    canonicalUrl,
}: ShareLinkProps): string {
    const lines: string[] = [];

    lines.push(`${EM.sport} *${eventTitle}*`);
    lines.push('');

    if (eventDate) lines.push(`${EM.calendar} *Data:* ${eventDate}`);

    const location = [
        eventVenue,
        eventCity && eventState
            ? `${eventCity} - ${eventState}`
            : eventCity || eventState,
    ]
        .filter(Boolean)
        .join(' - ');
    if (location) lines.push(`${EM.pin} *Local:* ${location}`);

    if (minPrice != null && minPrice > 0) {
        lines.push(`${EM.money} *Inscricao a partir de:* R$ ${minPrice.toFixed(2).replace('.', ',')}`);
    }

    if (registrationCount != null && registrationCount > 0) {
        lines.push(`${EM.people} *Inscritos:* ${registrationCount} atleta${registrationCount !== 1 ? 's' : ''}`);
    }

    if (topics && topics.length > 0) {
        topics.forEach(topic => {
            if (!topic.title && !topic.content) return;
            lines.push('');
            lines.push(`--------------------`);
            lines.push(`${EM.clipboard} *${topic.title.toUpperCase()}*`);
            if (topic.content) {
                lines.push(topic.content);
            }
        });
    }

    lines.push('');
    lines.push(`--------------------`);
    lines.push(`Garanta sua vaga:`);
    lines.push(canonicalUrl);

    return lines.join('\n');
}

export function ShareLink(props: ShareLinkProps) {
    const handleWhatsApp = async () => {
        const message = buildWhatsAppMessage(props);

        // Mobile: Web Share API passa o texto direto ao OS sem URL encoding
        // Emojis chegam intactos ao WhatsApp
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ text: message });
                return;
            } catch {
                // Usuário cancelou ou share falhou — fallback abaixo
            }
        }

        // Desktop: wa.me com URL encoding (emojis funcionam na maioria dos browsers desktop)
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                <LinkIcon className="h-3 w-3" />
                Compartilhe este evento
            </p>

            {/* WhatsApp share card */}
            <button
                onClick={handleWhatsApp}
                className="w-full group flex items-center gap-5 p-5 rounded-[7px] bg-[#25D366] hover:bg-[#20bb59] active:scale-[0.99] text-white transition-all duration-200 shadow-sm hover:shadow-md text-left"
            >
                {/* Icon */}
                <div className="shrink-0 h-12 w-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <WhatsAppIcon />
                </div>

                {/* Text */}
                <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-black uppercase tracking-widest leading-tight">
                        Compartilhar no WhatsApp
                    </span>
                    <span className="text-[11px] font-medium text-white/80 leading-snug">
                        Envia nome, data, local e informacoes completas do evento
                    </span>
                </div>
            </button>
        </div>
    );
}

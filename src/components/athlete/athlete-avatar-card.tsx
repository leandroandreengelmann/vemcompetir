import Image from 'next/image';
import { UserIcon } from '@phosphor-icons/react/dist/ssr';
import { getBeltColor } from '@/lib/belt-theme';

interface AthleteAvatarCardProps {
    fullName?: string | null;
    avatarUrl?: string | null;
    beltColor?: string | null;
}

export function AthleteAvatarCard({ fullName, avatarUrl, beltColor }: AthleteAvatarCardProps) {
    const belt = (beltColor || 'branca').toLowerCase().trim();
    const beltHex = getBeltColor(belt);
    const isWhite = belt === 'branca' || belt === 'white';

    return (
        <div
            className="relative flex items-center justify-center w-14 h-14 rounded-full overflow-hidden shrink-0"
            style={{
                backgroundColor: isWhite ? '#F1F2F4' : beltHex,
                border: isWhite ? '1px solid rgba(10,13,18,0.1)' : 'none',
            }}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={fullName || 'Atleta'}
                    fill
                    sizes="56px"
                    className="object-cover"
                />
            ) : (
                <UserIcon
                    size={32}
                    weight="duotone"
                    className={isWhite ? 'text-brand-950/70' : 'text-white'}
                />
            )}
        </div>
    );
}

import { getCountry } from '@/lib/countries';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
    code: string | null | undefined;
    showName?: boolean;
    className?: string;
    square?: boolean;
}

export function CountryFlag({ code, showName = true, className, square = false }: CountryFlagProps) {
    const country = getCountry(code);
    if (!country) return null;

    const lowerCode = country.code.toLowerCase();

    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <span
                className={cn(
                    'fi',
                    `fi-${lowerCode}`,
                    square ? 'fis' : '',
                    'shadow-sm',
                )}
                style={{ width: '1.5em', height: '1.125em', display: 'inline-block' }}
                aria-label={country.name}
            />
            {showName && <span>{country.name}</span>}
        </span>
    );
}

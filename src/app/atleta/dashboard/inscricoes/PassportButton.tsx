'use client';

import { PassportModal } from '@/components/passport/PassportModal';
import { Button } from '@/components/ui/button';
import { IdentificationCardIcon } from '@phosphor-icons/react';

export function PassportButton({ registrationId }: { registrationId: string }) {
    return (
        <PassportModal
            registrationId={registrationId}
            trigger={
                <Button
                    variant="outline"
                    className="h-10 px-5 text-panel-sm font-bold uppercase tracking-wider rounded-full border-brand-950/20 text-brand-950 hover:bg-brand-950 hover:text-white transition-colors"
                    onClick={(e) => e.preventDefault()}
                >
                    <IdentificationCardIcon size={18} weight="duotone" className="mr-2" />
                    Ver Passaporte
                </Button>
            }
        />
    );
}

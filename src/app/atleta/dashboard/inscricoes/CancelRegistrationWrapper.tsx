'use client';

import { CancelRegistrationButton } from './CancelRegistrationButton';
import { cancelPendingRegistrationAction } from '../campeonatos/athlete-cart-actions';

export function CancelRegistrationWrapper({ registrationId }: { registrationId: string }) {
    return (
        <CancelRegistrationButton
            onConfirm={() => cancelPendingRegistrationAction(registrationId)}
        />
    );
}

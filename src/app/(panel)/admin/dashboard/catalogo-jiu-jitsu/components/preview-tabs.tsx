'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GearIcon, UserCircleIcon, BabyIcon, BarbellIcon, StudentIcon, TrophyIcon } from '@phosphor-icons/react';
import { AdultMalePreview } from './adult-male-preview';
import { AthleteViewPreview } from './athlete-view-preview';
import { KidsPreview } from './kids-preview';
import { KidsAthleteView } from './kids-athlete-view';
import { JuvenilPreview } from './juvenil-preview';
import { JuvenilAthleteView } from './juvenil-athlete-view';
import { MasterPreview } from './master-preview';
import { MasterAthleteView } from './master-athlete-view';

type Mode =
    | 'adulto-admin'
    | 'adulto-atleta'
    | 'master-admin'
    | 'master-atleta'
    | 'juvenil-admin'
    | 'juvenil-atleta'
    | 'infantil-admin'
    | 'infantil-atleta';

export function PreviewTabs() {
    const [mode, setMode] = useState<Mode>('adulto-admin');

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Adulto · 18 a 29 anos
                </p>
                <div className="flex flex-wrap gap-2">
                    <TabButton active={mode === 'adulto-admin'} onClick={() => setMode('adulto-admin')}>
                        <GearIcon size={16} weight="duotone" />
                        <BarbellIcon size={16} weight="duotone" />
                        Admin
                    </TabButton>
                    <TabButton active={mode === 'adulto-atleta'} onClick={() => setMode('adulto-atleta')}>
                        <UserCircleIcon size={16} weight="duotone" />
                        <BarbellIcon size={16} weight="duotone" />
                        Atleta
                    </TabButton>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Master · 30 anos ou mais
                </p>
                <div className="flex flex-wrap gap-2">
                    <TabButton active={mode === 'master-admin'} onClick={() => setMode('master-admin')}>
                        <GearIcon size={16} weight="duotone" />
                        <TrophyIcon size={16} weight="duotone" />
                        Admin
                    </TabButton>
                    <TabButton active={mode === 'master-atleta'} onClick={() => setMode('master-atleta')}>
                        <UserCircleIcon size={16} weight="duotone" />
                        <TrophyIcon size={16} weight="duotone" />
                        Atleta
                    </TabButton>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Juvenil · 16 e 17 anos
                </p>
                <div className="flex flex-wrap gap-2">
                    <TabButton active={mode === 'juvenil-admin'} onClick={() => setMode('juvenil-admin')}>
                        <GearIcon size={16} weight="duotone" />
                        <StudentIcon size={16} weight="duotone" />
                        Admin
                    </TabButton>
                    <TabButton active={mode === 'juvenil-atleta'} onClick={() => setMode('juvenil-atleta')}>
                        <UserCircleIcon size={16} weight="duotone" />
                        <StudentIcon size={16} weight="duotone" />
                        Atleta
                    </TabButton>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Infantil · 4 a 15 anos
                </p>
                <div className="flex flex-wrap gap-2">
                    <TabButton active={mode === 'infantil-admin'} onClick={() => setMode('infantil-admin')}>
                        <GearIcon size={16} weight="duotone" />
                        <BabyIcon size={16} weight="duotone" />
                        Admin
                    </TabButton>
                    <TabButton active={mode === 'infantil-atleta'} onClick={() => setMode('infantil-atleta')}>
                        <UserCircleIcon size={16} weight="duotone" />
                        <BabyIcon size={16} weight="duotone" />
                        Atleta
                    </TabButton>
                </div>
            </div>

            <div className="pt-2">
                {mode === 'adulto-admin' && <AdultMalePreview />}
                {mode === 'adulto-atleta' && <AthleteViewPreview />}
                {mode === 'master-admin' && <MasterPreview />}
                {mode === 'master-atleta' && <MasterAthleteView />}
                {mode === 'juvenil-admin' && <JuvenilPreview />}
                {mode === 'juvenil-atleta' && <JuvenilAthleteView />}
                {mode === 'infantil-admin' && <KidsPreview />}
                {mode === 'infantil-atleta' && <KidsAthleteView />}
            </div>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors',
                active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted',
            )}
        >
            {children}
        </button>
    );
}

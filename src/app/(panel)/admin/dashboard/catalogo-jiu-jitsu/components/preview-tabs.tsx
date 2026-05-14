'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    GearIcon,
    UserCircleIcon,
    BabyIcon,
    BarbellIcon,
    StudentIcon,
    TrophyIcon,
    MedalIcon,
    BuildingsIcon,
} from '@phosphor-icons/react';
import { AdultMalePreview } from './adult-male-preview';
import { AthleteViewPreview } from './athlete-view-preview';
import { KidsPreview } from './kids-preview';
import { KidsAthleteView } from './kids-athlete-view';
import { JuvenilPreview } from './juvenil-preview';
import { JuvenilAthleteView } from './juvenil-athlete-view';
import { MasterPreview } from './master-preview';
import { MasterAthleteView } from './master-athlete-view';
import { AamepAdultoPreview } from './aamep-adulto-preview';
import { AamepAdultoAthleteView } from './aamep-adulto-athlete-view';
import { AamepJuvenilPreview } from './aamep-juvenil-preview';
import { AamepJuvenilAthleteView } from './aamep-juvenil-athlete-view';
import { AamepMasterPreview } from './aamep-master-preview';
import { AamepMasterAthleteView } from './aamep-master-athlete-view';
import { AamepKidsPreview } from './aamep-kids-preview';
import { AamepKidsAthleteView } from './aamep-kids-athlete-view';
import { AamepAbsolutosPreview } from './aamep-absolutos-preview';
import { AamepAbsolutosAthleteView } from './aamep-absolutos-athlete-view';

type Federation = 'ibjjf' | 'aamep';

type IbjjfMode =
    | 'adulto-admin'
    | 'adulto-atleta'
    | 'master-admin'
    | 'master-atleta'
    | 'juvenil-admin'
    | 'juvenil-atleta'
    | 'infantil-admin'
    | 'infantil-atleta';

type AamepMode =
    | 'aamep-adulto-admin'
    | 'aamep-adulto-atleta'
    | 'aamep-juvenil-admin'
    | 'aamep-juvenil-atleta'
    | 'aamep-master-admin'
    | 'aamep-master-atleta'
    | 'aamep-kids-admin'
    | 'aamep-kids-atleta'
    | 'aamep-absolutos-admin'
    | 'aamep-absolutos-atleta';

export function PreviewTabs() {
    const [federation, setFederation] = useState<Federation>('ibjjf');
    const [ibjjfMode, setIbjjfMode] = useState<IbjjfMode>('adulto-admin');
    const [aamepMode, setAamepMode] = useState<AamepMode>('aamep-adulto-admin');

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Federação
                </p>
                <div className="inline-flex rounded-full border bg-background p-1">
                    <FederationButton active={federation === 'ibjjf'} onClick={() => setFederation('ibjjf')}>
                        <BuildingsIcon size={16} weight="duotone" />
                        IBJJF / CBJJ
                    </FederationButton>
                    <FederationButton active={federation === 'aamep'} onClick={() => setFederation('aamep')}>
                        <BuildingsIcon size={16} weight="duotone" />
                        AAMEP
                    </FederationButton>
                </div>
            </div>

            {federation === 'ibjjf' && (
                <>
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Adulto · 18 a 29 anos
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={ibjjfMode === 'adulto-admin'} onClick={() => setIbjjfMode('adulto-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <BarbellIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={ibjjfMode === 'adulto-atleta'} onClick={() => setIbjjfMode('adulto-atleta')}>
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
                            <TabButton active={ibjjfMode === 'master-admin'} onClick={() => setIbjjfMode('master-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <TrophyIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={ibjjfMode === 'master-atleta'} onClick={() => setIbjjfMode('master-atleta')}>
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
                            <TabButton active={ibjjfMode === 'juvenil-admin'} onClick={() => setIbjjfMode('juvenil-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <StudentIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={ibjjfMode === 'juvenil-atleta'} onClick={() => setIbjjfMode('juvenil-atleta')}>
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
                            <TabButton active={ibjjfMode === 'infantil-admin'} onClick={() => setIbjjfMode('infantil-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <BabyIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={ibjjfMode === 'infantil-atleta'} onClick={() => setIbjjfMode('infantil-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <BabyIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="pt-2">
                        {ibjjfMode === 'adulto-admin' && <AdultMalePreview />}
                        {ibjjfMode === 'adulto-atleta' && <AthleteViewPreview />}
                        {ibjjfMode === 'master-admin' && <MasterPreview />}
                        {ibjjfMode === 'master-atleta' && <MasterAthleteView />}
                        {ibjjfMode === 'juvenil-admin' && <JuvenilPreview />}
                        {ibjjfMode === 'juvenil-atleta' && <JuvenilAthleteView />}
                        {ibjjfMode === 'infantil-admin' && <KidsPreview />}
                        {ibjjfMode === 'infantil-atleta' && <KidsAthleteView />}
                    </div>
                </>
            )}

            {federation === 'aamep' && (
                <>
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Adulto · 18 anos ou mais (AAMEP)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={aamepMode === 'aamep-adulto-admin'} onClick={() => setAamepMode('aamep-adulto-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <BarbellIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={aamepMode === 'aamep-adulto-atleta'} onClick={() => setAamepMode('aamep-adulto-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <BarbellIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Juvenil · 14 a 17 anos (AAMEP, até Roxa)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={aamepMode === 'aamep-juvenil-admin'} onClick={() => setAamepMode('aamep-juvenil-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <StudentIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={aamepMode === 'aamep-juvenil-atleta'} onClick={() => setAamepMode('aamep-juvenil-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <StudentIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Master · 30 anos ou mais (AAMEP, só Masculino)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={aamepMode === 'aamep-master-admin'} onClick={() => setAamepMode('aamep-master-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <TrophyIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={aamepMode === 'aamep-master-atleta'} onClick={() => setAamepMode('aamep-master-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <TrophyIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Kids · 6 a 15 anos (AAMEP, faixas simples)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={aamepMode === 'aamep-kids-admin'} onClick={() => setAamepMode('aamep-kids-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <BabyIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={aamepMode === 'aamep-kids-atleta'} onClick={() => setAamepMode('aamep-kids-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <BabyIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Absolutos · Tabela própria (AAMEP)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <TabButton active={aamepMode === 'aamep-absolutos-admin'} onClick={() => setAamepMode('aamep-absolutos-admin')}>
                                <GearIcon size={16} weight="duotone" />
                                <MedalIcon size={16} weight="duotone" />
                                Admin
                            </TabButton>
                            <TabButton active={aamepMode === 'aamep-absolutos-atleta'} onClick={() => setAamepMode('aamep-absolutos-atleta')}>
                                <UserCircleIcon size={16} weight="duotone" />
                                <MedalIcon size={16} weight="duotone" />
                                Atleta
                            </TabButton>
                        </div>
                    </div>

                    <div className="pt-2">
                        {aamepMode === 'aamep-adulto-admin' && <AamepAdultoPreview />}
                        {aamepMode === 'aamep-adulto-atleta' && <AamepAdultoAthleteView />}
                        {aamepMode === 'aamep-juvenil-admin' && <AamepJuvenilPreview />}
                        {aamepMode === 'aamep-juvenil-atleta' && <AamepJuvenilAthleteView />}
                        {aamepMode === 'aamep-master-admin' && <AamepMasterPreview />}
                        {aamepMode === 'aamep-master-atleta' && <AamepMasterAthleteView />}
                        {aamepMode === 'aamep-kids-admin' && <AamepKidsPreview />}
                        {aamepMode === 'aamep-kids-atleta' && <AamepKidsAthleteView />}
                        {aamepMode === 'aamep-absolutos-admin' && <AamepAbsolutosPreview />}
                        {aamepMode === 'aamep-absolutos-atleta' && <AamepAbsolutosAthleteView />}
                    </div>
                </>
            )}
        </div>
    );
}

function FederationButton({
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
                'inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
            )}
        >
            {children}
        </button>
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

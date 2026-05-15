'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UsersIcon, StarIcon, CaretRightIcon, FilePdfIcon, SpinnerIcon } from '@phosphor-icons/react';
import { pdf } from '@react-pdf/renderer';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TeamSummary, getAthletesByTeamAction } from '../../../equipes-actions';
import { TeamAthletesPDF } from './team-athletes-pdf';

interface TeamCardProps {
    team: TeamSummary;
    eventId: string;
    eventTitle: string;
}

export function TeamCard({ team, eventId, eventTitle }: TeamCardProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const athletes = await getAthletesByTeamAction(eventId, team.team_slug);

            const logoUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/logo-white.png`
                : undefined;

            const blob = await pdf(
                <TeamAthletesPDF
                    eventTitle={eventTitle}
                    teamName={team.team_name}
                    masterName={team.master_name}
                    athletes={athletes}
                    logoUrl={logoUrl}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeTeam = team.team_slug.replace(/[^a-z0-9-]/gi, '-');
            a.download = `atletas-${safeTeam}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao gerar PDF de atletas', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Card className={`border transition-all duration-200 hover:shadow-md ${team.is_organizer ? 'border-primary/30 bg-primary/5' : 'bg-background'}`}>
            <CardContent className="p-5 flex items-center gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${team.is_organizer ? 'bg-primary/15' : 'bg-muted/40'}`}>
                    {team.is_organizer
                        ? <StarIcon size={24} weight="duotone" className="text-primary" />
                        : <UsersIcon size={24} weight="duotone" className="text-muted-foreground" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-panel-sm font-semibold truncate">{team.team_name}</span>
                        {team.is_organizer && (
                            <Badge className="text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground border-none">
                                Organizadora
                            </Badge>
                        )}
                    </div>
                    {team.master_name && (
                        <p className="text-panel-sm text-muted-foreground mt-0.5 truncate">
                            Mestre: {team.master_name}
                        </p>
                    )}
                </div>

                {/* Athlete count + actions */}
                <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="text-center">
                        <div className="text-panel-md font-bold font-bold tabular-nums">{team.total_athletes}</div>
                        <div className="text-panel-sm text-muted-foreground">
                            {team.total_athletes === 1 ? 'atleta' : 'atletas'}
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                pill
                                onClick={handleDownloadPdf}
                                disabled={downloading || team.total_athletes === 0}
                                className="h-16 w-16 text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors"
                            >
                                {downloading
                                    ? <SpinnerIcon weight="duotone" className="size-10 animate-spin" />
                                    : <FilePdfIcon weight="duotone" className="size-10" />
                                }
                                <span className="sr-only">Baixar PDF detalhado dos atletas</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Baixar PDF detalhado dos atletas</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild pill className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/equipes/${encodeURIComponent(team.team_slug)}`}>
                                    <CaretRightIcon size={20} weight="duotone" />
                                    <span className="sr-only">Ver atletas de {team.team_name}</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Ver atletas da equipe</TooltipContent>
                    </Tooltip>
                </div>
            </CardContent>
        </Card>
    );
}

import { Clock } from 'lucide-react';

type CronogramaItem = {
    hora: string;
    titulo: string;
    detalhes?: string[];
};

// Conteúdo fixo do MATUPÁ OPEN 3ª Edição (informado pela organização).
const CRONOGRAMA: CronogramaItem[] = [
    {
        hora: '06:40',
        titulo: 'Abertura do portão do Ginásio Municipal para as equipes',
    },
    {
        hora: '07:30',
        titulo: 'Abertura oficial com apresentação da banda',
    },
    {
        hora: '08:30',
        titulo: 'Início das lutas',
        detalhes: ['Pré-mirim', 'Mirim', 'Infantil', 'Infanto-juvenil'],
    },
    {
        hora: '13:00',
        titulo: 'Absolutos e categorias adultas',
        detalhes: [
            'Absoluto Marrom e Preta',
            'Absoluto Azul e Roxa',
            'Absoluto Branca',
            'Juvenil',
            'Adulto',
            'Master',
        ],
    },
];

export function CronogramaMatupa() {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 mb-5">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Cronograma do evento
                </h2>
            </div>

            <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
                {CRONOGRAMA.map((item, i) => (
                    <li key={i} className="relative pl-6">
                        {/* Marcador */}
                        <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-sm" />

                        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-black tabular-nums text-primary">
                                    {item.hora}
                                </span>
                            </div>
                            <p className="font-bold text-foreground leading-snug">{item.titulo}</p>
                            {item.detalhes && item.detalhes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {item.detalhes.map((d) => (
                                        <span
                                            key={d}
                                            className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                                        >
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ol>

            <p className="pt-4 text-xs text-muted-foreground text-center">
                Horários sujeitos a pequenas alterações conforme o andamento do evento.
            </p>
        </div>
    );
}

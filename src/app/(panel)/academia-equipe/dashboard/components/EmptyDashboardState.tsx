import Link from 'next/link';
import { ArrowRight, Zap, Target } from 'lucide-react';

export function EmptyDashboardState() {
    return (
        <div className="relative w-full min-h-[500px] mt-8 flex flex-col md:flex-row overflow-hidden border border-border bg-background rounded-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out shadow-sm">
            {/* Lado Esquerdo - Tipografia Brutalista e Direta */}
            <div className="flex-1 p-8 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border relative overflow-hidden">
                {/* Background Pattern Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg space-y-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center space-x-2 bg-foreground text-background px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider shadow-sm rounded-full">
                            <Zap className="h-4 w-4 fill-current text-white/90" />
                            <span>Dashboard Vazio</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.9] text-foreground">
                            O PALCO ESTÁ <br className="hidden md:block" />
                            <span className="text-muted-foreground/30">ESPERANDO.</span>
                        </h2>
                        <div className="pt-6 border-t-[3px] border-foreground/10 mt-8">
                            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-[90%] leading-relaxed">
                                Nenhum evento registrado ainda. Chegou o momento de organizar seu primeiro campeonato e transformar o esporte na sua região.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lado Direito - Área de Ação Radical (Arredondada / Premium) */}
            <div className="flex-1 bg-muted/30 p-8 md:p-16 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-primary/5 transition-colors duration-700 group-hover:bg-primary/10" />

                <Link prefetch={true} href="/academia-equipe/dashboard/eventos/novo" className="relative z-10 w-full max-w-sm group/btn cursor-pointer block outline-none">
                    <div className="bg-background border-2 border-border p-8 md:p-10 transition-all duration-500 hover:-translate-y-2 
                        rounded-xl shadow-xl hover:shadow-2xl flex flex-col items-center text-center space-y-8 relative overflow-hidden">

                        {/* Hover reveal glow */}
                        <div className="absolute w-[200%] h-[200%] bg-primary/10 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                        <div className="size-24 bg-foreground group-hover/btn:bg-primary transition-all flex items-center justify-center text-background transform rotate-3 group-hover/btn:-rotate-6 duration-500 ease-out relative z-10 shadow-lg rounded-xl">
                            <div className="absolute inset-2 border border-background/20 rounded-lg" />
                            <Target className="h-10 w-10" strokeWidth={1.5} />
                        </div>

                        <div className="space-y-4 relative z-10">
                            <h3 className="text-3xl font-extrabold uppercase tracking-tight text-foreground leading-none">
                                Lançar Evento
                            </h3>
                            <p className="text-sm font-semibold text-muted-foreground px-4">
                                Configure categorias, integre pagamentos Asaass e monte chaves em 5 minutos.
                            </p>
                        </div>

                        <div className="h-14 w-full bg-foreground text-background group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-all duration-300 flex items-center justify-center font-bold uppercase tracking-widest text-sm gap-3 mt-4 relative overflow-hidden rounded-full">
                            <span className="relative z-10">Começar Agora</span>
                            <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform duration-300 relative z-10" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}

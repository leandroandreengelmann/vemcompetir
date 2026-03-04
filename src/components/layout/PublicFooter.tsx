import Link from "next/link";
import { Instagram, Youtube, Mail } from "lucide-react";

export function PublicFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-primary text-primary-foreground border-t border-border/10">
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col gap-12 min-h-[250px] justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link href="/" className="inline-block">
                            <img
                                src="/logo-camaleao-white.png"
                                alt="COMPETIR"
                                className="h-10 w-auto object-contain"
                            />
                        </Link>
                        <p className="text-body text-primary-foreground/60 max-w-sm leading-relaxed">
                            A plataforma definitiva para gestão de eventos e atletas. Transformando a experiência do verdadeiro competidor.
                        </p>
                        <div className="flex items-center gap-4">
                            <Link href="#" className="p-2.5 rounded-full border border-primary-foreground/10 hover:bg-primary-foreground/5 transition-colors">
                                <Instagram className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="p-2.5 rounded-full border border-primary-foreground/10 hover:bg-primary-foreground/5 transition-colors">
                                <Youtube className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>

                    {/* Links - Institucional */}
                    <div className="space-y-6">
                        <h4 className="text-h3 font-semibold uppercase tracking-wider">Institucional</h4>
                        <ul className="space-y-4">
                            <li><Link href="/" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Página Inicial</Link></li>
                            <li><Link href="/sobre" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Sobre Nós</Link></li>
                        </ul>
                    </div>

                    {/* Links - Acesso */}
                    <div className="space-y-6">
                        <h4 className="text-h3 font-semibold uppercase tracking-wider">Portais</h4>
                        <ul className="space-y-4">
                            <li><Link href="/atleta/dashboard" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Portal do Atleta</Link></li>
                            <li><Link href="/academia-equipe/dashboard" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Portal da Academia</Link></li>
                            <li><Link href="/chaveamento" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Chaveamento</Link></li>
                        </ul>
                    </div>

                    {/* Contato */}
                    <div className="space-y-6">
                        <h4 className="text-h3 font-semibold uppercase tracking-wider">Suporte</h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-body text-primary-foreground/50">
                                <Mail className="h-5 w-5" />
                                <span>contato@competir.com.br</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-10 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-caption font-medium text-primary-foreground/30 uppercase tracking-widest">
                        © {currentYear} COMPETIR. Todos os direitos reservados.
                    </p>
                    <div className="flex gap-6 items-center">
                        <span className="text-[11px] font-bold text-primary-foreground/20 uppercase tracking-widest">FORJADO NO TATAME</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

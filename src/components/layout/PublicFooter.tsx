import Link from "next/link";
import { Instagram, Youtube } from "lucide-react";

export function PublicFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-primary text-primary-foreground border-t border-border/10">
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col gap-12 min-h-[250px] justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
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

                    {/* Legal */}
                    <div className="space-y-6">
                        <h4 className="text-h3 font-semibold uppercase tracking-wider">Legal</h4>
                        <ul className="space-y-4">
                            <li><Link href="/privacidade" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Política de Privacidade</Link></li>
                            <li><Link href="/termos-de-uso" className="text-body text-primary-foreground/50 hover:text-primary-foreground transition-colors">Termos de Uso</Link></li>
                        </ul>
                    </div>

                    {/* Contato */}
                    <div className="space-y-6">
                        <h4 className="text-h3 font-semibold uppercase tracking-wider">Suporte</h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-body text-primary-foreground/50">
                                <Link
                                    href="https://wa.me/5566997249532"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 hover:text-primary-foreground transition-colors"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-5 w-5 fill-current"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    <span>(66) 99724-9532</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-10 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-caption font-medium text-primary-foreground/30 uppercase tracking-widest">
                        © {currentYear} COMPETIR. Todos os direitos reservados.
                    </p>
                    <div className="flex flex-wrap gap-6 items-center">
                        <Link href="/privacidade" className="text-[11px] text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors uppercase tracking-widest">Privacidade</Link>
                        <Link href="/termos-de-uso" className="text-[11px] text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors uppercase tracking-widest">Termos de Uso</Link>
                        <span className="text-[11px] font-bold text-primary-foreground/20 uppercase tracking-widest">FORJADO NO TATAME</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

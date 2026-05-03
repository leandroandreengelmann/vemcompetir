import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getPublishedEvents } from "./eventos/_data/events";
import { EventCard } from "./eventos/_components/event-card";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const activeRole = profile?.role || user.user_metadata?.role;

    if (activeRole) {
      const roleRoutes: Record<string, string> = {
        admin_geral: '/admin/dashboard',
        'academia/equipe': '/academia-equipe/dashboard',
        academia: '/academia-equipe/dashboard',
        organizador: '/organizador/dashboard',
        atleta: '/atleta/dashboard'
      };

      const targetRoute = roleRoutes[activeRole as string];
      if (targetRoute) {
        redirect(targetRoute);
      }
    }
  }

  const events = await getPublishedEvents();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <PublicHeader />

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground pt-[calc(4rem+1.5rem)] pb-10 sm:pt-[calc(var(--header-height,90px)+4rem)] sm:pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-3 sm:space-y-6">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] text-primary-foreground/40">
              Próximos Eventos
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight sm:tracking-tighter leading-tight sm:leading-[1.05]">
              Encontre sua próxima competição.
            </h1>
            <p className="text-sm sm:text-lg text-primary-foreground/50 max-w-xl leading-relaxed">
              Confira as próximas competições e garanta sua inscrição nos maiores eventos de combate da região.
            </p>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 md:py-24 w-full">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center border-2 border-dashed border-muted rounded-[7px]">
            <p className="text-sm sm:text-base text-muted-foreground font-medium">Nenhum evento publicado no momento.</p>
            <p className="text-caption text-muted-foreground/60 mt-1">Fique de olho, novas competições surgem em breve!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

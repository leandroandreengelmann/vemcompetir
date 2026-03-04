import { type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Rotas que NÃO devem ser logadas
const EXCLUDED_PATHS = ['/api/', '/_next/', '/favicon', '/robots', '/sitemap'];

// Deduplicação em memória simples: session+path -> timestamp (evita spam)
const recentLogs = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000; // 1 minuto

function shouldSkip(path: string): boolean {
    return EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
}

function isDuplicate(key: string): boolean {
    const last = recentLogs.get(key);
    if (!last) return false;
    return Date.now() - last < DEDUP_WINDOW_MS;
}

/**
 * Loga um page view a partir do middleware.
 * Fire-and-forget — nunca bloqueia o request.
 */
export async function logPageView(request: NextRequest): Promise<void> {
    const path = request.nextUrl.pathname;
    if (shouldSkip(path)) return;

    // Extrai identidade do usuário a partir do cookie de sessão do Supabase
    const userId = request.cookies.get('sb-access-token')?.value
        ? undefined // será resolvido via user_id via cookie token abaixo
        : undefined;

    // Lê o session_id do cookie ou gera um temporário baseado no IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const sessionId = request.cookies.get('session_id')?.value ?? ip;

    const dedupKey = `${sessionId}::${path}`;
    if (isDuplicate(dedupKey)) return;
    recentLogs.set(dedupKey, Date.now());

    // Geolocalização via headers do Vercel/Cloudflare
    const region =
        request.headers.get('x-vercel-ip-city') ??
        request.headers.get('cf-ipcity') ??
        request.headers.get('x-vercel-ip-country-region') ??
        null;

    const referrer = request.headers.get('referer') ?? null;

    const adminClient = createAdminClient();
    await adminClient.from('site_analytics').insert({
        session_id: sessionId,
        user_id: userId ?? null,
        event_type: 'page_view',
        path,
        region,
        referrer,
        metadata: {
            ip,
            ua: request.headers.get('user-agent'),
        },
    });
}

/**
 * Loga um clique/interação com um evento específico.
 * Chamado de Server Actions ou API Routes.
 */
export async function logEventClick(params: {
    eventId: string;
    path: string;
    userId?: string;
    sessionId: string;
    region?: string;
}): Promise<void> {
    const adminClient = createAdminClient();
    await adminClient.from('site_analytics').insert({
        session_id: params.sessionId,
        user_id: params.userId ?? null,
        event_type: 'event_click',
        path: params.path,
        event_id: params.eventId,
        region: params.region ?? null,
    });
}

/**
 * Gera a URL pública da imagem do Supabase Storage.
 * Arquivo separado para evitar importar código de servidor em Client Components.
 */
export function getEventCoverUrl(path: string | null): string | null {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${path}`;
}

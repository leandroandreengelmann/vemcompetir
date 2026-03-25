/**
 * In-memory rate limiter for API routes.
 * Works per instance — adequate for single-instance / Vercel deployments.
 *
 * Usage:
 *   const allowed = rateLimit(userId, { limit: 5, windowMs: 5 * 60 * 1000 });
 *   if (!allowed) return NextResponse.json({ error: '...' }, { status: 429 });
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes to avoid memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * @param key     - unique identifier (e.g. user_id or ip)
 * @param limit   - max requests in the window
 * @param windowMs - window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (entry.count >= limit) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * Fixed-window counters in memory, keyed by client IP and by `sub`.
 *
 * Instance-local on purpose. Max-instances is 2, so the real ceiling is twice
 * what is configured here -- which is fine, because this is a brake on scripted
 * key-guessing, not a billing control. The thing that actually stops a shared
 * key is the device cap, and Gumroad counts that centrally.
 */
export interface RateDecision {
    ok: boolean;
    /** Seconds until the window rolls, when ok is false. */
    retryAfter: number;
}

interface Window { count: number; resetAt: number }

/** Keeps the map from growing without bound when every request has a new IP. */
const MAX_WINDOWS = 20_000;

export interface Limiter {
    hit(bucket: string, limit: number, windowMs: number): RateDecision;
    /** Test seam: forget everything. */
    reset(): void;
    size(): number;
}

export function createLimiter(now: () => number): Limiter {
    const windows = new Map<string, Window>();

    const sweep = (t: number): void => {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
    };

    return {
        hit(bucket, limit, windowMs) {
            const t = now();
            if (windows.size >= MAX_WINDOWS) sweep(t);

            const found = windows.get(bucket);
            const w = found && found.resetAt > t ? found : { count: 0, resetAt: t + windowMs };
            w.count += 1;
            windows.set(bucket, w);

            if (w.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((w.resetAt - t) / 1000)) };
            return { ok: true, retryAfter: 0 };
        },
        reset() { windows.clear(); },
        size() { return windows.size; },
    };
}

export const LIMITS = {
    activateIp: { limit: 5, windowMs: 60_000 },
    activateSub: { limit: 3, windowMs: 3_600_000 },
    refreshIp: { limit: 30, windowMs: 60_000 },
} as const;

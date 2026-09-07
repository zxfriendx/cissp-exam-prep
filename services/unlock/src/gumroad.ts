/**
 * The one call this service makes to the outside world.
 *
 * Gumroad's `decrement_uses_count` needs an OAuth token; `verify` does not. So
 * there is no "increment, then put it back if the buyer is over their cap" --
 * an increment is final. Activation therefore verifies TWICE: once to read
 * `uses`, and again with the increment only if the first read came in under the
 * cap. Refresh verifies once and never increments. See app.ts.
 */
import type { GumroadVerify } from './types.ts';

/** Thrown when Gumroad could not be reached or did not answer in a usable way. */
export class GumroadUnavailable extends Error {}

const TIMEOUT_MS = 8_000;

const bool = (v: unknown): boolean => v === true || v === 'true';

/** `uses` is top level in Gumroad's response; the flags live on `purchase`. */
function readFlags(body: Record<string, unknown>): Omit<GumroadVerify, 'ok' | 'raw'> {
    const purchase = (body.purchase ?? {}) as Record<string, unknown>;
    const uses = Number(body.uses);
    return {
        uses: Number.isFinite(uses) && uses >= 0 ? uses : 0,
        refunded: bool(purchase.refunded) || bool(body.refunded),
        chargebacked: bool(purchase.chargebacked) || bool(purchase.disputed) || bool(body.chargebacked),
        disabled: bool(purchase.disabled) || bool(body.disabled),
    };
}

export interface GumroadDeps {
    fetch: typeof globalThis.fetch;
    env: Record<string, string | undefined>;
}

export interface Gumroad {
    verify(key: string, opts: { increment: boolean }): Promise<GumroadVerify>;
}

export function createGumroad({ fetch, env }: GumroadDeps): Gumroad {
    const base = (env.GUMROAD_API_BASE ?? 'https://api.gumroad.com').replace(/\/+$/, '');
    const productId = env.GUMROAD_PRODUCT_ID ?? '';

    return {
        async verify(key, { increment }) {
            const form = new URLSearchParams({
                product_id: productId,
                license_key: key,
                increment_uses_count: increment ? 'true' : 'false',
            });

            let res: Response;
            try {
                res = await fetch(`${base}/v2/licenses/verify`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
                    body: form.toString(),
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                });
            } catch (cause) {
                throw new GumroadUnavailable(`gumroad request failed: ${(cause as Error)?.message ?? cause}`, { cause });
            }

            const text = await res.text().catch(() => '');
            let body: Record<string, unknown> | null = null;
            try {
                const parsed: unknown = JSON.parse(text);
                if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
            } catch { /* handled below */ }

            // A rejection is anything Gumroad answered with `success` not true --
            // the shape of the rest is not parsed. The live API returned
            // {success:false,error:{code:"not_found"}} where the docs promise
            // {success:false,message:"..."}; reading either one specifically is
            // how you get a 500 the next time they change it.
            if (!body || typeof body.success !== 'boolean') {
                throw new GumroadUnavailable(`gumroad HTTP ${res.status}, unparseable body: ${text.slice(0, 200)}`);
            }

            return { ok: body.success === true, ...readFlags(body), raw: body };
        },
    };
}

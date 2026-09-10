/**
 * The three calls the app makes to the unlock service.
 *
 * Everything here returns a value; nothing throws. A caller only ever has to
 * branch on `ok`, and the failure it gets back is always one of the protocol's
 * codes — which matters because `isTerminal(code)` decides whether the cached
 * bank gets wiped, and a DNS failure must never be able to reach that branch.
 * Network trouble, a timeout, an HTML error page from a proxy and an
 * unrecognised body all land on `gumroad_unavailable`.
 *
 * CONFIGURATION
 * -------------
 * NEXT_PUBLIC_UNLOCK_URL is the service's origin, e.g.
 * https://unlock.securepathdigital.net. It is inlined at build time. The
 * committed default is EMPTY, and empty means "not configured": the calls below
 * refuse rather than fetching a relative path off learn.securepathdigital.net
 * and getting the static export's 404 page back as HTML. Ask
 * isUnlockConfigured() and say so in the UI.
 *
 * `node --test` imports this file directly; see the note at the top of
 * src/lib/bank.ts.
 */
import { LICENCE_KEY_RE, normaliseKey } from '@/lib/unlock-protocol';
import type {
    ActivateRequest,
    PaidBank,
    RefreshRequest,
    UnlockErr,
    UnlockErrorCode,
    UnlockOk,
    UnlockResponse,
} from '@/lib/unlock-protocol';

/** Trailing slashes stripped so `${UNLOCK_URL}/v1/activate` cannot double up. */
export const UNLOCK_URL: string = (process.env.NEXT_PUBLIC_UNLOCK_URL ?? '').replace(/\/+$/, '');

export const isUnlockConfigured = (baseUrl: string = UNLOCK_URL): boolean => baseUrl !== '';

/**
 * Long enough for a cold start on a small host plus a Gumroad round trip,
 * short enough that a buyer on a bad connection gets an answer rather than a
 * spinner. The bank download gets the same budget: it is 2.3 MB, but it is one
 * response and the alternative to a timeout is an unbounded wait.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * How the bank request carries the token. The service is a separate program;
 * if it reads the token from somewhere else, this is the one line to change.
 */
const authHeader = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

export interface CallOptions {
    /** Injected by tests. Defaults to the global fetch. */
    fetchImpl?: typeof fetch;
    /** Overrides NEXT_PUBLIC_UNLOCK_URL — a local service during development. */
    baseUrl?: string;
    timeoutMs?: number;
    /** The caller's own cancellation, e.g. a component unmounting. */
    signal?: AbortSignal;
}

const KNOWN_CODES: readonly UnlockErrorCode[] = [
    'invalid_key_format',
    'not_found',
    'refunded',
    'chargebacked',
    'disabled',
    'device_cap',
    'denied',
    'bad_token',
    'token_expired',
    'rate_limited',
    'gumroad_unavailable',
];

const unreachable: UnlockErr = { ok: false, code: 'gumroad_unavailable' };

type Reply =
    | { kind: 'reply'; status: number; headers: Headers; body: unknown }
    | { kind: 'unreachable' };

async function request(path: string, init: RequestInit, opts: CallOptions): Promise<Reply> {
    // Stripped again here: UNLOCK_URL is already clean, but an injected baseUrl
    // is whatever the caller had lying around, and `${base}//v1/activate` is a
    // 404 that looks exactly like a service being down.
    const baseUrl = (opts.baseUrl ?? UNLOCK_URL).replace(/\/+$/, '');
    if (!isUnlockConfigured(baseUrl)) return { kind: 'unreachable' };

    const doFetch = opts.fetchImpl ?? globalThis.fetch;
    if (typeof doFetch !== 'function') return { kind: 'unreachable' };

    // A timeout the caller cannot forget to clear, and one the caller's own
    // signal can still cut short.
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);

    try {
        const res = await doFetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
        let body: unknown = null;
        try {
            body = await res.json();
        } catch {
            // A proxy's HTML, an empty 502, a truncated stream. `body` stays
            // null and unwrap() falls through to gumroad_unavailable.
        }
        return { kind: 'reply', status: res.status, headers: res.headers, body };
    } catch {
        return { kind: 'unreachable' };
    } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener('abort', onAbort);
    }
}

const isUnlockOk = (v: unknown): v is UnlockOk => {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return o.ok === true
        && typeof o.token === 'string'
        && typeof o.exp === 'number'
        && typeof o.edition === 'string';
};

const isUnlockErr = (v: unknown): v is UnlockErr => {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    // An unrecognised code is treated as no code at all. The alternative is
    // letting a future service spelling reach isTerminal() and wipe a buyer's
    // bank on a string this build has never heard of.
    return o.ok === false && KNOWN_CODES.includes(o.code as UnlockErrorCode);
};

const retryAfterOf = (headers: Headers): number | undefined => {
    const raw = headers.get('retry-after');
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function unwrap(reply: Reply): UnlockResponse {
    if (reply.kind === 'unreachable') return unreachable;
    if (isUnlockOk(reply.body)) return reply.body;
    if (isUnlockErr(reply.body)) return reply.body;
    if (reply.status === 429) return { ok: false, code: 'rate_limited', retryAfter: retryAfterOf(reply.headers) };
    return unreachable;
}

const jsonPost = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
});

/**
 * First unlock on this device. Increments the licence's use count, so it is
 * only ever called from a deliberate action — never from a mount effect.
 *
 * The format check happens here rather than at the service so a mistyped key
 * costs no round trip and, more to the point, cannot burn one of the licence's
 * device activations on a typo.
 */
export async function activate(rawKey: string, opts: CallOptions = {}): Promise<UnlockResponse> {
    const key = normaliseKey(rawKey);
    if (!LICENCE_KEY_RE.test(key)) return { ok: false, code: 'invalid_key_format' };
    const body: ActivateRequest = { key };
    return unwrap(await request('/v1/activate', jsonPost(body), opts));
}

/** Re-check a licence we already hold a token for. Never increments the count. */
export async function refresh(rawKey: string, token: string, opts: CallOptions = {}): Promise<UnlockResponse> {
    const key = normaliseKey(rawKey);
    if (!LICENCE_KEY_RE.test(key)) return { ok: false, code: 'invalid_key_format' };
    if (!token) return { ok: false, code: 'bad_token' };
    const body: RefreshRequest = { key, token };
    return unwrap(await request('/v1/refresh', jsonPost(body), opts));
}

export type BankResult = { ok: true; bank: PaidBank } | UnlockErr;

/**
 * The 750 questions. Cached in IndexedDB by the caller, keyed on `edition`,
 * which is also this endpoint's ETag — so a client that already holds the
 * current edition never asks for this at all.
 */
export async function fetchBank(token: string, opts: CallOptions = {}): Promise<BankResult> {
    if (!token) return { ok: false, code: 'bad_token' };
    const reply = await request('/v1/bank', { method: 'GET', headers: authHeader(token) }, opts);
    if (reply.kind === 'unreachable') return unreachable;

    if (reply.status >= 200 && reply.status < 300) {
        const body = reply.body;
        if (body && typeof body === 'object') {
            const b = body as Partial<PaidBank>;
            if (b.schema === 1 && typeof b.edition === 'string' && Array.isArray(b.domains)) {
                return { ok: true, bank: body as PaidBank };
            }
        }
        // A 200 whose body is not a bank is the service being broken, not the
        // buyer being refused: nothing terminal, nothing wiped.
        return unreachable;
    }

    const err = unwrap(reply);
    return err.ok ? unreachable : err;
}

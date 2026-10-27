/**
 * The wire contract between the app and the unlock service.
 *
 * Owned by the app, imported by the service with a relative path. It is
 * type-only on purpose: `import type` is erased before Node runs the service's
 * TypeScript, so the service needs no bundler and no path-alias resolution to
 * share these definitions, and the two halves cannot drift.
 *
 * Nothing here is secret. The token's payload is base64url, not encrypted — the
 * client reads `exp` and `ed` out of it to decide when to refresh. Only the
 * service can verify the signature, which is the only property that matters.
 */
import type { Question, Stimulus } from '@/lib/content';

/** POST /v1/activate — first unlock. Increments the licence's use count, once. */
export interface ActivateRequest { key: string }

/** POST /v1/refresh — re-check an existing entitlement. Never increments. */
export interface RefreshRequest { key: string; token: string }

export interface UnlockOk {
    ok: true;
    /** `<base64url payload>.<base64url HMAC-SHA256>` */
    token: string;
    /** Unix seconds. The client refreshes well before this and hard-locks after. */
    exp: number;
    /** The paid bank edition this token is good for; also the /v1/bank ETag. */
    edition: string;
    /** Device activations used and allowed, when Gumroad reported them. */
    uses?: number;
    cap?: number;
}

/**
 * Every way an unlock can fail, as a code the UI turns into a sentence.
 * `gumroad_unavailable` is the only one a client should retry on its own.
 */
export type UnlockErrorCode =
    | 'invalid_key_format'
    | 'not_found'
    | 'refunded'
    | 'chargebacked'
    | 'disabled'
    | 'device_cap'
    | 'denied'
    | 'bad_token'
    | 'token_expired'
    | 'rate_limited'
    | 'gumroad_unavailable';

export interface UnlockErr {
    ok: false;
    code: UnlockErrorCode;
    /** Seconds, on `rate_limited`. */
    retryAfter?: number;
    uses?: number;
    cap?: number;
}

export type UnlockResponse = UnlockOk | UnlockErr;

/** Definitive rejections: wipe the cached bank and token rather than retrying. */
export const TERMINAL_CODES: readonly UnlockErrorCode[] =
    ['not_found', 'refunded', 'chargebacked', 'disabled', 'denied'] as const;

export const isTerminal = (code: UnlockErrorCode): boolean => TERMINAL_CODES.includes(code);

/**
 * GET /v1/bank — the paid examination. Same shape as the free preview's
 * `domains[]`, so the client can swap one for the other without the components
 * knowing which tier they are rendering.
 */
export interface PaidBank {
    schema: 1;
    edition: string;
    domains: {
        id: string;
        title: string;
        caseStudy: string;
        stimuli: Stimulus[];
        questions: Question[];
    }[];
}

/** GET /healthz — what the service is holding, for deploy checks. */
export interface HealthResponse {
    ok: boolean;
    edition: string;
    items: number;
    stimuli: number;
    kid: string;
}

/** A licence key as Gumroad issues them: 8-4-4-4-... uppercase hex groups. */
export const LICENCE_KEY_RE = /^[A-F0-9]{8}(-[A-F0-9]{8}){3}$/;

export const normaliseKey = (raw: string): string => raw.trim().toUpperCase();

/* ------------------------------------------------------------------ mailing list
 * The free sample is 160 questions. Since 2026-10-27, 40 of them (5 per domain) are
 * open and the other 120 open when the visitor joins the mailing list. The service
 * stores the address; the app records locally that this browser has joined.
 */

/**
 * The consent sentence version shown beside the checkbox. Bump it whenever the
 * wording changes, so every stored consent can be traced to the exact text the
 * person agreed to. The wording itself lives with the form in the app.
 */
export const CONSENT_VERSION = '2026-10-27';

/** POST /v1/subscribe — join the list. Idempotent per address. */
export interface SubscribeRequest {
    email: string;
    /** The ticked consent box. Anything but `true` is refused. */
    consent: boolean;
    consentVersion: string;
    /** Where the form was, e.g. 'practice-gate'. */
    source?: string;
    /** utm_* values from the landing URL, if any. */
    utm?: Record<string, string>;
    /** Honeypot. A person never fills it; a bot usually does. */
    website?: string;
}

export interface SubscribeOk { ok: true }

export type SubscribeErrorCode =
    | 'invalid_email'
    | 'consent_required'
    | 'rate_limited'
    | 'store_unavailable';

export interface SubscribeErr {
    ok: false;
    code: SubscribeErrorCode;
    /** Seconds, on `rate_limited`. */
    retryAfter?: number;
}

export type SubscribeResponse = SubscribeOk | SubscribeErr;

/**
 * What the client knows about a licence, and what it says about it.
 *
 * Pure: no fetch, no storage, no React. Everything here is a function of a
 * snapshot and a clock, which is what makes the state machine testable and what
 * keeps the awkward cases (expired on a plane, refunded three weeks later,
 * service down during a first unlock) from being decided inside a component.
 *
 * THE CLIENT NEVER AUTHORISES ANYTHING
 * ------------------------------------
 * The token is base64url, not encrypted, and only the service holds the key
 * that signs it. Reading `exp` and `ed` out of it tells the client WHEN to ask
 * again and WHICH bank it is holding — nothing here is a permission check, and
 * a forged token buys nothing, because the bank itself only ever arrives from
 * the service.
 *
 * Times in this module are Unix SECONDS, matching the protocol. The store
 * converts at its edges rather than letting two units meet in here.
 *
 * `node --test` imports this file directly; see the note at the top of
 * src/lib/bank.ts.
 */
import { isTerminal } from '@/lib/unlock-protocol';
import type { UnlockErr, UnlockErrorCode } from '@/lib/unlock-protocol';

export const SECONDS_PER_DAY = 86_400;

/**
 * How old a token has to be before the client starts re-checking it. Tokens are
 * issued for about a month, so ten days leaves three chances to notice a refund
 * before the entitlement lapses on its own, and leaves a reader who never comes
 * back online inside that month unbothered.
 */
export const REFRESH_AFTER_SECONDS = 10 * SECONDS_PER_DAY;

/** And then at most once a day, so a tab left open does not poll the service. */
export const MIN_REFRESH_INTERVAL_SECONDS = SECONDS_PER_DAY;

/**
 * Used to date a token whose payload carries no `iat`. Matches TOKEN_TTL in
 * services/unlock/src/app.ts, which is what actually issues them.
 */
export const ASSUMED_TOKEN_TTL_SECONDS = 30 * SECONDS_PER_DAY;

/**
 * /v1/refresh accepts an already-expired token for this long (REFRESH_GRACE in
 * services/unlock/src/app.ts). It exists so someone who opened the app after a
 * month offline gets their questions back by themselves instead of being sent
 * to find their licence key, so the client has to actually TRY inside it.
 * `/v1/bank` allows no grace at all, which is why an expired token still reads
 * as `expired` and serves the free preview until the refresh lands.
 */
export const REFRESH_GRACE_SECONDS = 90 * SECONDS_PER_DAY;

/** The one number a buyer can act on. There is no support mailbox yet. */
export const SUPPORT_PHONE = '(614) 887-8772';

/**
 * locked        no working licence on this device
 * activating    a key is being checked right now
 * unlocked      paid, token good, nothing to do
 * refresh_due   paid and working, but old enough that we should re-check
 * expired       the token ran out; re-entering the key renews it
 * revoked       the licence worked once and the service has since refused it
 * unavailable   we cannot tell, because the service could not be reached
 */
export type EntitlementStatus =
    | 'locked'
    | 'activating'
    | 'unlocked'
    | 'refresh_due'
    | 'expired'
    | 'revoked'
    | 'unavailable';

/** The fields of the token payload the client reads. It reads no others. */
export interface TokenPayload {
    /** Unix seconds; when the service stops accepting this token. */
    exp?: number;
    /** Unix seconds; when it was issued. */
    iat?: number;
    /** The paid bank edition the token is good for. */
    ed?: string;
}

/**
 * The payload half of `<base64url payload>.<base64url HMAC>`, or null if it is
 * not readable. Never throws: a truncated token in localStorage is a thing that
 * happens, and it must degrade to "ask again", not to a blank page.
 */
export function decodeTokenPayload(token: string | null | undefined): TokenPayload | null {
    if (!token) return null;
    const head = token.split('.')[0];
    if (!head) return null;
    try {
        const b64 = head.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        return value as TokenPayload;
    } catch {
        return null;
    }
}

/**
 * Is it time to ask the service about this licence again?
 *
 * All four arguments are Unix seconds. `lastAttempt` is the last time we ASKED,
 * successful or not — rate-limiting on successes alone would let a service that
 * is answering 500s be hammered once per mount.
 */
export function shouldRefresh(
    now: number,
    iat: number | null | undefined,
    exp: number | null | undefined,
    lastAttempt?: number | null,
): boolean {
    if (!exp) return false;
    // Past the grace window the service will not take the token either; only a
    // fresh activation helps, and asking anyway just burns a request.
    if (now >= exp + REFRESH_GRACE_SECONDS) return false;

    const askedRecently =
        lastAttempt != null && now - lastAttempt < MIN_REFRESH_INTERVAL_SECONDS;

    // Expired but inside the grace window: re-checking is the ONE thing that
    // fixes it, so the age rule does not apply — try, once a day.
    if (now >= exp) return !askedRecently;

    const issued = iat ?? exp - ASSUMED_TOKEN_TTL_SECONDS;
    if (now - issued < REFRESH_AFTER_SECONDS) return false;
    return !askedRecently;
}

/** Everything the state machine reads. Times are Unix seconds. */
export interface EntitlementSnapshot {
    token?: string | null;
    exp?: number | null;
    iat?: number | null;
    /** When the licence last activated successfully. Survives a revocation as history. */
    activatedAt?: number | null;
    /** Last time the service was asked anything, successful or not. */
    lastAttempt?: number | null;
    /** True while an activate call is in flight. */
    activating?: boolean;
    /** The last code the service returned, or null after a success. */
    lastError?: UnlockErrorCode | null;
}

export function statusFor(snapshot: EntitlementSnapshot, now: number): EntitlementStatus {
    if (snapshot.activating) return 'activating';

    const rejected = snapshot.lastError != null && isTerminal(snapshot.lastError);

    if (!snapshot.token) {
        // A licence that worked once and has since been refused is a different
        // story from a key that never worked, and the page tells it differently:
        // one asks the buyer to call, the other asks them to check their typing.
        if (rejected) return snapshot.activatedAt ? 'revoked' : 'locked';
        // "We could not tell" is not "you have not bought it".
        return snapshot.lastError === 'gumroad_unavailable' ? 'unavailable' : 'locked';
    }

    if (rejected) return 'revoked';
    if (!snapshot.exp || now >= snapshot.exp) return 'expired';
    if (shouldRefresh(now, snapshot.iat, snapshot.exp, snapshot.lastAttempt)) return 'refresh_due';

    // Everything transient falls through to here on purpose. A rate limit, a
    // 500, a plane with no wifi: while the token is inside its window the
    // reader keeps their questions.
    return 'unlocked';
}

/** Both of these serve the paid bank; `refresh_due` just also re-checks in the background. */
export const isEntitled = (status: EntitlementStatus): boolean =>
    status === 'unlocked' || status === 'refresh_due';

/**
 * Should this device still be shown the paid questions?
 *
 * Wider than isEntitled() by exactly the refresh grace. An expired token is not
 * a revoked one: the service will still re-check it for ninety days, on the
 * grounds that someone who was offline for a month has not stopped owning the
 * books. Taking their questions away the moment the token lapses, and handing
 * them back thirty seconds later when the background refresh lands, would be
 * both rude and pointless. Past the grace there is nothing left to recover from
 * and the free preview comes back until they enter their key again.
 */
export function mayServePaidBank(snapshot: EntitlementSnapshot, now: number): boolean {
    if (!snapshot.token) return false;
    const status = statusFor(snapshot, now);
    if (status === 'expired') {
        return snapshot.exp != null && now < snapshot.exp + REFRESH_GRACE_SECONDS;
    }
    return isEntitled(status);
}

/**
 * What we say out loud. Plain sentences, one fact and one action each, and a
 * phone number wherever a person has to be involved — bill@securepathdigital.net
 * does not exist yet, so there is no mailto: anywhere in this app.
 */
const MESSAGES: Record<UnlockErrorCode, string> = {
    invalid_key_format:
        `That does not look like a licence key. It is four groups of eight characters separated by dashes. ` +
        `Copy it from your Gumroad receipt rather than typing it.`,
    not_found:
        `No purchase matches that key. It is easy to lose a character copying it, so check it against your ` +
        `Gumroad receipt. If it still will not take, call ${SUPPORT_PHONE}.`,
    refunded:
        `This purchase was refunded, so the key stopped working. Buy the books again to get the questions ` +
        `back, or call ${SUPPORT_PHONE} if that is not what you expected.`,
    chargebacked:
        `The payment for this key was reversed, so it no longer works. Call ${SUPPORT_PHONE} and we will sort it out.`,
    disabled:
        `This key has been switched off. Call ${SUPPORT_PHONE} and we will tell you why and put it right.`,
    // No number here on purpose. The cap is DEVICE_CAP in the unlock service and
    // it defaults to four, not five; the service reports the real one on the
    // rejection, and messageForError() uses it. Inventing a figure here is how
    // a page ends up contradicting the thing it is describing.
    device_cap:
        `This key is already on every device it covers. Call ${SUPPORT_PHONE} and we'll free one.`,
    denied:
        `This key cannot be used here. Call ${SUPPORT_PHONE} and we will look into it.`,
    bad_token:
        `This device's unlock record is damaged. Enter your key again and it will be rebuilt.`,
    token_expired:
        `This device's unlock has run out. Enter your key again to renew it — renewing does not use up ` +
        `another device.`,
    rate_limited:
        `Too many tries in a row. Wait a minute and try again.`,
    gumroad_unavailable:
        `We could not reach the licence check just now. If you are already unlocked nothing has changed; ` +
        `if you are not, try again in a few minutes.`,
};

export const messageFor = (code: UnlockErrorCode): string => MESSAGES[code];

/**
 * The same sentence, with the numbers the service actually reported. The device
 * cap and the retry delay are the two the buyer can act on, and guessing at
 * either is worse than saying nothing.
 */
export function messageForError(err: Pick<UnlockErr, 'code' | 'retryAfter' | 'cap'>): string {
    if (err.code === 'device_cap' && typeof err.cap === 'number') {
        return `This key is on ${err.cap} devices already. Call ${SUPPORT_PHONE} and we'll free one.`;
    }
    if (err.code === 'rate_limited' && typeof err.retryAfter === 'number' && err.retryAfter > 0) {
        const s = Math.ceil(err.retryAfter);
        return `Too many tries in a row. Try again in ${s} second${s === 1 ? '' : 's'}.`;
    }
    return messageFor(err.code);
}

/**
 * Shown when the build carries no NEXT_PUBLIC_UNLOCK_URL. It is not an error a
 * buyer caused and there is nothing they can retry, so the page says so plainly
 * instead of failing a request against an empty URL.
 */
export const SERVICE_UNCONFIGURED_MESSAGE =
    `This copy of the app has no licence check wired up, so a key cannot be entered here. ` +
    `Call ${SUPPORT_PHONE} and we will send you the questions another way.`;

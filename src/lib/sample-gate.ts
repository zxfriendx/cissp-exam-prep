/**
 * The email gate on the free sample.
 *
 * The free sample is still 160 questions, 20 a domain. Since 2026-10-27 only 40
 * of them (5 a domain, stamped `open: true` by scripts/build-preview.mjs) are
 * served with no signup. The other 120 open when the visitor joins the mailing
 * list, and every one of the 750 opens with a licence key, as before.
 *
 * Pure apart from the two small storage helpers at the bottom, which take the
 * Storage object as an argument so a test can hand them a fake. No React and no
 * fetch: the form is src/components/practice/signup-panel.tsx and the request
 * is subscribe() in src/lib/unlock-client.ts.
 *
 * THE CLIENT AUTHORISES NOTHING HERE EITHER
 * -----------------------------------------
 * All 160 ship in preview.json whatever the visitor has done; the gate is a
 * request, not a lock. Someone who sets the localStorage flag by hand gets 120
 * questions they could have had for an email address. The 590 that matter stay
 * on the unlock service behind a licence key.
 *
 * `node --test` imports this file directly; see the note at the top of
 * src/lib/bank.ts.
 */
import type { SubscribeErrorCode } from '@/lib/unlock-protocol';

/** localStorage: the ISO date this browser joined. Present means joined. */
export const JOINED_STORAGE_KEY = 'spd.sample.joined';

/** sessionStorage: the utm_* values of the URL the visit landed on, as JSON. */
export const UTM_STORAGE_KEY = 'spd.utm';

/** The consent sentence. Changing a word means bumping CONSENT_VERSION in unlock-protocol.ts. */
export const CONSENT_TEXT =
    'Email me the CISSP study notes and occasional offers from Secure Path Digital. Unsubscribe any time.';

/** The one privacy policy; it covers this app too. See CLAUDE.md. */
export const PRIVACY_URL = 'https://securepathdigital.net/privacy/';

/** The `source` the service records for this form. */
export const GATE_SOURCE = 'practice-gate';

/**
 * open    no signup: the 40 stamped `open`
 * joined  signed up in this browser: all 160
 * paid    a licence key: the paid bank, which has no gate at all
 */
export type SampleAccess = 'open' | 'joined' | 'paid';

export function accessFor(state: { tier: 'free' | 'paid'; joined: boolean }): SampleAccess {
    if (state.tier === 'paid') return 'paid';
    return state.joined ? 'joined' : 'open';
}

/** Can this visitor be served this question right now? */
export function isAvailable(q: { open?: boolean }, access: SampleAccess): boolean {
    return access !== 'open' || q.open === true;
}

/** The questions of `pool` this visitor can be served, in the order given. */
export function availableQuestions<T extends { open?: boolean }>(pool: readonly T[], access: SampleAccess): T[] {
    return pool.filter(q => isAvailable(q, access));
}

/** How many of `pool` are behind the signup for this visitor. 0 when joined or paid. */
export function gatedCount(pool: readonly { open?: boolean }[], access: SampleAccess): number {
    return pool.length - availableQuestions(pool, access).length;
}

/** Should a signup panel render at all? Never for a buyer, never once joined. */
export const showsGate = (access: SampleAccess): boolean => access === 'open';

// ── the form ─────────────────────────────────────────────────────────────────

/**
 * A plausibility check, not validation: one @, something either side, a dot in
 * the domain, no spaces. The service makes the real decision and says
 * `invalid_email` when it disagrees.
 */
export function isPlausibleEmail(raw: string): boolean {
    const email = raw.trim();
    if (email.length < 6 || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** What the form itself can find wrong before anything is sent. */
export type LocalFormError = 'email_missing' | 'email_format' | 'consent_missing';

export function checkForm(email: string, consent: boolean): LocalFormError[] {
    const errors: LocalFormError[] = [];
    if (!email.trim()) errors.push('email_missing');
    else if (!isPlausibleEmail(email)) errors.push('email_format');
    if (!consent) errors.push('consent_missing');
    return errors;
}

export const LOCAL_MESSAGES: Record<LocalFormError, string> = {
    email_missing: 'Enter your email address.',
    email_format: 'That email address does not look complete. Check it and try again.',
    consent_missing: 'Tick the box to agree to the emails. We cannot sign you up without it.',
};

/**
 * Every way a submit can end without joining. The service's own codes, plus
 * two the client decides: `unreachable` (network down, timeout, a body that
 * is not the protocol) and `unconfigured` (a build with no unlock URL).
 */
export type SubscribeFailure = SubscribeErrorCode | 'unreachable' | 'unconfigured';

const SUBMIT_MESSAGES: Record<SubscribeFailure, string> = {
    invalid_email: 'That email address was not accepted. Check it for a typo and try again.',
    consent_required: 'Tick the box to agree to the emails. We cannot sign you up without it.',
    rate_limited: 'Too many tries in a row. Wait a minute and try again.',
    store_unavailable: 'Signup is down for a moment on our side. Nothing was saved. Try again in a few minutes.',
    unreachable: 'We could not reach the signup service. Check your connection and try again.',
    unconfigured: 'Signup is not available in this copy of the app, so the other questions cannot be opened here.',
};

export function subscribeMessage(code: SubscribeFailure, retryAfter?: number): string {
    if (code === 'rate_limited' && typeof retryAfter === 'number' && retryAfter > 0) {
        const s = Math.ceil(retryAfter);
        return `Too many tries in a row. Try again in ${s} second${s === 1 ? '' : 's'}.`;
    }
    return SUBMIT_MESSAGES[code];
}

// ── campaign tags ────────────────────────────────────────────────────────────

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** The utm_* values in a query string, trimmed and capped. Empty object when none. */
export function parseUtm(search: string): Record<string, string> {
    const params = new URLSearchParams(search);
    const out: Record<string, string> = {};
    for (const key of UTM_KEYS) {
        const value = params.get(key)?.trim();
        if (value) out[key] = value.slice(0, 200);
    }
    return out;
}

// ── storage ──────────────────────────────────────────────────────────────────
//
// Every call swallows storage errors. A private window that refuses
// localStorage still gets its 160 for the session; it just asks again next time.

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function readJoined(storage: KV | undefined | null): boolean {
    try {
        return !!storage?.getItem(JOINED_STORAGE_KEY);
    } catch {
        return false;
    }
}

export function writeJoined(storage: KV | undefined | null, now: Date = new Date()): void {
    try {
        storage?.setItem(JOINED_STORAGE_KEY, now.toISOString().slice(0, 10));
    } catch {
        // The flag is already live in memory for this session.
    }
}

/**
 * Keep the FIRST landing's campaign tags for the session. A later page with no
 * tags does not wipe them, and a later page with different tags does not
 * replace them: the signup is credited to whatever brought the visitor in.
 */
export function captureUtm(storage: KV | undefined | null, search: string): void {
    try {
        if (!storage || storage.getItem(UTM_STORAGE_KEY) !== null) return;
        const utm = parseUtm(search);
        if (Object.keys(utm).length) storage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    } catch {
        // No sessionStorage: the signup goes without campaign tags.
    }
}

export function readUtm(storage: KV | undefined | null): Record<string, string> | undefined {
    try {
        const raw = storage?.getItem(UTM_STORAGE_KEY);
        if (!raw) return undefined;
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const out: Record<string, string> = {};
        for (const key of UTM_KEYS) {
            const v = (value as Record<string, unknown>)[key];
            if (typeof v === 'string' && v) out[key] = v;
        }
        return Object.keys(out).length ? out : undefined;
    } catch {
        return undefined;
    }
}

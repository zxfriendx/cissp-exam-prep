/**
 * The mailing list behind the email-gated free sample.
 *
 * Storage is Firestore, reached over its REST API with the Cloud Run service
 * account's own token from the metadata server, so the service keeps its zero
 * runtime dependencies and holds no credential of its own. A record is keyed by
 * sha256 of the normalised address: signing up twice updates one record, and the
 * document id in a log or a URL never reveals the address.
 *
 * What is stored, and nothing else: the address, when it first joined and last
 * signed up, the consent wording version it agreed to, the form it came from, the
 * utm_* values it arrived with, and whether it has unsubscribed. No IP address,
 * no user agent. The privacy policy at securepathdigital.net/privacy/ says the same.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface SubscriberRecord {
    email: string;
    consentVersion: string;
    source: string;
    utm: Record<string, string>;
    /** Epoch ms. */
    at: number;
}

export type UpsertResult = 'created' | 'updated';

export interface SubscriberStore {
    /** Creates the record, or on a repeat signup refreshes it and clears any unsubscribe. */
    upsert(id: string, rec: SubscriberRecord): Promise<UpsertResult>;
    /** False when there is no such record. */
    unsubscribe(id: string, at: number): Promise<boolean>;
}

export class StoreUnavailable extends Error {}

/* ------------------------------------------------------------------ addresses */

const MAX_EMAIL = 254;
// Deliberately plain: one @, a dot in the domain, no spaces. The real test of an
// address is whether mail to it arrives, and the sender finds that out.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed and lower-cased, or null if it is not shaped like an address. */
export function normaliseEmail(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const e = raw.trim().toLowerCase();
    if (e.length > MAX_EMAIL || !EMAIL_RE.test(e)) return null;
    return e;
}

export const subscriberId = (email: string): string =>
    createHash('sha256').update(email).digest('hex');

/** Only short utm_* string pairs survive; everything else in the object is dropped. */
export function cleanUtm(raw: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (/^utm_[a-z]{2,10}$/.test(k) && typeof v === 'string' && v.length <= 100) out[k] = v;
        if (Object.keys(out).length >= 6) break;
    }
    return out;
}

/* ------------------------------------------------------------- unsubscribe link */

/**
 * The signature on an unsubscribe link. The sender (on the home server, which
 * holds the same SUBSCRIBE_LINK_KEY) computes it per subscriber; the service
 * checks it, so nobody can unsubscribe an address they only guessed.
 */
export const unsubscribeSig = (id: string, keyHex: string): string =>
    createHmac('sha256', Buffer.from(keyHex, 'hex')).update(`unsub:${id}`).digest('base64url').slice(0, 32);

export function checkUnsubscribeSig(id: string, sig: string, keyHex: string): boolean {
    if (!/^[a-f0-9]{64}$/.test(id) || typeof sig !== 'string') return false;
    const want = Buffer.from(unsubscribeSig(id, keyHex));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
}

/* ------------------------------------------------------------------- in memory */

export function memoryStore(): SubscriberStore & { rows: Map<string, Record<string, unknown>> } {
    const rows = new Map<string, Record<string, unknown>>();
    return {
        rows,
        async upsert(id, rec) {
            const prev = rows.get(id);
            rows.set(id, {
                email: rec.email,
                createdAt: prev?.createdAt ?? rec.at,
                lastSignupAt: rec.at,
                consentVersion: rec.consentVersion,
                source: rec.source,
                utm: rec.utm,
                unsubscribed: false,
            });
            return prev ? 'updated' : 'created';
        },
        async unsubscribe(id, at) {
            const prev = rows.get(id);
            if (!prev) return false;
            rows.set(id, { ...prev, unsubscribed: true, unsubscribedAt: at });
            return true;
        },
    };
}

/* -------------------------------------------------------------------- Firestore */

const META = 'http://metadata.google.internal/computeMetadata/v1';
const FS = 'https://firestore.googleapis.com/v1';
const COLLECTION = 'subscribers';

const ts = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });
const str = (s: string) => ({ stringValue: s });
const map = (o: Record<string, string>) =>
    ({ mapValue: { fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, str(v)])) } });

export function firestoreStore(opts: {
    fetch: typeof globalThis.fetch;
    now: () => number;
    /** Defaults to the metadata server's project id. */
    project?: string;
}): SubscriberStore {
    const { fetch } = opts;
    let token: { value: string; until: number } | null = null;
    let project = opts.project;

    const meta = async (path: string): Promise<Response> => {
        try {
            return await fetch(`${META}${path}`, { headers: { 'metadata-flavor': 'Google' } });
        } catch (err) {
            throw new StoreUnavailable(`metadata server: ${(err as Error).message}`);
        }
    };

    async function auth(): Promise<{ token: string; base: string }> {
        if (!token || token.until < opts.now() + 60_000) {
            const r = await meta('/instance/service-accounts/default/token');
            if (!r.ok) throw new StoreUnavailable(`metadata token ${r.status}`);
            const j = await r.json() as { access_token: string; expires_in: number };
            token = { value: j.access_token, until: opts.now() + j.expires_in * 1000 };
        }
        if (!project) {
            const r = await meta('/project/project-id');
            if (!r.ok) throw new StoreUnavailable(`metadata project ${r.status}`);
            project = (await r.text()).trim();
        }
        return { token: token.value, base: `${FS}/projects/${project}/databases/(default)/documents/${COLLECTION}` };
    }

    async function call(method: string, url: string, body: unknown, tok: string): Promise<Response> {
        try {
            return await fetch(url, {
                method,
                headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (err) {
            throw new StoreUnavailable(`firestore: ${(err as Error).message}`);
        }
    }

    const mask = (fields: string[]) => fields.map(f => `updateMask.fieldPaths=${f}`).join('&');

    return {
        async upsert(id, rec) {
            const { token: tok, base } = await auth();
            const common = {
                email: str(rec.email),
                lastSignupAt: ts(rec.at),
                consentVersion: str(rec.consentVersion),
                source: str(rec.source),
                utm: map(rec.utm),
                unsubscribed: { booleanValue: false },
            };
            // Create only if absent, so a repeat signup can never overwrite createdAt.
            const created = await call('POST', `${base}?documentId=${id}`,
                { fields: { ...common, createdAt: ts(rec.at) } }, tok);
            if (created.ok) return 'created';
            if (created.status !== 409) throw new StoreUnavailable(`create ${created.status}: ${(await created.text()).slice(0, 200)}`);

            const updated = await call('PATCH', `${base}/${id}?${mask(Object.keys(common))}&currentDocument.exists=true`,
                { fields: common }, tok);
            if (!updated.ok) throw new StoreUnavailable(`update ${updated.status}: ${(await updated.text()).slice(0, 200)}`);
            return 'updated';
        },
        async unsubscribe(id, at) {
            const { token: tok, base } = await auth();
            const r = await call('PATCH', `${base}/${id}?${mask(['unsubscribed', 'unsubscribedAt'])}&currentDocument.exists=true`,
                { fields: { unsubscribed: { booleanValue: true }, unsubscribedAt: ts(at) } }, tok);
            if (r.ok) return true;
            if (r.status === 404 || r.status === 400) return false;   // no such document
            throw new StoreUnavailable(`unsubscribe ${r.status}: ${(await r.text()).slice(0, 200)}`);
        },
    };
}

/** SUBSCRIBE_STORE: `firestore` (Cloud Run), `memory` (local runs), anything else off. */
export function storeFromEnv(env: Record<string, string | undefined>, fetch: typeof globalThis.fetch, now: () => number): SubscriberStore | null {
    const kind = env.SUBSCRIBE_STORE ?? 'off';
    if (kind === 'firestore') return firestoreStore({ fetch, now, project: env.FIRESTORE_PROJECT });
    if (kind === 'memory') return memoryStore();
    return null;
}

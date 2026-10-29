/**
 * Entitlement tokens: `base64url(JSON payload).base64url(HMAC-SHA256)`.
 *
 * HMAC, not a keypair. Only this service ever verifies a token -- the client
 * reads `exp` and `ed` straight out of the payload, which is base64url and not
 * secret -- so a public key would buy nothing and cost a second algorithm.
 *
 * The payload carries `sub`, a hash of the licence key, never the key itself.
 * That is what gets logged and what UNLOCK_DENY lists, so neither the log nor
 * the denylist is a file of live licence keys.
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { normaliseKey } from './contract.ts';

export interface TokenPayload {
    v: 1;
    /** Which signing key signed this, so keys can rotate without logging anyone out. */
    kid: string;
    /** sha256(normalised licence key), first 16 hex chars. */
    sub: string;
    src: 'gumroad' | 'grant';
    /** Gumroad's sale id, when there was a sale. */
    sale?: string;
    iat: number;
    exp: number;
    /** Bank edition this token was issued against. */
    ed: string;
}

export interface SigningKey {
    kid: string;
    secret: Buffer;
}

export type VerifyFailure = 'bad_token' | 'token_expired';

export type TokenCheck =
    | { ok: true; payload: TokenPayload }
    | { ok: false; code: VerifyFailure };

const b64u = (b: Buffer): string => b.toString('base64url');

/** `UNLOCK_SIGNING_KEYS="k2:<hex>,k1:<hex>"` -- the first one signs, all of them verify. */
export function parseSigningKeys(spec: string | undefined): SigningKey[] {
    const keys: SigningKey[] = [];
    for (const entry of (spec ?? '').split(',')) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const sep = trimmed.indexOf(':');
        if (sep < 1) throw new Error(`UNLOCK_SIGNING_KEYS entry is not "kid:hex": ${trimmed.slice(0, 12)}...`);
        const kid = trimmed.slice(0, sep);
        const hex = trimmed.slice(sep + 1);
        if (!/^[0-9a-fA-F]{32,}$/.test(hex)) throw new Error(`UNLOCK_SIGNING_KEYS "${kid}" needs at least 16 bytes of hex`);
        keys.push({ kid, secret: Buffer.from(hex, 'hex') });
    }
    if (keys.length === 0) throw new Error('UNLOCK_SIGNING_KEYS is empty -- the service cannot issue tokens');
    return keys;
}

/** The subject: a licence key reduced to something safe to log and to denylist. */
export function subOf(rawKey: string): string {
    return createHash('sha256').update(normaliseKey(rawKey)).digest('hex').slice(0, 16);
}

export function sign(payload: TokenPayload, keys: SigningKey[]): string {
    const active = keys[0];
    if (!active) throw new Error('no signing key');
    const body = b64u(Buffer.from(JSON.stringify({ ...payload, kid: active.kid })));
    return `${body}.${b64u(createHmac('sha256', active.secret).update(body).digest())}`;
}

/**
 * `graceSec` lets /v1/refresh accept a token that has already expired: a refresh
 * is a re-check of an entitlement the buyer already has, not a fresh activation,
 * and someone who opened the app after a month offline should not be told to dig
 * out their licence key. /v1/bank passes no grace.
 */
export function verify(
    token: string,
    keys: SigningKey[],
    opts: { now: number; graceSec?: number },
): TokenCheck {
    const dot = token.indexOf('.');
    if (dot < 1 || dot === token.length - 1 || token.indexOf('.', dot + 1) !== -1) return { ok: false, code: 'bad_token' };
    const body = token.slice(0, dot);
    const mac = Buffer.from(token.slice(dot + 1), 'base64url');

    let payload: TokenPayload;
    try {
        payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    } catch {
        return { ok: false, code: 'bad_token' };
    }
    if (payload?.v !== 1 || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
        return { ok: false, code: 'bad_token' };
    }

    // Every key is tried, not just payload.kid: kid is attacker-supplied, so it
    // selects nothing. It is there for operators reading a token, not for lookup.
    const signed = keys.some(k => {
        const want = createHmac('sha256', k.secret).update(body).digest();
        return want.length === mac.length && timingSafeEqual(want, mac);
    });
    if (!signed) return { ok: false, code: 'bad_token' };

    if (opts.now > payload.exp + (opts.graceSec ?? 0)) return { ok: false, code: 'token_expired' };
    return { ok: true, payload };
}

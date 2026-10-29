/**
 * The whole service, with every piece of I/O passed in.
 *
 * `fetch`, `now`, `env` and the bank are arguments, so the tests drive the real
 * routing, the real policy and the real token code against a fake Gumroad and a
 * clock they control. server.ts adds nothing but sockets, CORS and logging --
 * there is no behaviour there for a test to miss.
 */
import type {
    HealthResponse,
    SubscribeErr,
    SubscribeErrorCode,
    SubscribeOk,
    UnlockErr,
    UnlockErrorCode,
    UnlockOk,
} from '../../../src/lib/unlock-protocol.ts';
import type { Bank } from './bank.ts';
import type { Gumroad } from './gumroad.ts';
import type { GumroadVerify, Log } from './types.ts';
import type { PolicyConfig } from './policy.ts';
import type { SigningKey, TokenPayload } from './token.ts';
import { createGumroad, GumroadUnavailable } from './gumroad.ts';
import { decideActivation, decideRefresh, isDenied, judgeEntitlement, parseDeny, parseGrants } from './policy.ts';
import { createLimiter, LIMITS } from './ratelimit.ts';
import { parseSigningKeys, sign, subOf, verify as verifyToken } from './token.ts';
import type { SubscriberStore } from './subscribers.ts';
import { checkUnsubscribeSig, cleanUtm, normaliseEmail, storeFromEnv, StoreUnavailable, subscriberId } from './subscribers.ts';

export interface AppRequest {
    method: string;
    /** Path only, no query string. */
    path: string;
    /** Lower-cased header names. */
    headers: Record<string, string | undefined>;
    /** Parsed JSON body, for POSTs. */
    body?: unknown;
    /** First hop of X-Forwarded-For, or the socket peer. */
    ip: string;
    /** Query-string parameters. Only /v1/unsubscribe reads them. */
    query?: Record<string, string>;
}

export interface AppResponse {
    status: number;
    headers: Record<string, string>;
    /** Exactly one of these is set. */
    json?: unknown;
    body?: Buffer;
}

export interface AppDeps {
    fetch: typeof globalThis.fetch;
    /** Epoch milliseconds. */
    now: () => number;
    env: Record<string, string | undefined>;
    bank: Bank;
    log?: Log;
    /** Overrides the Gumroad client built from `fetch` + `env`; tests rarely need it. */
    gumroad?: Gumroad;
    /** Overrides the mailing-list store built from SUBSCRIBE_STORE; `null` means off. */
    subscribers?: SubscriberStore | null;
}

export type Handler = (req: AppRequest) => Promise<AppResponse>;

const DAY = 86_400;
const TOKEN_TTL = 30 * DAY;
/** How long past `exp` /v1/refresh still recognises a token. */
export const REFRESH_GRACE = 90 * DAY;

const STATUS: Record<UnlockErrorCode, number> = {
    invalid_key_format: 400,
    not_found: 404,
    refunded: 403,
    chargebacked: 403,
    disabled: 403,
    device_cap: 409,
    denied: 403,
    bad_token: 401,
    token_expired: 401,
    rate_limited: 429,
    gumroad_unavailable: 503,
};

const fail = (code: UnlockErrorCode, extra: Omit<UnlockErr, 'ok' | 'code'> = {}): AppResponse => {
    const json: UnlockErr = { ok: false, code, ...extra };
    const headers: Record<string, string> = {};
    if (code === 'rate_limited' && extra.retryAfter) headers['retry-after'] = String(extra.retryAfter);
    return { status: STATUS[code], headers, json };
};

const ok = (json: unknown, status = 200, headers: Record<string, string> = {}): AppResponse =>
    ({ status, headers, json });

/** Gumroad's sale id, wherever it is hiding in this week's response shape. */
function saleOf(raw: unknown): string | undefined {
    const purchase = (raw as { purchase?: Record<string, unknown> } | null)?.purchase;
    const id = purchase?.sale_id ?? purchase?.id;
    return typeof id === 'string' ? id : undefined;
}

function etagMatches(header: string | undefined, etag: string): boolean {
    if (!header) return false;
    return header.split(',').some(t => {
        const v = t.trim().replace(/^W\//, '');
        return v === '*' || v === etag;
    });
}

const acceptsGzip = (header: string | undefined): boolean =>
    /(^|,)\s*gzip\s*(;|,|$)/i.test(header ?? '');

export function createApp(deps: AppDeps): Handler {
    const { now, env, bank } = deps;
    const log: Log = deps.log ?? (() => {});
    const gumroad = deps.gumroad ?? createGumroad({ fetch: deps.fetch, env });
    const keys: SigningKey[] = parseSigningKeys(env.UNLOCK_SIGNING_KEYS);
    const activeKid = keys[0]!.kid;
    const cfg: PolicyConfig = {
        grants: parseGrants(env.UNLOCK_GRANTS),
        deny: parseDeny(env.UNLOCK_DENY),
        deviceCap: Number(env.DEVICE_CAP ?? 4),
    };
    if (!Number.isInteger(cfg.deviceCap) || cfg.deviceCap < 1) throw new Error(`DEVICE_CAP is not a positive integer: ${String(env.DEVICE_CAP)}`);

    const limiter = createLimiter(now);
    const subscribers: SubscriberStore | null =
        deps.subscribers !== undefined ? deps.subscribers : storeFromEnv(env, deps.fetch, now);
    const linkKey = env.SUBSCRIBE_LINK_KEY ?? '';

    const issue = (sub: string, src: TokenPayload['src'], sale: string | undefined): { token: string; exp: number } => {
        const iat = Math.floor(now() / 1000);
        const exp = iat + TOKEN_TTL;
        const payload: TokenPayload = { v: 1, kid: activeKid, sub, src, iat, exp, ed: bank.edition };
        if (sale) payload.sale = sale;
        return { token: sign(payload, keys), exp };
    };

    /** One Gumroad call, with the rejection logged raw and the outage mapped. */
    const ask = async (key: string, sub: string, increment: boolean): Promise<GumroadVerify | AppResponse> => {
        try {
            const res = await gumroad.verify(key, { increment });
            if (!res.ok) log('warn', 'gumroad_rejected', { sub, increment, raw: res.raw });
            return res;
        } catch (err) {
            if (err instanceof GumroadUnavailable) {
                log('error', 'gumroad_unavailable', { sub, increment, err: err.message });
                return fail('gumroad_unavailable');
            }
            throw err;
        }
    };
    const isResponse = (v: GumroadVerify | AppResponse): v is AppResponse => 'status' in v;

    async function activate(req: AppRequest): Promise<AppResponse> {
        const ipHit = limiter.hit(`a:ip:${req.ip}`, LIMITS.activateIp.limit, LIMITS.activateIp.windowMs);
        if (!ipHit.ok) return fail('rate_limited', { retryAfter: ipHit.retryAfter });

        const rawKey = (req.body as { key?: unknown } | undefined)?.key;
        const first = decideActivation({ rawKey, cfg, probe: null });
        if (first.kind === 'reject') return fail(first.code, { uses: first.uses, cap: first.cap });
        const { key, sub } = first;

        const subHit = limiter.hit(`a:sub:${sub}`, LIMITS.activateSub.limit, LIMITS.activateSub.windowMs);
        if (!subHit.ok) return fail('rate_limited', { retryAfter: subHit.retryAfter });

        if (first.kind === 'grant') {
            log('info', 'activated', { sub, src: 'grant', grant: first.label });
            const { token, exp } = issue(sub, 'grant', undefined);
            const body: UnlockOk = { ok: true, token, exp, edition: bank.edition };
            return ok(body);
        }

        // First call reads `uses`. It must not increment: Gumroad's undo needs an
        // OAuth token this service does not hold, so an increment cannot be taken
        // back and an over-cap buyer would lose an activation to a refusal.
        const probe = await ask(key, sub, false);
        if (isResponse(probe)) return probe;

        const judged = decideActivation({ rawKey, cfg, probe });
        if (judged.kind === 'reject') {
            log('info', 'activate_refused', { sub, code: judged.code, uses: judged.uses, cap: judged.cap });
            return fail(judged.code, { uses: judged.uses, cap: judged.cap });
        }
        if (judged.kind !== 'increment') throw new Error(`unreachable activation step: ${judged.kind}`);

        const spent = await ask(key, sub, true);
        if (isResponse(spent)) return spent;
        // The licence can change between the two calls, so the second answer is
        // judged too -- but on entitlement only. Re-applying the cap here would
        // refuse the activation that just consumed the last allowed slot.
        const after = judgeEntitlement(spent);
        if (after) {
            log('info', 'activate_refused', { sub, code: after, after_increment: true });
            return fail(after);
        }

        const uses = spent.uses > 0 ? spent.uses : probe.uses + 1;
        log('info', 'activated', { sub, src: 'gumroad', uses, cap: cfg.deviceCap });
        const { token, exp } = issue(sub, 'gumroad', saleOf(spent.raw) ?? saleOf(probe.raw));
        const body: UnlockOk = { ok: true, token, exp, edition: bank.edition, uses, cap: cfg.deviceCap };
        return ok(body);
    }

    async function refresh(req: AppRequest): Promise<AppResponse> {
        const ipHit = limiter.hit(`r:ip:${req.ip}`, LIMITS.refreshIp.limit, LIMITS.refreshIp.windowMs);
        if (!ipHit.ok) return fail('rate_limited', { retryAfter: ipHit.retryAfter });

        const body = req.body as { key?: unknown; token?: unknown } | undefined;
        const rawKey = body?.key;
        const rawToken = body?.token;
        if (typeof rawToken !== 'string') return fail('bad_token');

        const first = decideRefresh({ rawKey, cfg, probe: null });
        if (first.kind === 'reject') return fail(first.code, { uses: first.uses, cap: first.cap });
        const { key, sub } = first;

        const checked = verifyToken(rawToken, keys, { now: Math.floor(now() / 1000), graceSec: REFRESH_GRACE });
        if (!checked.ok) return fail(checked.code);
        // The token proves an entitlement; the key proves it is the same one.
        if (checked.payload.sub !== subOf(key)) return fail('bad_token');

        if (first.kind === 'grant') {
            const { token, exp } = issue(sub, 'grant', undefined);
            log('info', 'refreshed', { sub, src: 'grant', grant: first.label });
            const out: UnlockOk = { ok: true, token, exp, edition: bank.edition };
            return ok(out);
        }

        const probe = await ask(key, sub, false);
        if (isResponse(probe)) return probe;

        const judged = decideRefresh({ rawKey, cfg, probe });
        if (judged.kind === 'reject') {
            log('info', 'refresh_refused', { sub, code: judged.code });
            return fail(judged.code, { uses: judged.uses, cap: judged.cap });
        }

        const { token, exp } = issue(sub, 'gumroad', saleOf(probe.raw) ?? checked.payload.sale);
        log('info', 'refreshed', { sub, src: 'gumroad', uses: probe.uses });
        const out: UnlockOk = { ok: true, token, exp, edition: bank.edition, uses: probe.uses, cap: cfg.deviceCap };
        return ok(out);
    }

    function serveBank(req: AppRequest): AppResponse {
        const auth = req.headers.authorization ?? '';
        const bearer = /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
        if (!bearer) return fail('bad_token');

        const checked = verifyToken(bearer, keys, { now: Math.floor(now() / 1000) });
        if (!checked.ok) return fail(checked.code);
        if (isDenied(checked.payload.sub, cfg.deny)) return fail('denied');

        const headers: Record<string, string> = {
            etag: bank.etag,
            'cache-control': 'private, no-store',
            vary: 'accept-encoding',
        };
        if (etagMatches(req.headers['if-none-match'], bank.etag)) return { status: 304, headers };

        headers['content-type'] = 'application/json; charset=utf-8';
        const gz = acceptsGzip(req.headers['accept-encoding']);
        if (gz) headers['content-encoding'] = 'gzip';
        const payload = gz ? bank.gzip : bank.raw;
        headers['content-length'] = String(payload.length);
        log('info', 'bank_served', { sub: checked.payload.sub, gzip: gz, bytes: payload.length });
        return { status: 200, headers, body: payload };
    }

    const SUB_STATUS: Record<SubscribeErrorCode, number> = {
        invalid_email: 400, consent_required: 400, rate_limited: 429, store_unavailable: 503,
    };
    const subFail = (code: SubscribeErrorCode, retryAfter?: number): AppResponse => {
        const json: SubscribeErr = { ok: false, code, ...(retryAfter ? { retryAfter } : {}) };
        return { status: SUB_STATUS[code], headers: retryAfter ? { 'retry-after': String(retryAfter) } : {}, json };
    };

    async function subscribe(req: AppRequest): Promise<AppResponse> {
        for (const [name, lim] of [['s:ip:min', LIMITS.subscribeIpMin], ['s:ip:hour', LIMITS.subscribeIpHour]] as const) {
            const hit = limiter.hit(`${name}:${req.ip}`, lim.limit, lim.windowMs);
            if (!hit.ok) return subFail('rate_limited', hit.retryAfter);
        }
        const b = (req.body ?? {}) as Record<string, unknown>;
        // Honeypot filled: answer exactly as a success would, store nothing, so a bot
        // learns nothing from the response.
        if (typeof b.website === 'string' && b.website.trim() !== '') {
            log('info', 'subscribe_honeypot', {});
            const out: SubscribeOk = { ok: true };
            return ok(out);
        }
        const email = normaliseEmail(b.email);
        if (!email) return subFail('invalid_email');
        const version = typeof b.consentVersion === 'string' ? b.consentVersion : '';
        if (b.consent !== true || !/^[\w.-]{1,40}$/.test(version)) return subFail('consent_required');
        if (!subscribers) return subFail('store_unavailable');

        const id = subscriberId(email);
        const source = typeof b.source === 'string' && /^[\w-]{1,40}$/.test(b.source) ? b.source : 'unknown';
        try {
            const result = await subscribers.upsert(id, { email, consentVersion: version, source, utm: cleanUtm(b.utm), at: now() });
            // The id, never the address: a log line must not be a copy of the list.
            log('info', 'subscribed', { id: id.slice(0, 12), result, source });
        } catch (err) {
            if (err instanceof StoreUnavailable) {
                log('error', 'subscribe_store_unavailable', { err: err.message });
                return subFail('store_unavailable');
            }
            throw err;
        }
        const out: SubscribeOk = { ok: true };
        return ok(out);
    }

    const page = (status: number, title: string, text: string): AppResponse => {
        const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="font-family:system-ui,sans-serif;background:#0C0D10;color:#ECEEF2;max-width:36rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6"><h1 style="font-size:1.4rem">${title}</h1><p style="color:#9BA3AF">${text}</p><p><a style="color:#E8A05C" href="https://learn.securepathdigital.net/">learn.securepathdigital.net</a></p></body></html>`;
        const body = Buffer.from(html);
        return { status, headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': String(body.length), 'cache-control': 'no-store' }, body };
    };

    /** GET from the link in an email, POST from a mail client's one-click button (RFC 8058). */
    async function unsubscribe(req: AppRequest): Promise<AppResponse> {
        const hit = limiter.hit(`u:ip:${req.ip}`, LIMITS.unsubscribeIp.limit, LIMITS.unsubscribeIp.windowMs);
        if (!hit.ok) return page(429, 'Too many requests', 'Please try the link again in a minute.');
        const id = req.query?.id ?? '';
        const sig = req.query?.sig ?? '';
        if (!linkKey || !subscribers) return page(503, 'Unsubscribe is unavailable', 'Reply to the email with the word unsubscribe and we will remove you by hand.');
        if (!checkUnsubscribeSig(id, sig, linkKey)) return page(400, 'That link is not valid', 'Reply to the email with the word unsubscribe and we will remove you by hand.');
        try {
            const found = await subscribers.unsubscribe(id, now());
            log('info', 'unsubscribed', { id: id.slice(0, 12), found });
        } catch (err) {
            if (err instanceof StoreUnavailable) {
                log('error', 'unsubscribe_store_unavailable', { err: err.message });
                return page(503, 'Please try again', 'We could not record that just now. The link will still work later.');
            }
            throw err;
        }
        // Same answer whether or not the record existed: the page must not confirm
        // which addresses are on the list.
        return page(200, 'You are unsubscribed', 'You will not get any more email from Secure Path Digital. If that was a mistake, signing up again on the practice page puts you back.');
    }

    return async function handle(req: AppRequest): Promise<AppResponse> {
        // /v1/health as well as /healthz: Google's frontend intercepts /healthz on
        // *.run.app and answers it with its own HTML 404 — the container never sees
        // the request. Verified 2026-09-07 on both the project-number and the legacy
        // hashed URL, while every other path on the same host reached the service.
        // /healthz stays for local runs and for any host that does not reserve it.
        if (req.method === 'GET' && (req.path === '/healthz' || req.path === '/v1/health')) {
            const health: HealthResponse = {
                ok: true,
                edition: bank.edition,
                items: bank.items,
                stimuli: bank.stimuli,
                kid: activeKid,
            };
            return ok(health);
        }
        if (req.method === 'POST' && req.path === '/v1/activate') return activate(req);
        if (req.method === 'POST' && req.path === '/v1/refresh') return refresh(req);
        if (req.method === 'GET' && req.path === '/v1/bank') return serveBank(req);
        if (req.method === 'POST' && req.path === '/v1/subscribe') return subscribe(req);
        if ((req.method === 'GET' || req.method === 'POST') && req.path === '/v1/unsubscribe') return unsubscribe(req);

        const known = ['/healthz', '/v1/health', '/v1/activate', '/v1/refresh', '/v1/bank', '/v1/subscribe', '/v1/unsubscribe'];
        if (known.includes(req.path)) return { status: 405, headers: { allow: req.path === '/healthz' || req.path === '/v1/health' || req.path === '/v1/bank' ? 'GET' : 'POST' }, json: { ok: false, error: 'method_not_allowed' } };
        return { status: 404, headers: {}, json: { ok: false, error: 'no_such_route' } };
    };
}

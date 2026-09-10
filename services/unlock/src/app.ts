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

        const known = ['/healthz', '/v1/health', '/v1/activate', '/v1/refresh', '/v1/bank'];
        if (known.includes(req.path)) return { status: 405, headers: { allow: req.path === '/healthz' || req.path === '/v1/health' || req.path === '/v1/bank' ? 'GET' : 'POST' }, json: { ok: false, error: 'method_not_allowed' } };
        return { status: 404, headers: {}, json: { ok: false, error: 'no_such_route' } };
    };
}

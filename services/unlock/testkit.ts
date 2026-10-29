/**
 * Shared test scaffolding.
 *
 * Not in test/, because Node's test runner treats every .ts file under a
 * directory called `test` as a test file and would report this one as an empty
 * suite. Not in src/, because the Dockerfile copies src/ wholesale and test
 * scaffolding has no business in the image.
 */
import type { AppRequest, AppResponse, Handler } from './src/app.ts';
import type { Bank } from './src/bank.ts';
import { createApp } from './src/app.ts';
import { makeBank } from './src/bank.ts';

export const KEY_GOOD = 'AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD';
export const KEY_OTHER = '11111111-22222222-33333333-44444444';
export const KEY_GRANT = 'FEEDFACE-FEEDFACE-FEEDFACE-FEEDFACE';
export const SIGNING = `k2:${'a'.repeat(64)},k1:${'b'.repeat(64)}`;

export interface Call { key: string; increment: boolean }

export interface FakeGumroad {
    calls: Call[];
    increments(): number;
    fetch: typeof globalThis.fetch;
}

type Reply = { status?: number; body: unknown } | { throws: true };

/**
 * A fetch that answers the licence endpoint from a table and records what was
 * asked. `increments()` is the assertion that matters: an activation must spend
 * exactly one, and a refresh none.
 */
export function fakeGumroad(replies: Record<string, Reply | ((call: Call, n: number) => Reply)>): FakeGumroad {
    const calls: Call[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
        const form = new URLSearchParams(String(init?.body ?? ''));
        const key = form.get('license_key') ?? '';
        const call: Call = { key, increment: form.get('increment_uses_count') === 'true' };
        calls.push(call);

        const entry = replies[key] ?? { status: 404, body: { success: false, error: { code: 'not_found', status_code: 404 } } };
        const reply = typeof entry === 'function' ? entry(call, calls.filter(c => c.key === key).length) : entry;
        if ('throws' in reply) throw new TypeError('fetch failed');
        return new Response(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body), {
            status: reply.status ?? 200,
            headers: { 'content-type': 'application/json' },
        });
    }) as unknown as typeof globalThis.fetch;

    return { calls, increments: () => calls.filter(c => c.increment).length, fetch: fetchImpl };
}

/** Gumroad's happy answer. */
export const sale = (uses: number, extra: Record<string, unknown> = {}): Reply => ({
    body: {
        success: true,
        uses,
        purchase: { sale_id: 'sale_1', refunded: false, chargebacked: false, disputed: false, disabled: false, ...extra },
    },
});

export const TINY_BANK = JSON.stringify({
    schema: 1,
    edition: '2026-09-06',
    domains: [{ id: 'd1', title: 'One', caseStudy: 'cs', stimuli: [{ id: 's1' }], questions: [{ id: 'q1' }, { id: 'q2' }] }],
});

export const tinyBank = (): Bank => makeBank(TINY_BANK);

export interface Harness {
    app: Handler;
    gum: FakeGumroad;
    /** Epoch ms; assign to move the clock. */
    clock: { t: number };
    post(path: string, body: unknown, extra?: Partial<AppRequest>): Promise<AppResponse>;
    get(path: string, headers?: Record<string, string | undefined>, extra?: Partial<AppRequest>): Promise<AppResponse>;
    logs: { level: string; msg: string; fields: Record<string, unknown> }[];
}

export function harness(opts: {
    env?: Record<string, string | undefined>;
    replies?: Record<string, Reply | ((call: Call, n: number) => Reply)>;
    bank?: Bank;
    at?: number;
} = {}): Harness {
    const clock = { t: opts.at ?? Date.UTC(2026, 8, 7, 12, 0, 0) };
    const gum = fakeGumroad(opts.replies ?? {});
    const logs: Harness['logs'] = [];
    const app = createApp({
        fetch: gum.fetch,
        now: () => clock.t,
        env: { UNLOCK_SIGNING_KEYS: SIGNING, GUMROAD_PRODUCT_ID: 'prod_1', ...opts.env },
        bank: opts.bank ?? tinyBank(),
        log: (level, msg, fields = {}) => logs.push({ level, msg, fields }),
    });

    const base = (extra?: Partial<AppRequest>): Pick<AppRequest, 'ip' | 'headers'> =>
        ({ ip: extra?.ip ?? '203.0.113.9', headers: extra?.headers ?? {} });

    return {
        app, gum, clock, logs,
        post: (path, body, extra) => app({ method: 'POST', path, body, ...base(extra), ...extra }),
        get: (path, headers, extra) => app({ method: 'GET', path, ...base(extra), headers: headers ?? {}, ...extra }),
    };
}

export const asOk = (res: AppResponse): { token: string; exp: number; edition: string; uses?: number; cap?: number } =>
    res.json as { token: string; exp: number; edition: string; uses?: number; cap?: number };

export const asErr = (res: AppResponse): { ok: false; code: string; retryAfter?: number; uses?: number; cap?: number } =>
    res.json as { ok: false; code: string; retryAfter?: number; uses?: number; cap?: number };

/**
 * The three calls to the unlock service, with fetch injected.
 *
 * The thing worth testing here is not the happy path, it is the mapping from
 * "something went wrong" to a code — because `isTerminal(code)` on the other
 * side of that mapping wipes a buyer's downloaded questions. A DNS failure, a
 * 502 with an HTML body, a rate limit and a code this build has never heard of
 * must all come back as `gumroad_unavailable`, and none of them may come back
 * as `refunded`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('../scripts/node-ts-resolve.mjs', import.meta.url);

const { activate, refresh, fetchBank, isUnlockConfigured, UNLOCK_URL } =
    await import('../src/lib/unlock-client.ts');

const BASE = 'http://127.0.0.1:8787';
const KEY = 'A1B2C3D4-E5F60718-29A3B4C5-D6E7F809';

/** A fetch that records what it was called with and answers from a script. */
function stubFetch(reply) {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        if (typeof reply === 'function') return reply(url, init);
        return reply;
    };
    return { fetchImpl, calls };
}

const json = (status, body, headers = {}) => ({
    status,
    headers: new Headers(headers),
    json: async () => body,
});

const notJson = (status) => ({
    status,
    headers: new Headers({ 'content-type': 'text/html' }),
    json: async () => { throw new SyntaxError('Unexpected token <'); },
});

const OK_BODY = { ok: true, token: 'cGF5bG9hZA.c2ln', exp: 1_800_000_000, edition: '2026-09-06', uses: 1, cap: 5 };

// ── configuration ────────────────────────────────────────────────────────────

test('the committed default is empty, which means not configured', () => {
    // Nothing sets NEXT_PUBLIC_UNLOCK_URL in the repo, so a build made from a
    // clean checkout says so rather than fetching a broken URL.
    assert.equal(UNLOCK_URL, '');
    assert.equal(isUnlockConfigured(), false);
    assert.equal(isUnlockConfigured(BASE), true);
});

test('an unconfigured service is unavailable, and is never fetched', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, OK_BODY));
    const res = await activate(KEY, { fetchImpl, baseUrl: '' });
    assert.deepEqual(res, { ok: false, code: 'gumroad_unavailable' });
    assert.equal(calls.length, 0);
});

// ── activate ─────────────────────────────────────────────────────────────────

test('a malformed key is rejected before the round trip', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, OK_BODY));
    for (const bad of ['', 'nonsense', 'A1B2C3D4-E5F60718-29A3B4C5', 'A1B2C3D4E5F6071829A3B4C5D6E7F809']) {
        const res = await activate(bad, { fetchImpl, baseUrl: BASE });
        assert.deepEqual(res, { ok: false, code: 'invalid_key_format' }, bad);
    }
    assert.equal(calls.length, 0, 'a typo must not burn one of the five device slots');
});

test('a lowercase key with stray whitespace is normalised, not rejected', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, OK_BODY));
    const res = await activate(`  ${KEY.toLowerCase()}\n`, { fetchImpl, baseUrl: BASE });
    assert.equal(res.ok, true);
    assert.equal(calls[0].url, `${BASE}/v1/activate`);
    assert.deepEqual(JSON.parse(calls[0].init.body), { key: KEY });
});

test('a good key comes back as the service sent it', async () => {
    const { fetchImpl } = stubFetch(json(200, OK_BODY));
    assert.deepEqual(await activate(KEY, { fetchImpl, baseUrl: BASE }), OK_BODY);
});

test('a refusal comes back with its own code', async () => {
    for (const code of ['refunded', 'chargebacked', 'disabled', 'not_found', 'denied', 'device_cap']) {
        const { fetchImpl } = stubFetch(json(403, { ok: false, code, uses: 5, cap: 5 }));
        const res = await activate(KEY, { fetchImpl, baseUrl: BASE });
        assert.equal(res.ok, false);
        assert.equal(res.code, code);
    }
});

// ── everything that can go wrong on the way ──────────────────────────────────

test('a network failure is never terminal', async () => {
    const fetchImpl = async () => { throw new TypeError('fetch failed'); };
    assert.deepEqual(await activate(KEY, { fetchImpl, baseUrl: BASE }), { ok: false, code: 'gumroad_unavailable' });
});

test('a proxy error page is never terminal', async () => {
    const { fetchImpl } = stubFetch(notJson(502));
    assert.deepEqual(await activate(KEY, { fetchImpl, baseUrl: BASE }), { ok: false, code: 'gumroad_unavailable' });
});

test('a 200 with a body that is not a response is never terminal', async () => {
    const { fetchImpl } = stubFetch(json(200, { hello: 'world' }));
    assert.deepEqual(await activate(KEY, { fetchImpl, baseUrl: BASE }), { ok: false, code: 'gumroad_unavailable' });
});

test('a code this build has never heard of does not reach isTerminal', async () => {
    // A future service spelling, or a typo in one. Passing it through would let
    // an unknown string decide whether a buyer's bank gets wiped.
    const { fetchImpl } = stubFetch(json(403, { ok: false, code: 'refunded_v2' }));
    assert.deepEqual(await activate(KEY, { fetchImpl, baseUrl: BASE }), { ok: false, code: 'gumroad_unavailable' });
});

test('a 429 with no body still reports the retry delay', async () => {
    const { fetchImpl } = stubFetch(notJson(429));
    assert.deepEqual(
        await activate(KEY, { fetchImpl, baseUrl: BASE }),
        { ok: false, code: 'rate_limited', retryAfter: undefined },
    );

    const withHeader = stubFetch({ status: 429, headers: new Headers({ 'retry-after': '45' }), json: async () => null });
    assert.deepEqual(
        await activate(KEY, { fetchImpl: withHeader.fetchImpl, baseUrl: BASE }),
        { ok: false, code: 'rate_limited', retryAfter: 45 },
    );
});

test('a service that never answers is abandoned, not waited on', async () => {
    const fetchImpl = (url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    const started = Date.now();
    const res = await activate(KEY, { fetchImpl, baseUrl: BASE, timeoutMs: 25 });
    assert.deepEqual(res, { ok: false, code: 'gumroad_unavailable' });
    assert.ok(Date.now() - started < 2000, 'the abort should fire in tens of milliseconds');
});

test("the caller's own signal cuts the request short", async () => {
    const controller = new AbortController();
    const fetchImpl = (url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    const pending = activate(KEY, { fetchImpl, baseUrl: BASE, signal: controller.signal });
    controller.abort();
    assert.deepEqual(await pending, { ok: false, code: 'gumroad_unavailable' });
});

// ── refresh ──────────────────────────────────────────────────────────────────

test('refresh sends both halves and never touches /v1/activate', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, OK_BODY));
    const res = await refresh(KEY, 'tok.sig', { fetchImpl, baseUrl: BASE });
    assert.equal(res.ok, true);
    assert.equal(calls[0].url, `${BASE}/v1/refresh`);
    assert.deepEqual(JSON.parse(calls[0].init.body), { key: KEY, token: 'tok.sig' });
});

test('refresh without a token is a bad token, not a round trip', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, OK_BODY));
    assert.deepEqual(await refresh(KEY, '', { fetchImpl, baseUrl: BASE }), { ok: false, code: 'bad_token' });
    assert.equal(calls.length, 0);
});

// ── the bank ─────────────────────────────────────────────────────────────────

const BANK = { schema: 1, edition: '2026-09-06', domains: [{ id: 'domain_1', title: 'One', caseStudy: '', stimuli: [], questions: [] }] };

test('the bank is fetched with the token and validated on the way in', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, BANK));
    const res = await fetchBank('tok.sig', { fetchImpl, baseUrl: BASE });
    assert.deepEqual(res, { ok: true, bank: BANK });
    assert.equal(calls[0].url, `${BASE}/v1/bank`);
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok.sig');
});

test('a 200 that is not a bank is a broken service, not a refusal', async () => {
    for (const body of [null, {}, { schema: 2, edition: 'x', domains: [] }, { schema: 1, domains: [] }]) {
        const { fetchImpl } = stubFetch(json(200, body));
        assert.deepEqual(
            await fetchBank('tok.sig', { fetchImpl, baseUrl: BASE }),
            { ok: false, code: 'gumroad_unavailable' },
            JSON.stringify(body),
        );
    }
});

test('a refused bank keeps its code, so the loader can wipe', async () => {
    const { fetchImpl } = stubFetch(json(403, { ok: false, code: 'refunded' }));
    assert.deepEqual(await fetchBank('tok.sig', { fetchImpl, baseUrl: BASE }), { ok: false, code: 'refunded' });
});

test('an expired token on the bank endpoint is reported as such', async () => {
    const { fetchImpl } = stubFetch(json(401, { ok: false, code: 'token_expired' }));
    assert.deepEqual(await fetchBank('tok.sig', { fetchImpl, baseUrl: BASE }), { ok: false, code: 'token_expired' });
});

test('no token, no request', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, BANK));
    assert.deepEqual(await fetchBank('', { fetchImpl, baseUrl: BASE }), { ok: false, code: 'bad_token' });
    assert.equal(calls.length, 0);
});

test('a trailing slash on the base URL does not double up the path', async () => {
    const { fetchImpl, calls } = stubFetch(json(200, BANK));
    await fetchBank('tok.sig', { fetchImpl, baseUrl: `${BASE}///` });
    // `${base}//v1/bank` is a 404 that looks exactly like the service being down.
    assert.equal(calls[0].url, `${BASE}/v1/bank`);
});

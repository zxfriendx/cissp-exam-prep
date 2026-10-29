/**
 * The node:http wrapper. Loopback only -- no network, no Gumroad: the app it
 * wraps is built with the same fake fetch every other test uses.
 */
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import { corsHeadersFor, createServer, makeLog, parseOrigins } from '../src/server.ts';
import { createApp } from '../src/app.ts';
import { fakeGumroad, KEY_GOOD, KEY_GRANT, sale, SIGNING, tinyBank, TINY_BANK } from '../testkit.ts';

const ORIGIN = 'https://learn.securepathdigital.net';
const servers: { close(cb: () => void): void }[] = [];

async function listen(env: Record<string, string | undefined> = {}) {
    const gum = fakeGumroad({ [KEY_GOOD]: sale(1) });
    const lines: string[] = [];
    const stream = new PassThrough();
    stream.on('data', (c: Buffer) => lines.push(...c.toString().trim().split('\n')));
    const app = createApp({
        fetch: gum.fetch,
        now: Date.now,
        env: { UNLOCK_SIGNING_KEYS: SIGNING, GUMROAD_PRODUCT_ID: 'p', UNLOCK_GRANTS: `dev:${KEY_GRANT}`, ...env },
        bank: tinyBank(),
        log: makeLog(stream),
    });
    const server = createServer({ handle: app, log: makeLog(stream), allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS ?? ORIGIN) });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    servers.push(server);
    const { port } = server.address() as AddressInfo;
    return { base: `http://127.0.0.1:${port}`, lines, gum };
}

after(() => { for (const s of servers) s.close(() => {}); });

test('CORS: a configured origin is allowed, anything else is refused', async () => {
    const { base } = await listen();

    const good = await fetch(`${base}/v1/activate`, { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } });
    assert.equal(good.status, 204);
    assert.equal(good.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(good.headers.get('access-control-allow-headers') ?? '', /authorization/);
    assert.equal(good.headers.get('vary'), 'origin');

    const bad = await fetch(`${base}/v1/activate`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
    assert.equal(bad.status, 403);
    assert.equal(bad.headers.get('access-control-allow-origin'), null);

    // A real POST from a stranger is answered, but without the header that lets
    // the browser hand the body over.
    const posted = await fetch(`${base}/healthz`, { headers: { origin: 'https://evil.example' } });
    assert.equal(posted.status, 200);
    assert.equal(posted.headers.get('access-control-allow-origin'), null);
});

test('corsHeadersFor: no origin, exact match, wildcard', () => {
    assert.equal(corsHeadersFor(undefined, [ORIGIN]), null);
    assert.equal(corsHeadersFor('https://nope.example', [ORIGIN]), null);
    assert.equal(corsHeadersFor(ORIGIN, [ORIGIN])?.['access-control-allow-origin'], ORIGIN);
    assert.equal(corsHeadersFor('https://any.example', ['*'])?.['access-control-allow-origin'], 'https://any.example');
    assert.deepEqual(parseOrigins(' a , b ,, '), ['a', 'b']);
});

test('a body over 4 KB is refused before it is parsed', async () => {
    const { base } = await listen();
    const res = await fetch(`${base}/v1/activate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: KEY_GOOD, pad: 'x'.repeat(5000) }),
    });
    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), { ok: false, error: 'body_too_large' });

    const ok = await fetch(`${base}/v1/activate`, { method: 'POST', body: JSON.stringify({ key: KEY_GOOD, pad: 'x'.repeat(3000) }) });
    assert.equal(ok.status, 200);
});

test('a body that is not JSON is a 400, not a stack trace', async () => {
    const { base } = await listen();
    const res = await fetch(`${base}/v1/activate`, { method: 'POST', body: '{oops' });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, error: 'bad_json' });
});

test('the grant key round-trips activate -> bank -> refresh over real sockets', async () => {
    const { base, gum } = await listen();

    const act = await fetch(`${base}/v1/activate`, { method: 'POST', body: JSON.stringify({ key: KEY_GRANT }) });
    assert.equal(act.status, 200);
    const { token, edition } = await act.json() as { token: string; edition: string };
    assert.equal(edition, '2026-09-06');

    const bank = await fetch(`${base}/v1/bank`, { headers: { authorization: `Bearer ${token}`, 'accept-encoding': 'gzip' } });
    assert.equal(bank.status, 200);
    assert.equal(bank.headers.get('etag'), '"2026-09-06"');
    assert.equal(await bank.text(), TINY_BANK);   // undici inflates it for us

    const raw = await fetch(`${base}/v1/bank`, { headers: { authorization: `Bearer ${token}` }, decompress: false } as RequestInit);
    assert.equal(raw.status, 200);

    const not = await fetch(`${base}/v1/bank`, { headers: { authorization: `Bearer ${token}`, 'if-none-match': '"2026-09-06"' } });
    assert.equal(not.status, 304);

    const ref = await fetch(`${base}/v1/refresh`, { method: 'POST', body: JSON.stringify({ key: KEY_GRANT, token }) });
    assert.equal(ref.status, 200);
    assert.equal(gum.calls.length, 0, 'a grant never touches Gumroad');
});

test('healthz reports what is loaded, and unknown routes 404', async () => {
    const { base } = await listen();
    const res = await fetch(`${base}/healthz`);
    assert.deepEqual(await res.json(), { ok: true, edition: '2026-09-06', items: 2, stimuli: 1, kid: 'k2' });

    assert.equal((await fetch(`${base}/nope`)).status, 404);
    assert.equal((await fetch(`${base}/v1/activate`)).status, 405);
    assert.equal((await fetch(`${base}/healthz?deep=1`)).status, 200, 'the query string is not part of the route');
});

test('the log is JSON lines, carries the sub, and redacts anything key-shaped', async () => {
    const { base, lines } = await listen();
    await fetch(`${base}/v1/activate`, { method: 'POST', body: JSON.stringify({ key: KEY_GOOD }) });
    await new Promise(r => setImmediate(r));

    const parsed = lines.map(l => JSON.parse(l) as Record<string, unknown>);
    assert.equal(lines.join('\n').includes(KEY_GOOD), false, 'the licence key must never be logged');
    const activated = parsed.find(p => p.msg === 'activated');
    assert.match(String(activated?.sub), /^[0-9a-f]{16}$/);
    assert.ok(parsed.some(p => p.msg === 'request' && p.status === 200 && p.path === '/v1/activate'));

    const out = new PassThrough();
    const seen: string[] = [];
    out.on('data', (c: Buffer) => seen.push(c.toString()));
    makeLog(out)('info', 'x', { key: 'SECRET', token: 'SECRET', authorization: 'SECRET', sub: 'abc' });
    makeLog(out, false)('info', 'silenced', {});
    await new Promise(r => setImmediate(r));
    assert.equal(seen.length, 1);
    assert.equal(seen[0]!.includes('SECRET'), false);
    assert.match(seen[0]!, /"sub":"abc"/);
});

test('gzip really is gzip on the wire', async () => {
    const { base } = await listen();
    const act = await fetch(`${base}/v1/activate`, { method: 'POST', body: JSON.stringify({ key: KEY_GRANT }) });
    const { token } = await act.json() as { token: string };
    // fetch() always decompresses, so read the socket by hand.
    const res = await new Promise<{ encoding: string | undefined; body: Buffer }>((resolve, reject) => {
        void import('node:http').then(({ request }) => {
            const url = new URL(`${base}/v1/bank`);
            const req = request({ hostname: url.hostname, port: url.port, path: url.pathname, headers: { authorization: `Bearer ${token}`, 'accept-encoding': 'gzip' } }, r => {
                const chunks: Buffer[] = [];
                r.on('data', (c: Buffer) => chunks.push(c));
                r.on('end', () => resolve({ encoding: r.headers['content-encoding'], body: Buffer.concat(chunks) }));
            });
            req.on('error', reject);
            req.end();
        });
    });
    assert.equal(res.encoding, 'gzip');
    assert.equal(gunzipSync(res.body).toString('utf8'), TINY_BANK);
});

/**
 * The mailing list: /v1/subscribe, /v1/unsubscribe, and the Firestore client
 * against a fake metadata server and Firestore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import { createApp } from '../src/app.ts';
import { createServer, makeLog, parseOrigins } from '../src/server.ts';
import { firestoreStore, memoryStore, normaliseEmail, subscriberId, unsubscribeSig } from '../src/subscribers.ts';
import { fakeGumroad, SIGNING, tinyBank } from '../testkit.ts';

const LINK_KEY = 'c'.repeat(64);

function rig(opts: { store?: ReturnType<typeof memoryStore> | null; linkKey?: string } = {}) {
    const store = opts.store === undefined ? memoryStore() : opts.store;
    const logs: { msg: string; fields: Record<string, unknown> }[] = [];
    const clock = { t: Date.UTC(2026, 9, 27, 12) };
    const app = createApp({
        fetch: fakeGumroad({}).fetch,
        now: () => clock.t,
        env: { UNLOCK_SIGNING_KEYS: SIGNING, GUMROAD_PRODUCT_ID: 'p', SUBSCRIBE_LINK_KEY: opts.linkKey ?? LINK_KEY },
        bank: tinyBank(),
        log: (_l, msg, fields = {}) => logs.push({ msg, fields }),
        subscribers: store,
    });
    const post = (body: unknown, ip = '198.51.100.7') =>
        app({ method: 'POST', path: '/v1/subscribe', headers: {}, body, ip });
    const unsub = (query: Record<string, string>, method = 'GET') =>
        app({ method, path: '/v1/unsubscribe', headers: {}, body: {}, ip: '198.51.100.8', query });
    return { app, store, logs, clock, post, unsub };
}

const good = (email = 'Pat@Example.COM ') =>
    ({ email, consent: true, consentVersion: '2026-10-27', source: 'practice-gate', utm: { utm_source: 'youtube', evil: 'x' } });

test('normaliseEmail trims, lower-cases and refuses non-addresses', () => {
    assert.equal(normaliseEmail('  Pat@Example.COM '), 'pat@example.com');
    for (const bad of ['', 'pat', 'pat@', '@x.com', 'pat@x', 'a b@x.com', 42, null, `${'a'.repeat(250)}@x.com`]) {
        assert.equal(normaliseEmail(bad), null, String(bad));
    }
});

test('a signup is stored once, keyed by the address hash, with only the agreed fields', async () => {
    const { post, store } = rig();
    const res = await post(good());
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    const row = store!.rows.get(subscriberId('pat@example.com'))!;
    assert.equal(row.email, 'pat@example.com');
    assert.equal(row.consentVersion, '2026-10-27');
    assert.equal(row.source, 'practice-gate');
    assert.deepEqual(row.utm, { utm_source: 'youtube' }, 'non-utm keys dropped');
    assert.equal(row.unsubscribed, false);
    assert.equal(Object.keys(row).some(k => /ip|agent/i.test(k)), false, 'no IP or user agent stored');
});

test('signing up again updates the one record and keeps createdAt', async () => {
    const { post, store, clock } = rig();
    await post(good());
    const first = store!.rows.get(subscriberId('pat@example.com'))!.createdAt;
    clock.t += 86_400_000;
    await post(good('pat@example.com'));
    assert.equal(store!.rows.size, 1);
    const row = store!.rows.get(subscriberId('pat@example.com'))!;
    assert.equal(row.createdAt, first);
    assert.equal(row.lastSignupAt, clock.t);
});

test('refusals: bad address, no consent, no consent version', async () => {
    const { post, store } = rig();
    assert.equal((await post({ ...good(), email: 'nope' })).status, 400);
    assert.equal(((await post({ ...good(), email: 'nope' })).json as { code: string }).code, 'invalid_email');
    assert.equal(((await post({ ...good(), consent: false })).json as { code: string }).code, 'consent_required');
    assert.equal(((await post({ ...good(), consent: 'yes' })).json as { code: string }).code, 'consent_required');
    assert.equal(((await post({ ...good(), consentVersion: '' })).json as { code: string }).code, 'consent_required');
    assert.equal(store!.rows.size, 0);
});

test('the honeypot answers like a success and stores nothing', async () => {
    const { post, store } = rig();
    const res = await post({ ...good(), website: 'http://spam.example' });
    assert.deepEqual(res.json, { ok: true });
    assert.equal(store!.rows.size, 0);
});

test('rate limited per IP: 5 a minute', async () => {
    const { post } = rig();
    for (let i = 0; i < 5; i++) assert.equal((await post(good(`p${i}@example.com`))).status, 200);
    const sixth = await post(good('p6@example.com'));
    assert.equal(sixth.status, 429);
    assert.ok(Number(sixth.headers['retry-after']) > 0);
    assert.equal((await post(good('p7@example.com'), '198.51.100.99')).status, 200, 'another IP is unaffected');
});

test('no store configured is a 503, not a silent success', async () => {
    const { post } = rig({ store: null });
    const res = await post(good());
    assert.equal(res.status, 503);
    assert.equal((res.json as { code: string }).code, 'store_unavailable');
});

test('the address never appears in a log line', async () => {
    const { post, unsub, logs } = rig();
    await post(good());
    const id = subscriberId('pat@example.com');
    await unsub({ id, sig: unsubscribeSig(id, LINK_KEY) });
    assert.equal(JSON.stringify(logs).includes('pat@example.com'), false);
    assert.ok(logs.some(l => l.msg === 'subscribed'));
});

test('unsubscribe with a valid signature marks the record, by GET or one-click POST', async () => {
    const { post, unsub, store } = rig();
    await post(good());
    const id = subscriberId('pat@example.com');
    const res = await unsub({ id, sig: unsubscribeSig(id, LINK_KEY) }, 'POST');
    assert.equal(res.status, 200);
    assert.match(res.body!.toString(), /You are unsubscribed/);
    assert.equal(store!.rows.get(id)!.unsubscribed, true);
    await post(good());
    assert.equal(store!.rows.get(id)!.unsubscribed, false, 'a fresh signup with consent re-subscribes');
});

test('unsubscribe refuses a forged signature and does not reveal who is on the list', async () => {
    const { post, unsub, store } = rig();
    await post(good());
    const id = subscriberId('pat@example.com');
    const forged = await unsub({ id, sig: 'x'.repeat(32) });
    assert.equal(forged.status, 400);
    assert.equal(store!.rows.get(id)!.unsubscribed, false);
    const stranger = subscriberId('nobody@example.com');
    const absent = await unsub({ id: stranger, sig: unsubscribeSig(stranger, LINK_KEY) });
    assert.equal(absent.status, 200, 'same page whether or not the address was on the list');
});

test('unsubscribe without a link key is a 503 page', async () => {
    const { unsub } = rig({ linkKey: '' });
    const id = subscriberId('pat@example.com');
    assert.equal((await unsub({ id, sig: 'a' })).status, 503);
});

/* ------------------------------------------------------------------ Firestore */

function fakeGoogle() {
    const docs = new Map<string, unknown>();
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? 'GET';
        calls.push(`${method} ${u.replace(/\?.*$/, '')}`);
        if (u.includes('metadata.google.internal')) {
            assert.equal((init?.headers as Record<string, string>)['metadata-flavor'], 'Google');
            if (u.endsWith('/token')) return Response.json({ access_token: 'tok', expires_in: 3600 });
            return new Response('proj-1');
        }
        assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer tok');
        assert.match(u, /projects\/proj-1\/databases\/\(default\)\/documents\/subscribers/);
        const id = method === 'POST' ? new URL(u).searchParams.get('documentId')! : u.split('/subscribers/')[1]!.split('?')[0]!;
        if (method === 'POST') {
            if (docs.has(id)) return new Response('{"error":{"status":"ALREADY_EXISTS"}}', { status: 409 });
            docs.set(id, JSON.parse(String(init!.body)));
            return Response.json({});
        }
        if (!docs.has(id)) return new Response('{"error":{"status":"NOT_FOUND"}}', { status: 404 });
        const mask = new URL(u).searchParams.getAll('updateMask.fieldPaths');
        const prev = docs.get(id) as { fields: Record<string, unknown> };
        const next = JSON.parse(String(init!.body)) as { fields: Record<string, unknown> };
        for (const f of mask) prev.fields[f] = next.fields[f];
        return Response.json(prev);
    }) as unknown as typeof globalThis.fetch;
    return { docs, calls, fetch: fetchImpl };
}

test('Firestore: create, then update without touching createdAt, then unsubscribe', async () => {
    const g = fakeGoogle();
    const store = firestoreStore({ fetch: g.fetch, now: () => Date.UTC(2026, 9, 27) });
    const rec = { email: 'pat@example.com', consentVersion: 'v1', source: 'practice-gate', utm: { utm_source: 'tiktok' }, at: Date.UTC(2026, 9, 27) };
    const id = subscriberId(rec.email);
    assert.equal(await store.upsert(id, rec), 'created');
    const created = (g.docs.get(id) as { fields: Record<string, { timestampValue?: string }> }).fields.createdAt!.timestampValue;
    assert.equal(await store.upsert(id, { ...rec, at: Date.UTC(2026, 9, 28) }), 'updated');
    const f = (g.docs.get(id) as { fields: Record<string, { timestampValue?: string; booleanValue?: boolean }> }).fields;
    assert.equal(f.createdAt!.timestampValue, created);
    assert.equal(f.lastSignupAt!.timestampValue, '2026-10-28T00:00:00.000Z');
    assert.equal(await store.unsubscribe(id, Date.UTC(2026, 9, 29)), true);
    assert.equal((g.docs.get(id) as { fields: Record<string, { booleanValue?: boolean }> }).fields.unsubscribed!.booleanValue, true);
    assert.equal(await store.unsubscribe(subscriberId('nobody@example.com'), 0), false);
    assert.equal(g.calls.filter(c => c.endsWith('/token')).length, 1, 'token cached across calls');
});

test('Firestore: an unreachable metadata server is StoreUnavailable, surfaced as 503', async () => {
    const failing = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof globalThis.fetch;
    const app = createApp({
        fetch: failing, now: Date.now, bank: tinyBank(),
        env: { UNLOCK_SIGNING_KEYS: SIGNING, GUMROAD_PRODUCT_ID: 'p', SUBSCRIBE_STORE: 'firestore' },
    });
    const res = await app({ method: 'POST', path: '/v1/subscribe', headers: {}, body: good(), ip: '1.2.3.4' });
    assert.equal(res.status, 503);
});

/* ------------------------------------------------------------------- over HTTP */

test('over a real socket: CORS on subscribe, a form-encoded one-click unsubscribe, no address in the log', async () => {
    const lines: string[] = [];
    const stream = new PassThrough();
    stream.on('data', (c: Buffer) => lines.push(...c.toString().trim().split('\n')));
    const store = memoryStore();
    const app = createApp({
        fetch: fakeGumroad({}).fetch, now: Date.now, bank: tinyBank(), log: makeLog(stream), subscribers: store,
        env: { UNLOCK_SIGNING_KEYS: SIGNING, GUMROAD_PRODUCT_ID: 'p', SUBSCRIBE_LINK_KEY: LINK_KEY },
    });
    const origin = 'https://learn.securepathdigital.net';
    const server = createServer({ handle: app, log: makeLog(stream), allowedOrigins: parseOrigins(origin) });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
        const pre = await fetch(`${base}/v1/subscribe`, { method: 'OPTIONS', headers: { origin } });
        assert.equal(pre.status, 204);
        const r = await fetch(`${base}/v1/subscribe`, {
            method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(good()),
        });
        assert.equal(r.status, 200);
        assert.equal(r.headers.get('access-control-allow-origin'), origin);
        const id = subscriberId('pat@example.com');
        const u = await fetch(`${base}/v1/unsubscribe?id=${id}&sig=${unsubscribeSig(id, LINK_KEY)}`, {
            method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
        });
        assert.equal(u.status, 200);
        assert.equal(store.rows.get(id)!.unsubscribed, true);
        assert.equal(lines.join('\n').includes('pat@example.com'), false);
        assert.equal(lines.join('\n').includes('sig='), false, 'the signature is never logged');
    } finally {
        await new Promise<void>(r => server.close(() => r()));
    }
});

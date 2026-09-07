import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../src/ratelimit.ts';
import { asErr, harness, KEY_GOOD, sale, SIGNING } from '../testkit.ts';
import { parseSigningKeys, sign, subOf } from '../src/token.ts';

const keys = parseSigningKeys(SIGNING);
const DAY = 86_400;

/** 16 distinct, well-formed keys, so an IP limit can be reached without a sub limit. */
const nth = (i: number): string => {
    const g = i.toString(16).toUpperCase().padStart(8, '0');
    return `${g}-${g}-${g}-AAAAAAAA`;
};

test('the window counts, refuses past the limit, and rolls', () => {
    let t = 1_000_000;
    const lim = createLimiter(() => t);
    for (let i = 0; i < 3; i++) assert.equal(lim.hit('a', 3, 60_000).ok, true);
    assert.deepEqual(lim.hit('a', 3, 60_000), { ok: false, retryAfter: 60 });
    assert.equal(lim.hit('b', 3, 60_000).ok, true, 'buckets are independent');

    t += 30_000;
    assert.deepEqual(lim.hit('a', 3, 60_000), { ok: false, retryAfter: 30 });
    t += 30_001;
    assert.equal(lim.hit('a', 3, 60_000).ok, true, 'the window rolled');
});

test('activate is 5 a minute per IP', async () => {
    const h = harness({ replies: Object.fromEntries([...Array(9).keys()].map(i => [nth(i), sale(0)])) });
    for (let i = 0; i < 5; i++) {
        assert.equal((await h.post('/v1/activate', { key: nth(i) })).status, 200, `call ${i}`);
    }
    const blocked = await h.post('/v1/activate', { key: nth(5) });
    assert.equal(blocked.status, 429);
    assert.equal(asErr(blocked).code, 'rate_limited');
    assert.equal(asErr(blocked).retryAfter, 60);
    assert.equal(blocked.headers['retry-after'], '60');
    assert.equal(h.gum.increments(), 5, 'a rate-limited call never reaches Gumroad');

    assert.equal((await h.post('/v1/activate', { key: nth(6) }, { ip: '198.51.100.4' })).status, 200, 'another IP is unaffected');

    h.clock.t += 60_001;
    assert.equal((await h.post('/v1/activate', { key: nth(7) })).status, 200);
});

test('activate is 3 an hour per sub, whatever the IP', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(0) } });
    for (let i = 0; i < 3; i++) {
        assert.equal((await h.post('/v1/activate', { key: KEY_GOOD }, { ip: `198.51.100.${i}` })).status, 200, `call ${i}`);
    }
    const blocked = await h.post('/v1/activate', { key: KEY_GOOD }, { ip: '198.51.100.9' });
    assert.equal(blocked.status, 429);
    assert.equal(asErr(blocked).retryAfter, 3_600);
    assert.equal(h.gum.increments(), 3);

    h.clock.t += 3_600_001;
    assert.equal((await h.post('/v1/activate', { key: KEY_GOOD }, { ip: '198.51.100.9' })).status, 200);
});

test('refresh is 30 a minute per IP', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(1) } });
    const iat = Math.floor(h.clock.t / 1000);
    const token = sign({ v: 1, kid: 'k2', sub: subOf(KEY_GOOD), src: 'gumroad', iat, exp: iat + DAY, ed: '2026-09-06' }, keys);
    for (let i = 0; i < 30; i++) {
        assert.equal((await h.post('/v1/refresh', { key: KEY_GOOD, token })).status, 200, `call ${i}`);
    }
    const blocked = await h.post('/v1/refresh', { key: KEY_GOOD, token });
    assert.equal(blocked.status, 429);
    assert.equal(asErr(blocked).retryAfter, 60);
    assert.equal(h.gum.increments(), 0, 'thirty refreshes still spend nothing');
});

test('a bad key burns the IP allowance but not a sub allowance', async () => {
    const h = harness();
    for (let i = 0; i < 5; i++) assert.equal((await h.post('/v1/activate', { key: 'junk' })).status, 400);
    assert.equal((await h.post('/v1/activate', { key: 'junk' })).status, 429);
});

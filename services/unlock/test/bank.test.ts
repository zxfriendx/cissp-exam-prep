import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PaidBank } from '../../../src/lib/unlock-protocol.ts';
import { loadBank, makeBank } from '../src/bank.ts';
import { harness, KEY_GOOD, sale, SIGNING, TINY_BANK } from '../testkit.ts';
import { parseSigningKeys, sign, subOf } from '../src/token.ts';
import { buildPaid, readBank } from '../../../scripts/build-paid.mjs';

const keys = parseSigningKeys(SIGNING);
const PAID = join(import.meta.dirname, '..', 'data', 'paid.json');

const bearer = (key: string, expOffset = 86_400, at = Date.UTC(2026, 8, 7, 12)): Record<string, string> => {
    const iat = Math.floor(at / 1000);
    return { authorization: `Bearer ${sign({ v: 1, kid: 'k2', sub: subOf(key), src: 'gumroad', iat, exp: iat + expOffset, ed: '2026-09-06' }, keys)}` };
};

test('the bank refuses anyone without a live token', async () => {
    const h = harness();
    assert.equal((await h.get('/v1/bank')).status, 401);
    assert.equal((await h.get('/v1/bank', { authorization: 'Bearer junk' })).status, 401);
    assert.equal((await h.get('/v1/bank', { authorization: sign({ v: 1, kid: 'k2', sub: 'x', src: 'grant', iat: 1, exp: 9e9, ed: 'e' }, keys) })).status, 401, 'the Bearer prefix is required');

    const expired = await h.get('/v1/bank', bearer(KEY_GOOD, -1));
    assert.equal(expired.status, 401);
    assert.equal((expired.json as { code: string }).code, 'token_expired');
    // No grace here: grace is a refresh affordance, not a way to keep reading.
});

test('a denied sub cannot read the bank even with a valid token', async () => {
    const h = harness({ env: { UNLOCK_DENY: subOf(KEY_GOOD).slice(0, 8) } });
    const res = await h.get('/v1/bank', bearer(KEY_GOOD));
    assert.equal(res.status, 403);
    assert.equal((res.json as { code: string }).code, 'denied');
});

test('the bank is served, gzipped when that is welcome, and never cached', async () => {
    const h = harness();
    const plain = await h.get('/v1/bank', bearer(KEY_GOOD));
    assert.equal(plain.status, 200);
    assert.equal(plain.headers['content-encoding'], undefined);
    assert.equal(plain.headers['cache-control'], 'private, no-store');
    assert.equal(plain.headers.etag, '"2026-09-06"');
    assert.equal(plain.body?.toString('utf8'), TINY_BANK);

    const gz = await h.get('/v1/bank', { ...bearer(KEY_GOOD), 'accept-encoding': 'br, gzip;q=0.9' });
    assert.equal(gz.headers['content-encoding'], 'gzip');
    assert.equal(gunzipSync(gz.body!).toString('utf8'), TINY_BANK);
    assert.equal(gz.headers['content-length'], String(gz.body!.length));

    const brOnly = await h.get('/v1/bank', { ...bearer(KEY_GOOD), 'accept-encoding': 'br' });
    assert.equal(brOnly.headers['content-encoding'], undefined);
});

test('a matching ETag is a 304 with no body', async () => {
    const h = harness();
    for (const inm of ['"2026-09-06"', 'W/"2026-09-06"', '*', '"other", "2026-09-06"']) {
        const res = await h.get('/v1/bank', { ...bearer(KEY_GOOD), 'if-none-match': inm });
        assert.equal(res.status, 304, inm);
        assert.equal(res.body, undefined);
        assert.equal(res.headers.etag, '"2026-09-06"');
    }
    const stale = await h.get('/v1/bank', { ...bearer(KEY_GOOD), 'if-none-match': '"2026-01-01"' });
    assert.equal(stale.status, 200);
});

test('the bank never calls Gumroad', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(1) } });
    await h.get('/v1/bank', bearer(KEY_GOOD));
    assert.equal(h.gum.calls.length, 0);
});

test('makeBank refuses a bank it cannot serve', () => {
    assert.throws(() => makeBank('{"schema":2,"edition":"e","domains":[]}'), /schema is 2/);
    assert.throws(() => makeBank('{"schema":1,"domains":[]}'), /no edition/);
    assert.throws(() => makeBank('{"schema":1,"edition":"e","domains":[]}'), /no domains/);
    assert.throws(() => makeBank('{"schema":1,"edition":"e","domains":[{"id":"d1"}]}'), /malformed/);
    assert.throws(() => makeBank('{"schema":1,"edition":"e","domains":[{"id":"d1","questions":[],"stimuli":[]}]}'), /no questions/);
});

test('golden: the served bank is build-paid.mjs output, 750 questions and 133 scenarios', () => {
    const bank = loadBank(PAID);
    assert.equal(bank.items, 750);
    assert.equal(bank.stimuli, 133);
    assert.equal(bank.json.schema, 1);
    assert.equal(bank.json.domains.length, 8);

    // Byte-for-byte against a fresh cut, so a stale paid.json cannot ship.
    const fresh = buildPaid(readBank()) as PaidBank;
    assert.deepEqual(bank.json, fresh);
    assert.equal(readFileSync(PAID, 'utf8').trim(), JSON.stringify(fresh));

    // Every question carries what the app renders.
    for (const d of bank.json.domains) {
        for (const q of d.questions) {
            assert.ok(q.id && q.question && q.correctAnswer && q.explanation, `${d.id} ${q.id} is incomplete`);
        }
    }
    assert.ok(bank.gzip.length < bank.raw.length / 3, `gzip is ${bank.gzip.length} of ${bank.raw.length}`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSigningKeys, sign, subOf, verify } from '../src/token.ts';
import type { TokenPayload } from '../src/token.ts';

const K2 = `k2:${'a'.repeat(64)}`;
const K1 = `k1:${'b'.repeat(64)}`;
const keys = parseSigningKeys(`${K2},${K1}`);
const rotated = parseSigningKeys(`k3:${'c'.repeat(64)},${K2}`);
const onlyOld = parseSigningKeys(K1);

const payload = (over: Partial<TokenPayload> = {}): TokenPayload =>
    ({ v: 1, kid: 'ignored', sub: subOf('AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD'), src: 'gumroad', iat: 1_000, exp: 2_000, ed: '2026-09-06', ...over });

test('parseSigningKeys takes the first as the signer and keeps the rest', () => {
    assert.deepEqual(keys.map(k => k.kid), ['k2', 'k1']);
    assert.throws(() => parseSigningKeys(''), /empty/);
    assert.throws(() => parseSigningKeys('k1'), /kid:hex/);
    assert.throws(() => parseSigningKeys('k1:zz'), /16 bytes/);
});

test('a token signs with the first key and stamps its kid', () => {
    const t = sign(payload(), keys);
    const body = JSON.parse(Buffer.from(t.split('.')[0]!, 'base64url').toString());
    assert.equal(body.kid, 'k2');
    const got = verify(t, keys, { now: 1_500 });
    assert.equal(got.ok, true);
    assert.equal(got.ok && got.payload.sub, payload().sub);
});

test('rotation: a token signed by the old key still verifies once it is second', () => {
    const t = sign(payload(), keys);                       // signed k2
    assert.equal(verify(t, rotated, { now: 1_500 }).ok, true);  // k3 signs now, k2 still verifies
    assert.equal(verify(t, onlyOld, { now: 1_500 }).ok, false); // k2 retired
});

test('a tampered payload, a bad signature and junk are all bad_token', () => {
    const t = sign(payload(), keys);
    const [body, mac] = t.split('.') as [string, string];
    const forged = Buffer.from(JSON.stringify({ ...payload(), exp: 9_999_999 })).toString('base64url');
    assert.deepEqual(verify(`${forged}.${mac}`, keys, { now: 1_500 }), { ok: false, code: 'bad_token' });
    assert.deepEqual(verify(`${body}.${'A'.repeat(43)}`, keys, { now: 1_500 }), { ok: false, code: 'bad_token' });
    assert.deepEqual(verify('nonsense', keys, { now: 1_500 }), { ok: false, code: 'bad_token' });
    assert.deepEqual(verify(`${body}.${mac}.${mac}`, keys, { now: 1_500 }), { ok: false, code: 'bad_token' });
    assert.deepEqual(verify('.', keys, { now: 1_500 }), { ok: false, code: 'bad_token' });
});

test('expiry: none, within grace, outside grace', () => {
    const t = sign(payload(), keys);
    assert.equal(verify(t, keys, { now: 2_000 }).ok, true);                       // exactly at exp
    assert.deepEqual(verify(t, keys, { now: 2_001 }), { ok: false, code: 'token_expired' });
    assert.equal(verify(t, keys, { now: 2_001, graceSec: 100 }).ok, true);
    assert.deepEqual(verify(t, keys, { now: 2_101, graceSec: 100 }), { ok: false, code: 'token_expired' });
});

test('sub is a hash, is stable under normalisation, and is not the key', () => {
    const key = 'AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD';
    assert.equal(subOf(key), subOf(`  ${key.toLowerCase()} `));
    assert.match(subOf(key), /^[0-9a-f]{16}$/);
    assert.notEqual(subOf(key), subOf('11111111-22222222-33333333-44444444'));
});

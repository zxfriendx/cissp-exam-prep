import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GumroadVerify } from '../src/types.ts';
import type { PolicyConfig } from '../src/policy.ts';
import { checkKey, decideActivation, decideRefresh, isDenied, parseDeny, parseGrants } from '../src/policy.ts';
import { subOf } from '../src/token.ts';
import { KEY_GOOD, KEY_GRANT } from '../testkit.ts';

const cfg = (over: Partial<PolicyConfig> = {}): PolicyConfig =>
    ({ grants: new Map(), deny: [], deviceCap: 4, ...over });

const probe = (over: Partial<GumroadVerify> = {}): GumroadVerify =>
    ({ ok: true, uses: 0, refunded: false, chargebacked: false, disabled: false, raw: {}, ...over });

test('key format: shape, case and whitespace', () => {
    assert.equal(checkKey(`  ${KEY_GOOD.toLowerCase()}  `).ok, true);
    for (const bad of ['', 'nope', KEY_GOOD.slice(1), `${KEY_GOOD}-EEEEEEEE`, 'GGGGGGGG-BBBBBBBB-CCCCCCCC-DDDDDDDD', 42, null, undefined]) {
        assert.deepEqual(checkKey(bad), { ok: false, code: 'invalid_key_format' }, `should reject ${String(bad)}`);
    }
});

test('parseGrants keys by normalised key and insists on the licence shape', () => {
    const grants = parseGrants(` press:${KEY_GRANT.toLowerCase()} , support:${KEY_GOOD}`);
    assert.equal(grants.get(KEY_GRANT), 'press');
    assert.equal(grants.get(KEY_GOOD), 'support');
    assert.equal(parseGrants(undefined).size, 0);
    assert.throws(() => parseGrants('nocolon'), /label:key/);
    assert.throws(() => parseGrants('press:not-a-key'), /licence-key-shaped/);
});

test('parseDeny is a lower-cased prefix list', () => {
    const deny = parseDeny(' AB12 , cd34 ,, ');
    assert.deepEqual(deny, ['ab12', 'cd34']);
    assert.equal(isDenied('ab12ffffffffffff', deny), true);
    assert.equal(isDenied('ffffffffffffffff', deny), false);
});

test('activation asks Gumroad only after format, denylist and grants', () => {
    assert.deepEqual(decideActivation({ rawKey: 'junk', cfg: cfg(), probe: null }), { kind: 'reject', code: 'invalid_key_format' });

    const denied = decideActivation({ rawKey: KEY_GOOD, cfg: cfg({ deny: [subOf(KEY_GOOD).slice(0, 6)] }), probe: null });
    assert.deepEqual(denied, { kind: 'reject', code: 'denied' });

    const grant = decideActivation({ rawKey: KEY_GRANT, cfg: cfg({ grants: new Map([[KEY_GRANT, 'press']]) }), probe: null });
    assert.equal(grant.kind, 'grant');

    assert.equal(decideActivation({ rawKey: KEY_GOOD, cfg: cfg(), probe: null }).kind, 'probe');
});

test('a Gumroad answer maps to exactly one code', () => {
    const cases: [Partial<GumroadVerify>, string][] = [
        [{ ok: false }, 'not_found'],
        [{ refunded: true }, 'refunded'],
        [{ chargebacked: true }, 'chargebacked'],
        [{ disabled: true }, 'disabled'],
    ];
    for (const [over, code] of cases) {
        assert.deepEqual(
            decideActivation({ rawKey: KEY_GOOD, cfg: cfg(), probe: probe(over) }),
            { kind: 'reject', code },
        );
    }
});

test('the device cap is judged on the probe, and answers with the numbers', () => {
    assert.equal(decideActivation({ rawKey: KEY_GOOD, cfg: cfg(), probe: probe({ uses: 3 }) }).kind, 'increment');
    assert.deepEqual(
        decideActivation({ rawKey: KEY_GOOD, cfg: cfg(), probe: probe({ uses: 4 }) }),
        { kind: 'reject', code: 'device_cap', uses: 4, cap: 4 },
    );
    assert.equal(decideActivation({ rawKey: KEY_GOOD, cfg: cfg({ deviceCap: 9 }), probe: probe({ uses: 4 }) }).kind, 'increment');
});

test('refresh runs the same gauntlet but never the cap', () => {
    assert.equal(decideRefresh({ rawKey: KEY_GOOD, cfg: cfg(), probe: probe({ uses: 99 }) }).kind, 'issue');
    assert.deepEqual(decideRefresh({ rawKey: KEY_GOOD, cfg: cfg(), probe: probe({ refunded: true }) }), { kind: 'reject', code: 'refunded' });
    assert.deepEqual(decideRefresh({ rawKey: 'junk', cfg: cfg(), probe: null }), { kind: 'reject', code: 'invalid_key_format' });
});

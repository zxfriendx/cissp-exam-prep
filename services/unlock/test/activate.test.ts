import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asErr, asOk, harness, KEY_GOOD, KEY_GRANT, KEY_OTHER, sale } from '../testkit.ts';
import { subOf, parseSigningKeys, verify } from '../src/token.ts';
import { SIGNING } from '../testkit.ts';

const keys = parseSigningKeys(SIGNING);

test('a clean activation spends exactly one use, and reads before it spends', async () => {
    const h = harness({ replies: { [KEY_GOOD]: (call) => sale(call.increment ? 2 : 1) } });
    const res = await h.post('/v1/activate', { key: KEY_GOOD });

    assert.equal(res.status, 200);
    assert.deepEqual(h.gum.calls.map(c => c.increment), [false, true]);
    assert.equal(h.gum.increments(), 1);

    const body = asOk(res);
    assert.equal(body.uses, 2);
    assert.equal(body.cap, 4);
    assert.equal(body.edition, '2026-09-06');
    const checked = verify(body.token, keys, { now: Math.floor(h.clock.t / 1000) });
    assert.equal(checked.ok, true);
    assert.equal(checked.ok && checked.payload.sub, subOf(KEY_GOOD));
    assert.equal(checked.ok && checked.payload.src, 'gumroad');
    assert.equal(checked.ok && checked.payload.sale, 'sale_1');
    assert.equal(body.exp, Math.floor(h.clock.t / 1000) + 30 * 86_400);
});

test('the key is normalised before anything sees it', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(0) } });
    const res = await h.post('/v1/activate', { key: `  ${KEY_GOOD.toLowerCase()}\n` });
    assert.equal(res.status, 200);
    assert.equal(h.gum.calls[0]?.key, KEY_GOOD);
});

test('a malformed key never reaches Gumroad', async () => {
    const h = harness();
    for (const key of ['', 'not-a-key', 12345, null]) {
        const res = await h.post('/v1/activate', { key });
        assert.equal(res.status, 400);
        assert.equal(asErr(res).code, 'invalid_key_format');
    }
    assert.equal(await h.post('/v1/activate', {}).then(r => r.status), 400);
    assert.equal(h.gum.calls.length, 0);
});

test('at the cap: refused, with the numbers, before any increment', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(4) } });
    const res = await h.post('/v1/activate', { key: KEY_GOOD });

    assert.equal(res.status, 409);
    assert.deepEqual(asErr(res), { ok: false, code: 'device_cap', uses: 4, cap: 4 });
    assert.equal(h.gum.increments(), 0, 'an over-cap buyer must not lose an activation to the refusal');
    assert.equal(h.gum.calls.length, 1);
});

test('one under the cap still activates', async () => {
    const h = harness({ replies: { [KEY_GOOD]: (c) => sale(c.increment ? 4 : 3) } });
    const res = await h.post('/v1/activate', { key: KEY_GOOD });
    assert.equal(res.status, 200);
    assert.equal(asOk(res).uses, 4);
    assert.equal(h.gum.increments(), 1);
});

test('DEVICE_CAP is configurable', async () => {
    const h = harness({ env: { DEVICE_CAP: '2' }, replies: { [KEY_GOOD]: sale(2) } });
    assert.equal(asErr(await h.post('/v1/activate', { key: KEY_GOOD })).cap, 2);
});

test('every Gumroad verdict maps to its own code, and none of them increments', async () => {
    const cases: [Record<string, unknown> | 'notfound' | 'garbage', string, number][] = [
        [{ success: true, uses: 1, purchase: { refunded: true } }, 'refunded', 403],
        [{ success: true, uses: 1, purchase: { chargebacked: true } }, 'chargebacked', 403],
        [{ success: true, uses: 1, purchase: { disputed: true } }, 'chargebacked', 403],
        [{ success: true, uses: 1, purchase: { disabled: true } }, 'disabled', 403],
        ['notfound', 'not_found', 404],
        ['garbage', 'gumroad_unavailable', 503],
    ];
    for (const [body, code, status] of cases) {
        const reply = body === 'notfound'
            ? { status: 404, body: { success: false, error: { code: 'not_found', status_code: 404 } } }
            : body === 'garbage'
                ? { status: 502, body: '<html>Bad Gateway</html>' }
                : { body };
        const h = harness({ replies: { [KEY_GOOD]: reply } });
        const res = await h.post('/v1/activate', { key: KEY_GOOD });
        assert.equal(asErr(res).code, code, `${JSON.stringify(body)} -> ${code}`);
        assert.equal(res.status, status);
        assert.equal(h.gum.increments(), 0);
    }
});

test('the documented error shape is rejected the same way the live one is', async () => {
    // Docs promise {success:false,message:"..."}; production returned
    // {success:false,error:{...}}. Neither shape is parsed, only `success`.
    const h = harness({ replies: { [KEY_GOOD]: { status: 404, body: { success: false, message: 'That license does not exist for the provided product.' } } } });
    assert.equal(asErr(await h.post('/v1/activate', { key: KEY_GOOD })).code, 'not_found');
    assert.equal(h.logs.some(l => l.msg === 'gumroad_rejected' && JSON.stringify(l.fields.raw).includes('does not exist')), true, 'the raw body is logged');
});

test('an unreachable Gumroad is a 503, not a rejection', async () => {
    const h = harness({ replies: { [KEY_GOOD]: { throws: true } } });
    const res = await h.post('/v1/activate', { key: KEY_GOOD });
    assert.equal(res.status, 503);
    assert.equal(asErr(res).code, 'gumroad_unavailable');
});

test('a licence refunded between the two calls is caught after the increment', async () => {
    const h = harness({
        replies: { [KEY_GOOD]: (c) => (c.increment ? { body: { success: true, uses: 2, purchase: { refunded: true } } } : sale(1)) },
    });
    assert.equal(asErr(await h.post('/v1/activate', { key: KEY_GOOD })).code, 'refunded');
});

test('a grant key issues a token and never calls Gumroad', async () => {
    const h = harness({ env: { UNLOCK_GRANTS: `press:${KEY_GRANT}` } });
    const res = await h.post('/v1/activate', { key: KEY_GRANT });

    assert.equal(res.status, 200);
    assert.equal(h.gum.calls.length, 0);
    const body = asOk(res);
    assert.equal(body.uses, undefined);
    const checked = verify(body.token, keys, { now: Math.floor(h.clock.t / 1000) });
    assert.equal(checked.ok && checked.payload.src, 'grant');
    assert.equal(h.logs.some(l => l.msg === 'activated' && l.fields.grant === 'press'), true);
});

test('a grant key still has to look like a licence key', async () => {
    assert.throws(() => harness({ env: { UNLOCK_GRANTS: 'press:hello' } }), /licence-key-shaped/);
});

test('the denylist is checked before Gumroad and before grants', async () => {
    const h = harness({
        env: { UNLOCK_DENY: subOf(KEY_GRANT).slice(0, 8), UNLOCK_GRANTS: `press:${KEY_GRANT}` },
        replies: { [KEY_OTHER]: sale(0) },
    });
    assert.equal(asErr(await h.post('/v1/activate', { key: KEY_GRANT })).code, 'denied');
    assert.equal(h.gum.calls.length, 0);
    assert.equal((await h.post('/v1/activate', { key: KEY_OTHER })).status, 200);
});

test('nothing logged carries the licence key', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(0) } });
    await h.post('/v1/activate', { key: KEY_GOOD });
    assert.equal(JSON.stringify(h.logs).includes(KEY_GOOD), false);
    assert.equal(h.logs.some(l => l.fields.sub === subOf(KEY_GOOD)), true);
});

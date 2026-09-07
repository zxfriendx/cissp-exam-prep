import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asErr, asOk, harness, KEY_GOOD, KEY_GRANT, KEY_OTHER, sale, SIGNING } from '../testkit.ts';
import { REFRESH_GRACE } from '../src/app.ts';
import { parseSigningKeys, sign, subOf, verify } from '../src/token.ts';

const keys = parseSigningKeys(SIGNING);
const DAY = 86_400;

const tokenFor = (key: string, exp: number, over: Record<string, unknown> = {}): string =>
    sign({ v: 1, kid: 'k2', sub: subOf(key), src: 'gumroad', iat: exp - 30 * DAY, exp, ed: '2026-09-06', ...over }, keys);

test('a refresh re-checks the licence and never increments', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(3) } });
    const secs = Math.floor(h.clock.t / 1000);
    const res = await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) });

    assert.equal(res.status, 200);
    assert.deepEqual(h.gum.calls.map(c => c.increment), [false]);
    assert.equal(h.gum.increments(), 0);
    const body = asOk(res);
    assert.equal(body.uses, 3);
    assert.equal(body.cap, 4);
    assert.equal(body.exp, secs + 30 * DAY, 'a refresh resets the full 30 days');
    assert.equal(verify(body.token, keys, { now: secs }).ok, true);
});

test('a refresh at the cap still succeeds -- the activation was already paid for', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(4) } });
    const secs = Math.floor(h.clock.t / 1000);
    const res = await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) });
    assert.equal(res.status, 200);
    assert.equal(asOk(res).uses, 4);
    assert.equal(h.gum.increments(), 0);
});

test('the token has to belong to the key', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(1), [KEY_OTHER]: sale(1) } });
    const secs = Math.floor(h.clock.t / 1000);
    const res = await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_OTHER, secs + DAY) });
    assert.equal(res.status, 401);
    assert.equal(asErr(res).code, 'bad_token');
    assert.equal(h.gum.calls.length, 0);
});

test('a missing, junk or forged token is bad_token', async () => {
    const h = harness({ replies: { [KEY_GOOD]: sale(1) } });
    const secs = Math.floor(h.clock.t / 1000);
    const good = tokenFor(KEY_GOOD, secs + DAY);
    const forged = `${good.split('.')[0]}.${'A'.repeat(43)}`;
    for (const token of [undefined, '', 'junk', forged, 42]) {
        assert.equal(asErr(await h.post('/v1/refresh', { key: KEY_GOOD, token })).code, 'bad_token', String(token));
    }
    assert.equal(h.gum.calls.length, 0);
});

test('grace: an expired token refreshes for 90 days and not a second longer', async () => {
    const secs = () => Math.floor(h.clock.t / 1000);
    const h = harness({ replies: { [KEY_GOOD]: sale(1) } });
    const exp = secs() - 1;                                        // expired a second ago
    const token = tokenFor(KEY_GOOD, exp);

    assert.equal((await h.post('/v1/refresh', { key: KEY_GOOD, token })).status, 200);

    h.clock.t = (exp + REFRESH_GRACE) * 1000;                      // last moment of grace
    assert.equal((await h.post('/v1/refresh', { key: KEY_GOOD, token })).status, 200);

    h.clock.t = (exp + REFRESH_GRACE + 1) * 1000;
    const late = await h.post('/v1/refresh', { key: KEY_GOOD, token });
    assert.equal(late.status, 401);
    assert.equal(asErr(late).code, 'token_expired');
});

test('a refunded licence loses the refresh', async () => {
    const secs = Math.floor(Date.UTC(2026, 8, 7, 12) / 1000);
    for (const [purchase, code] of [[{ refunded: true }, 'refunded'], [{ chargebacked: true }, 'chargebacked'], [{ disabled: true }, 'disabled']] as const) {
        const h = harness({ replies: { [KEY_GOOD]: { body: { success: true, uses: 1, purchase } } } });
        const res = await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) });
        assert.equal(asErr(res).code, code);
        assert.equal(res.status, 403);
    }
    const gone = harness({ replies: {} });
    assert.equal(asErr(await gone.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) })).code, 'not_found');
});

test('a grant key refreshes without Gumroad', async () => {
    const h = harness({ env: { UNLOCK_GRANTS: `press:${KEY_GRANT}` } });
    const secs = Math.floor(h.clock.t / 1000);
    const res = await h.post('/v1/refresh', { key: KEY_GRANT, token: tokenFor(KEY_GRANT, secs + DAY, { src: 'grant' }) });
    assert.equal(res.status, 200);
    assert.equal(h.gum.calls.length, 0);
    assert.equal(verify(asOk(res).token, keys, { now: secs }).ok && true, true);
});

test('the denylist cuts a refresh before Gumroad', async () => {
    const h = harness({ env: { UNLOCK_DENY: subOf(KEY_GOOD).slice(0, 8) }, replies: { [KEY_GOOD]: sale(1) } });
    const secs = Math.floor(h.clock.t / 1000);
    const res = await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) });
    assert.equal(res.status, 403);
    assert.equal(asErr(res).code, 'denied');
    assert.equal(h.gum.calls.length, 0);
});

test('a retired signing key stops refreshing', async () => {
    const h = harness({ env: { UNLOCK_SIGNING_KEYS: `k3:${'c'.repeat(64)}` }, replies: { [KEY_GOOD]: sale(1) } });
    const secs = Math.floor(h.clock.t / 1000);
    assert.equal(asErr(await h.post('/v1/refresh', { key: KEY_GOOD, token: tokenFor(KEY_GOOD, secs + DAY) })).code, 'bad_token');
});

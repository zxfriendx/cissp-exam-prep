/**
 * The entitlement state machine.
 *
 * These are the decisions that are expensive to get wrong and impossible to
 * check by clicking: a buyer offline on a plane must stay unlocked, a refund
 * must actually take the questions away, and a service that is down must not be
 * able to look like a refund. All three are pure functions of a snapshot and a
 * clock, which is the only reason they can be tested at all.
 *
 * src/lib/entitlement.ts is imported directly; Node 22 strips the types, and
 * scripts/node-ts-resolve.mjs supplies the `@/` alias its runtime import uses.
 * That import has to be dynamic — see the hook's own docstring.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

register('../scripts/node-ts-resolve.mjs', import.meta.url);

const {
    ASSUMED_TOKEN_TTL_SECONDS,
    MIN_REFRESH_INTERVAL_SECONDS,
    REFRESH_AFTER_SECONDS,
    REFRESH_GRACE_SECONDS,
    SECONDS_PER_DAY,
    SUPPORT_PHONE,
    decodeTokenPayload,
    isEntitled,
    mayServePaidBank,
    messageFor,
    messageForError,
    shouldRefresh,
    statusFor,
} = await import('../src/lib/entitlement.ts');
const { TERMINAL_CODES } = await import('../src/lib/unlock-protocol.ts');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** The codes as the CONTRACT spells them, not as this test remembers them. */
const allCodes = () => {
    const src = readFileSync(join(root, 'src', 'lib', 'unlock-protocol.ts'), 'utf8');
    const union = /export type UnlockErrorCode =([\s\S]*?);/.exec(src);
    assert.ok(union, 'UnlockErrorCode is no longer a union literal — this test needs updating');
    return [...union[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
};

const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const tokenFor = (payload) => `${b64url(payload)}.c2lnbmF0dXJl`;

// ── the token payload ────────────────────────────────────────────────────────

test('reads exp, iat and ed out of the payload half', () => {
    const t = tokenFor({ exp: 1770000000, iat: 1767408000, ed: '2026-09-06', sub: 'ignored' });
    assert.deepEqual(decodeTokenPayload(t), {
        exp: 1770000000, iat: 1767408000, ed: '2026-09-06', sub: 'ignored',
    });
});

test('survives base64url without padding and with - and _', () => {
    // A payload whose base64 needs padding and contains both substituted chars.
    const payload = { ed: '2026-09-06', note: 'a??>?~ +/ b', iat: 1 };
    const decoded = decodeTokenPayload(tokenFor(payload));
    assert.equal(decoded.note, payload.note);
});

test('a damaged token decodes to null rather than throwing', () => {
    for (const bad of [null, undefined, '', '.', 'not-base64!!!.sig', 'eyJ9.sig', b64url([1, 2]) + '.sig']) {
        assert.equal(decodeTokenPayload(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
});

test('a payload that is a JSON scalar is not a payload', () => {
    assert.equal(decodeTokenPayload(`${Buffer.from('42').toString('base64url')}.sig`), null);
});

// ── when to re-check ─────────────────────────────────────────────────────────

const NOW = 1_800_000_000;

test('a fresh token is left alone', () => {
    const iat = NOW - 3 * SECONDS_PER_DAY;
    assert.equal(shouldRefresh(NOW, iat, NOW + 27 * SECONDS_PER_DAY, null), false);
});

test('a token ten days old is due', () => {
    const iat = NOW - REFRESH_AFTER_SECONDS;
    assert.equal(shouldRefresh(NOW, iat, NOW + 20 * SECONDS_PER_DAY, null), true);
});

test('one day short of ten is not due', () => {
    const iat = NOW - REFRESH_AFTER_SECONDS + SECONDS_PER_DAY;
    assert.equal(shouldRefresh(NOW, iat, NOW + 20 * SECONDS_PER_DAY, null), false);
});

test('due, but asked an hour ago: at most once a day', () => {
    const iat = NOW - 15 * SECONDS_PER_DAY;
    const exp = NOW + 15 * SECONDS_PER_DAY;
    assert.equal(shouldRefresh(NOW, iat, exp, NOW - 3600), false);
    assert.equal(shouldRefresh(NOW, iat, exp, NOW - MIN_REFRESH_INTERVAL_SECONDS - 1), true);
});

test('an expired token IS worth refreshing, while the service still takes it', () => {
    // /v1/refresh accepts an expired token for 90 more days (REFRESH_GRACE in
    // services/unlock/src/app.ts). Not trying inside that window would send a
    // reader who was offline for a month to go and find their receipt.
    const iat = NOW - 40 * SECONDS_PER_DAY;
    assert.equal(shouldRefresh(NOW, iat, NOW - 1, null), true);
    assert.equal(shouldRefresh(NOW, iat, NOW - REFRESH_GRACE_SECONDS + SECONDS_PER_DAY, null), true);
    // Still at most once a day.
    assert.equal(shouldRefresh(NOW, iat, NOW - 1, NOW - 3600), false);
});

test('past the grace window there is nothing left to refresh', () => {
    const iat = NOW - 200 * SECONDS_PER_DAY;
    assert.equal(shouldRefresh(NOW, iat, NOW - REFRESH_GRACE_SECONDS, null), false);
    assert.equal(shouldRefresh(NOW, iat, NOW - REFRESH_GRACE_SECONDS - SECONDS_PER_DAY, null), false);
});

test('no exp at all is nothing to refresh', () => {
    assert.equal(shouldRefresh(NOW, NOW - 40 * SECONDS_PER_DAY, null, null), false);
});

test('with no iat the token is dated back from exp', () => {
    // Issued (by assumption) 30 days before exp. An exp 25 days out makes it
    // 5 days old: not due. An exp 15 days out makes it 15 days old: due.
    assert.equal(shouldRefresh(NOW, null, NOW + ASSUMED_TOKEN_TTL_SECONDS - 5 * SECONDS_PER_DAY, null), false);
    assert.equal(shouldRefresh(NOW, null, NOW + ASSUMED_TOKEN_TTL_SECONDS - 15 * SECONDS_PER_DAY, null), true);
});

test('a clock that jumped backwards does not trigger a refresh storm', () => {
    assert.equal(shouldRefresh(NOW, NOW + 5 * SECONDS_PER_DAY, NOW + 40 * SECONDS_PER_DAY, null), false);
});

// ── the state machine ────────────────────────────────────────────────────────

const good = {
    token: tokenFor({ exp: NOW + 20 * SECONDS_PER_DAY, iat: NOW - SECONDS_PER_DAY }),
    exp: NOW + 20 * SECONDS_PER_DAY,
    iat: NOW - SECONDS_PER_DAY,
    activatedAt: NOW - SECONDS_PER_DAY,
    lastAttempt: NOW - SECONDS_PER_DAY,
};

test('nothing stored is locked', () => {
    assert.equal(statusFor({}, NOW), 'locked');
});

test('a call in flight is activating, whatever else is true', () => {
    assert.equal(statusFor({ activating: true }, NOW), 'activating');
    assert.equal(statusFor({ ...good, activating: true }, NOW), 'activating');
});

test('a good token is unlocked', () => {
    assert.equal(statusFor(good, NOW), 'unlocked');
    assert.equal(isEntitled('unlocked'), true);
});

test('a good but ageing token is refresh_due, and still entitled', () => {
    const old = { ...good, iat: NOW - 12 * SECONDS_PER_DAY, lastAttempt: NOW - 2 * SECONDS_PER_DAY };
    assert.equal(statusFor(old, NOW), 'refresh_due');
    assert.equal(isEntitled('refresh_due'), true);
});

test('past exp is expired', () => {
    assert.equal(statusFor({ ...good, exp: NOW - 1 }, NOW), 'expired');
    assert.equal(isEntitled('expired'), false);
});

test('a terminal code with the token still in hand is revoked', () => {
    for (const code of TERMINAL_CODES) {
        assert.equal(statusFor({ ...good, lastError: code }, NOW), 'revoked', code);
    }
});

test('a terminal code after the wipe is still revoked, if it ever worked', () => {
    // What the store leaves behind: token gone, activatedAt kept as history.
    assert.equal(statusFor({ activatedAt: NOW - 90 * SECONDS_PER_DAY, lastError: 'refunded' }, NOW), 'revoked');
});

test('a terminal code on a key that never worked is just locked', () => {
    assert.equal(statusFor({ lastError: 'not_found' }, NOW), 'locked');
});

test('a locked reader who could not reach the service is told so, not told no', () => {
    assert.equal(statusFor({ lastError: 'gumroad_unavailable' }, NOW), 'unavailable');
});

test('an UNLOCKED reader who could not reach the service stays unlocked', () => {
    // The plane test. Nothing transient may take a paid reader's questions away
    // before the token's own exp.
    for (const code of ['gumroad_unavailable', 'rate_limited', 'bad_token', 'device_cap']) {
        assert.equal(statusFor({ ...good, lastError: code }, NOW), 'unlocked', code);
    }
});

// ── who still gets the paid bank ─────────────────────────────────────────────

test('an unlocked device is served', () => {
    assert.equal(mayServePaidBank(good, NOW), true);
});

test('a device with no token is not', () => {
    assert.equal(mayServePaidBank({}, NOW), false);
    assert.equal(mayServePaidBank({ ...good, token: null }, NOW), false);
});

test('a revoked device is not, even with the token still on disk', () => {
    assert.equal(mayServePaidBank({ ...good, lastError: 'refunded' }, NOW), false);
});

test('an expired device keeps its questions for as long as a refresh can save them', () => {
    const justExpired = { ...good, exp: NOW - 1 };
    assert.equal(statusFor(justExpired, NOW), 'expired');
    assert.equal(mayServePaidBank(justExpired, NOW), true, 'the refresh is about to fix this');

    const wayPast = { ...good, exp: NOW - REFRESH_GRACE_SECONDS - 1 };
    assert.equal(mayServePaidBank(wayPast, NOW), false, 'nothing can recover this without the key');
});

// ── what we say ──────────────────────────────────────────────────────────────

test('every error code in the contract has a sentence', () => {
    const codes = allCodes();
    assert.ok(codes.length >= 11, `only found ${codes.length} codes in the union`);
    for (const code of codes) {
        const msg = messageFor(code);
        assert.equal(typeof msg, 'string', `${code} has no message`);
        assert.ok(msg.length > 20, `${code}: "${msg}" is too short to help anyone`);
        assert.ok(/[.!?]$/.test(msg.trim()), `${code}: not a sentence — "${msg}"`);
    }
});

test('no message sends anyone to a mailbox that does not exist', () => {
    for (const code of allCodes()) {
        assert.ok(!/mailto:|@securepathdigital/.test(messageFor(code)), `${code} points at email`);
    }
});

test('every message that needs a person gives the phone number', () => {
    // The codes a reader cannot fix alone.
    for (const code of ['refunded', 'chargebacked', 'disabled', 'device_cap', 'denied', 'not_found']) {
        assert.ok(messageFor(code).includes(SUPPORT_PHONE), `${code} does not say how to reach anyone`);
    }
});

test('the device-cap sentence uses the cap the service reported', () => {
    assert.equal(
        messageForError({ code: 'device_cap', cap: 3 }),
        `This key is on 3 devices already. Call ${SUPPORT_PHONE} and we'll free one.`,
    );
});

test('and names no figure at all when the service named none', () => {
    // DEVICE_CAP defaults to 4 in services/unlock/src/app.ts and is deployment
    // configuration. A hard-coded "5 devices" here would be a page contradicting
    // the service it is describing.
    const fallback = messageForError({ code: 'device_cap' });
    assert.equal(fallback, messageFor('device_cap'));
    const withoutPhone = fallback.split(SUPPORT_PHONE).join('');
    assert.ok(!/\d/.test(withoutPhone), `the fallback names a device count: "${fallback}"`);
});

test('the rate-limit sentence uses the delay the service reported', () => {
    assert.ok(messageForError({ code: 'rate_limited', retryAfter: 30 }).includes('30 seconds'));
    assert.ok(messageForError({ code: 'rate_limited', retryAfter: 1 }).includes('1 second.'));
    assert.equal(messageForError({ code: 'rate_limited' }), messageFor('rate_limited'));
});

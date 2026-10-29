/**
 * src/contract.ts is a copy of the two runtime exports of the app's
 * unlock-protocol.ts. This is the test that makes the copy safe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LICENCE_KEY_RE as APP_RE, normaliseKey as appNormalise } from '../../../src/lib/unlock-protocol.ts';
import { LICENCE_KEY_RE, normaliseKey } from '../src/contract.ts';

test('the mirrored licence-key regex is the app\'s', () => {
    assert.equal(String(LICENCE_KEY_RE), String(APP_RE));
    assert.equal(LICENCE_KEY_RE.flags, APP_RE.flags);
});

test('the mirrored normaliseKey behaves like the app\'s', () => {
    for (const s of ['  aaaaaaaa-bbbbbbbb-cccccccc-dddddddd  ', 'Mixed-Case', '', 'x']) {
        assert.equal(normaliseKey(s), appNormalise(s));
    }
});

/**
 * The email gate on the free sample: 40 open, 120 more with a free signup.
 *
 * Two halves. The open tier is checked against the REAL bank and the REAL
 * generator, for the reason test/preview.test.mjs gives: a claim about spread
 * is only worth something measured on the bank that ships. The gate logic is
 * pure functions and the bank store's swap, checked on fixtures small enough
 * to read.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

register('../scripts/node-ts-resolve.mjs', import.meta.url);

const { OPEN_PER_DOMAIN, FREE_PREVIEW_PER_DOMAIN, DISCRETE_GROUP, groupKeyOf, previewStats } =
    await import('../src/lib/preview.ts');
const { PREVIEW_PATH, buildPreview } = await import('../scripts/build-preview.mjs');
const gate = await import('../src/lib/sample-gate.ts');
const { subscribe } = await import('../src/lib/unlock-client.ts');
const bankMod = await import('../src/lib/bank.ts');
const { CONSENT_VERSION } = await import('../src/lib/unlock-protocol.ts');

const here = dirname(fileURLToPath(import.meta.url));
const bank = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'content.json'), 'utf8'));
const shipped = JSON.parse(readFileSync(PREVIEW_PATH, 'utf8'));

const openIds = (preview) => preview.domains.flatMap(d => d.questions.filter(q => q.open).map(q => q.id));

// ── the open tier, on the real bank ──────────────────────────────────────────

test('exactly 5 open questions in every one of the 8 domains, 40 in all', () => {
    assert.equal(OPEN_PER_DOMAIN, 5);
    assert.equal(shipped.domains.length, 8);
    for (const d of shipped.domains) {
        assert.equal(d.questions.length, FREE_PREVIEW_PER_DOMAIN, `${d.id}: the sample is still 20`);
        assert.equal(d.questions.filter(q => q.open === true).length, OPEN_PER_DOMAIN, `${d.id}: 5 open`);
        // Only `true` or absent: a stray `open: false` would be a second meaning.
        assert.ok(d.questions.every(q => q.open === true || !('open' in q)), `${d.id}: open is true or absent`);
    }
    assert.equal(openIds(shipped).length, 40);
    assert.equal(shipped.preview.open, 40);
    assert.equal(shipped.preview.openPerDomain, OPEN_PER_DOMAIN);
    assert.equal(shipped.preview.served, 160, 'the free sample is still 160');
});

test('the open 40 are deterministic and do not depend on the order the bank arrives in', () => {
    const a = openIds(buildPreview(bank));
    const b = openIds(buildPreview(bank));
    assert.deepEqual(a, b, 'same bank, same 40');
    assert.deepEqual(a, openIds(shipped), 'the committed file carries the same 40');

    // Reverse every domain's pool and its scenarios: a re-import that reorders
    // the JSON must not change which questions are open.
    const shuffledBank = {
        ...bank,
        domains: bank.domains.map(d => ({
            ...d,
            questionsV2: [...(d.questionsV2 ?? [])].reverse(),
            stimuli: [...(d.stimuli ?? [])].reverse(),
        })),
    };
    assert.deepEqual([...openIds(buildPreview(shuffledBank))].sort(), [...a].sort());
});

test('the open five are spread across the domain: one scenario each, not one testlet', () => {
    for (const d of shipped.domains) {
        const open = d.questions.filter(q => q.open);
        const groups = new Set(open.map(groupKeyOf));
        assert.equal(groups.size, OPEN_PER_DOMAIN, `${d.id}: 5 open questions in 5 different scenarios`);
        const scenarios = [...groups].filter(g => g !== DISCRETE_GROUP).length;
        assert.ok(scenarios >= 4, `${d.id}: at least 4 named scenarios, got ${scenarios}`);
        assert.ok(previewStats(open).objectives >= 5, `${d.id}: at least 5 outline objectives`);
    }
});

test('the open 40 do not skew the answer key', () => {
    const open = shipped.domains.flatMap(d => d.questions.filter(q => q.open));
    const { keyCounts } = previewStats(open);
    const worst = Math.max(...Object.values(keyCounts)) / open.length;
    assert.ok(worst <= 0.30, `open key skewed: ${JSON.stringify(keyCounts)}`);
});

test('stamping the open tier leaves the 20-a-domain sample exactly as it was', () => {
    // preview.ts's guarantees are about the 160. The open flag is an extra
    // property on 40 of them, never a change to which 160.
    const built = buildPreview(bank);
    for (const d of built.domains) {
        for (const q of d.questions) {
            const { open, ...rest } = q;
            const source = bank.domains.find(x => x.id === d.id).questionsV2.find(x => x.id === q.id);
            assert.deepEqual(rest, source, `${q.id}: only the open flag was added`);
            assert.ok(open === undefined || open === true);
            assert.ok(!('open' in source), `${q.id}: the bank itself was not mutated`);
        }
    }
});

// ── which questions are available, pure ──────────────────────────────────────

const pool = [
    { id: 'q1', open: true }, { id: 'q2' }, { id: 'q3', open: true }, { id: 'q4' }, { id: 'q5' },
];

test('accessFor: paid beats everything, then joined, then open', () => {
    assert.equal(gate.accessFor({ tier: 'free', joined: false }), 'open');
    assert.equal(gate.accessFor({ tier: 'free', joined: true }), 'joined');
    assert.equal(gate.accessFor({ tier: 'paid', joined: false }), 'paid');
    assert.equal(gate.accessFor({ tier: 'paid', joined: true }), 'paid');
});

test('not joined: only the open questions, in the order given', () => {
    assert.deepEqual(gate.availableQuestions(pool, 'open').map(q => q.id), ['q1', 'q3']);
    assert.equal(gate.gatedCount(pool, 'open'), 3);
    assert.equal(gate.isAvailable({ id: 'x' }, 'open'), false);
    assert.equal(gate.isAvailable({ id: 'x', open: false }, 'open'), false);
    assert.equal(gate.showsGate('open'), true);
});

test('joined: every question in the sample', () => {
    assert.deepEqual(gate.availableQuestions(pool, 'joined').map(q => q.id), ['q1', 'q2', 'q3', 'q4', 'q5']);
    assert.equal(gate.gatedCount(pool, 'joined'), 0);
    assert.equal(gate.showsGate('joined'), false);
});

test('paid: no gate at all, and paid-bank questions carry no open flag', () => {
    const paidPool = [{ id: 'p1' }, { id: 'p2' }];
    assert.deepEqual(gate.availableQuestions(paidPool, 'paid'), paidPool);
    assert.equal(gate.gatedCount(paidPool, 'paid'), 0);
    assert.equal(gate.showsGate('paid'), false);
});

test('on the real sample: 40 before the signup, 160 after', () => {
    const all = shipped.domains.flatMap(d => d.questions);
    assert.equal(gate.availableQuestions(all, 'open').length, 40);
    assert.equal(gate.availableQuestions(all, 'joined').length, 160);
    for (const d of shipped.domains) {
        assert.equal(gate.availableQuestions(d.questions, 'open').length, 5, d.id);
    }
});

// ── the bank store: joining opens the 120 without a reload ───────────────────

const q = (id, open) => ({
    id, question: `stem ${id}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A',
    explanation: 'because', form: 'drill', ...(open ? { open: true } : {}),
});

const FIXTURE = {
    preview: { schema: 1, perDomain: 3, openPerDomain: 1, open: 2, served: 6, scenarios: 0, objectives: 0,
               discrete: 6, keyCounts: { A: 6, B: 0, C: 0, D: 0 }, paid: 9 },
    domains: [
        { id: 'domain_1', title: 'One', caseStudy: '', stimuli: [], questions: [q('a1', true), q('a2'), q('a3')] },
        { id: 'domain_2', title: 'Two', caseStudy: '', stimuli: [], questions: [q('b1'), q('b2', true), q('b3')] },
    ],
};

test('the bank store reports open -> joined -> paid, and counts what is available', () => {
    bankMod.resetBankForTests();
    bankMod.setPreviewBank(FIXTURE);
    let s = bankMod.useBankStore.getState();
    assert.equal(s.access, 'open');
    assert.equal(s.served, 2, 'not joined: the open two');
    assert.equal(bankMod.sampleAccess(), 'open');

    bankMod.setSampleJoined(true);
    s = bankMod.useBankStore.getState();
    assert.equal(s.access, 'joined');
    assert.equal(s.tier, 'free');
    assert.equal(s.served, 6, 'joined: all six, no reload, no new bank');

    bankMod.setSampleJoined(false);
    assert.equal(bankMod.useBankStore.getState().served, 2);

    bankMod.setActiveBank({
        schema: 1, edition: 'x',
        domains: [{ id: 'domain_1', title: 'One', caseStudy: '', stimuli: [],
                    questions: [q('p1'), q('p2'), q('p3'), q('p4'), q('p5')] }],
    });
    s = bankMod.useBankStore.getState();
    assert.equal(s.access, 'paid', 'a buyer never sees the gate, joined or not');
    assert.equal(s.served, 5, 'paid questions carry no open flag and are all served');
    bankMod.resetBankForTests();
});

test('a free bank with no open flags at all is not gated, rather than serving nothing', () => {
    bankMod.resetBankForTests();
    const unflagged = { ...FIXTURE, domains: FIXTURE.domains.map(d => ({ ...d, questions: d.questions.map(({ open, ...x }) => x) })) };
    bankMod.setPreviewBank(unflagged);
    assert.equal(bankMod.useBankStore.getState().served, 6);
    assert.notEqual(bankMod.useBankStore.getState().access, 'open', 'no panel for a bank with nothing behind it');
    bankMod.resetBankForTests();
});

// ── the form ─────────────────────────────────────────────────────────────────

test('checkForm: email and consent are both required, and say which is missing', () => {
    assert.deepEqual(gate.checkForm('', false), ['email_missing', 'consent_missing']);
    assert.deepEqual(gate.checkForm('not-an-email', true), ['email_format']);
    assert.deepEqual(gate.checkForm('a@b.co', false), ['consent_missing']);
    assert.deepEqual(gate.checkForm('  reader@example.com ', true), []);
    for (const bad of ['a@b', '@b.co', 'a b@c.de', 'a@b .co']) assert.equal(gate.isPlausibleEmail(bad), false, bad);
});

test('the consent sentence is the agreed one, word for word', () => {
    assert.equal(gate.CONSENT_TEXT,
        'Email me the CISSP study notes and occasional offers from Secure Path Digital. Unsubscribe any time.');
    assert.equal(gate.PRIVACY_URL, 'https://securepathdigital.net/privacy/');
});

test('every failure code has a sentence, and none of them uses an em dash', () => {
    for (const code of ['invalid_email', 'consent_required', 'rate_limited', 'store_unavailable', 'unreachable', 'unconfigured']) {
        const m = gate.subscribeMessage(code);
        assert.ok(m && m.length > 10, code);
        assert.ok(!m.includes('—'), `${code}: em dash`);
    }
    assert.equal(gate.subscribeMessage('rate_limited', 30), 'Too many tries in a row. Try again in 30 seconds.');
    for (const m of Object.values(gate.LOCAL_MESSAGES)) assert.ok(!m.includes('—'));
});

// ── storage and campaign tags ────────────────────────────────────────────────

const fakeStorage = () => {
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
};

test('the joined flag is an ISO date under spd.sample.joined, and a broken storage reads as not joined', () => {
    const st = fakeStorage();
    assert.equal(gate.readJoined(st), false);
    gate.writeJoined(st, new Date('2026-10-27T15:00:00Z'));
    assert.equal(st.map.get('spd.sample.joined'), '2026-10-27');
    assert.equal(gate.readJoined(st), true);
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    assert.equal(gate.readJoined(throwing), false);
    assert.doesNotThrow(() => gate.writeJoined(throwing));
    assert.equal(gate.readJoined(undefined), false);
});

test('utm tags: the first landing wins for the session, other params are ignored', () => {
    const st = fakeStorage();
    gate.captureUtm(st, '?ref=x&utm_source=youtube&utm_medium=video&utm_campaign=%20d3%20');
    assert.deepEqual(gate.readUtm(st), { utm_source: 'youtube', utm_medium: 'video', utm_campaign: 'd3' });
    gate.captureUtm(st, '?utm_source=other');
    assert.equal(gate.readUtm(st).utm_source, 'youtube', 'a later page does not overwrite');

    const empty = fakeStorage();
    gate.captureUtm(empty, '?page=2');
    assert.equal(gate.readUtm(empty), undefined, 'no tags, nothing stored');
    gate.captureUtm(empty, '?utm_source=late');
    assert.equal(gate.readUtm(empty).utm_source, 'late', 'an untagged first page does not block a tagged one');
});

// ── the request ──────────────────────────────────────────────────────────────

const BASE = 'http://127.0.0.1:8787';
const reply = (status, body, headers = {}) => async () => ({
    status, headers: new Headers(headers), json: async () => body,
});
const REQ = { email: 'r@example.com', consent: true, consentVersion: CONSENT_VERSION, source: 'practice-gate', website: '' };

test('subscribe posts the SubscribeRequest to /v1/subscribe and joins only on ok:true', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => { calls.push({ url, init }); return reply(200, { ok: true })(); };
    assert.deepEqual(await subscribe({ ...REQ, utm: { utm_source: 'yt' } }, { fetchImpl, baseUrl: BASE + '/' }), { ok: true });
    assert.equal(calls[0].url, `${BASE}/v1/subscribe`);
    assert.equal(calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].init.body), { ...REQ, utm: { utm_source: 'yt' } });
});

test('subscribe: protocol errors come back as their codes', async () => {
    assert.deepEqual(await subscribe(REQ, { fetchImpl: reply(400, { ok: false, code: 'invalid_email' }), baseUrl: BASE }),
        { ok: false, code: 'invalid_email' });
    assert.deepEqual(await subscribe(REQ, { fetchImpl: reply(429, { ok: false, code: 'rate_limited', retryAfter: 20 }), baseUrl: BASE }),
        { ok: false, code: 'rate_limited', retryAfter: 20 });
    assert.deepEqual(await subscribe(REQ, { fetchImpl: reply(429, null, { 'retry-after': '7' }), baseUrl: BASE }),
        { ok: false, code: 'rate_limited', retryAfter: 7 });
});

test('subscribe: a network failure, an HTML page or an unknown body never joins', async () => {
    const down = async () => { throw new TypeError('fetch failed'); };
    assert.deepEqual(await subscribe(REQ, { fetchImpl: down, baseUrl: BASE }), { ok: false, code: 'unreachable' });
    const html = async () => ({ status: 200, headers: new Headers(), json: async () => { throw new SyntaxError('<'); } });
    assert.deepEqual(await subscribe(REQ, { fetchImpl: html, baseUrl: BASE }), { ok: false, code: 'unreachable' });
    assert.deepEqual(await subscribe(REQ, { fetchImpl: reply(200, { ok: 'yes' }), baseUrl: BASE }), { ok: false, code: 'unreachable' });
    assert.deepEqual(await subscribe(REQ, { fetchImpl: reply(400, { ok: false, code: 'new_code' }), baseUrl: BASE }), { ok: false, code: 'unreachable' });
});

test('subscribe with no service configured says so and sends nothing', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return reply(200, { ok: true })(); };
    assert.deepEqual(await subscribe(REQ, { fetchImpl, baseUrl: '' }), { ok: false, code: 'unconfigured' });
    assert.equal(called, false);
});

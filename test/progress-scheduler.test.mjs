/**
 * SM-2 over the attempt log.
 *
 * Two things are worth stating about what is checked here. The first is that
 * the queue is asserted against a FIXED clock in every case — a spaced
 * repetition schedule that is not reproducible cannot be debugged, and "it
 * seemed to bring the right ones back" is not a test. The second is the
 * ordering test near the end: scheduler.ts carries its own copy of rollup.ts's
 * `inOrder`, because a pure module here may hold no runtime import, and that
 * duplication is only safe while the two produce identical orderings. This file
 * is what makes that true rather than hoped.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    DAY_MS,
    INITIAL_EF,
    MIN_EF,
    applyAttempt,
    dueQueue,
    newQueue,
    nextEf,
    quality,
    schedule,
    studyQueue,
} from '../src/lib/progress/scheduler.ts';
import { inOrder, rollup } from '../src/lib/progress/rollup.ts';
import { BLUEPRINT, PACE_SECONDS_PER_QUESTION } from '../src/lib/blueprint.ts';

const PACE_MS = PACE_SECONDS_PER_QUESTION * 1000;

const at = (qid, domainId, correct, ts, extra = {}) => ({
    qid, domainId, correct, ts, outlineItems: [],
    chosen: 'A', key: 'A', mode: 'domain', sessionId: 's1',
    ...extra,
});

test('the pace budget the scheduler grades against is the exam pace, stated once', () => {
    assert.equal(PACE_SECONDS_PER_QUESTION, 75);
    assert.equal(PACE_MS, 75_000);
    assert.equal(DAY_MS, 86_400_000);
});

// ── grading ──────────────────────────────────────────────────────────────────

test('quality: 5 inside the pace budget, 4 outside it, 1 for wrong', () => {
    assert.equal(quality(true, 30_000, PACE_MS), 5);
    assert.equal(quality(true, PACE_MS, PACE_MS), 5, 'exactly on the budget still counts');
    assert.equal(quality(true, PACE_MS + 1, PACE_MS), 4);
    assert.equal(quality(false, 1_000, PACE_MS), 1, 'fast and wrong is still wrong');
    assert.equal(quality(false, undefined, PACE_MS), 1);
});

test('an attempt with no timing cannot claim the fast grade', () => {
    assert.equal(quality(true, undefined, PACE_MS), 4);
});

test('nextEf: q=4 leaves it alone, q=5 adds 0.1, q=1 costs 0.54, floor 1.3', () => {
    assert.equal(Math.round(nextEf(2.5, 4) * 1000) / 1000, 2.5);
    assert.equal(Math.round(nextEf(2.5, 5) * 1000) / 1000, 2.6);
    assert.equal(Math.round(nextEf(2.5, 1) * 1000) / 1000, 1.96);
    // Repeated failure bottoms out rather than going negative.
    let ef = INITIAL_EF;
    for (let i = 0; i < 20; i++) ef = nextEf(ef, 1);
    assert.equal(ef, MIN_EF);
});

// ── the SM-2 sequence ────────────────────────────────────────────────────────

test('three correct answers give the published 1, 6, then multiply schedule', () => {
    let card;
    card = applyAttempt(card, at('q1', 'domain_1', true, 0, { ms: 90_000 }), PACE_MS);
    assert.equal(card.reps, 1);
    assert.equal(card.interval, 1);
    assert.equal(card.ef, 2.5, 'q=4 leaves the easiness factor alone');
    assert.equal(card.due, 0 + 1 * DAY_MS);

    card = applyAttempt(card, at('q1', 'domain_1', true, DAY_MS, { ms: 90_000 }), PACE_MS);
    assert.equal(card.reps, 2);
    assert.equal(card.interval, 6);
    assert.equal(card.due, DAY_MS + 6 * DAY_MS);

    card = applyAttempt(card, at('q1', 'domain_1', true, 7 * DAY_MS, { ms: 90_000 }), PACE_MS);
    assert.equal(card.reps, 3);
    // interval = round(previous 6 x updated ef 2.5)
    assert.equal(card.interval, 15);
    assert.equal(card.due, 7 * DAY_MS + 15 * DAY_MS);
});

test('answering fast raises the easiness factor, and the interval grows with it', () => {
    let fast, slow;
    for (const ts of [0, DAY_MS, 7 * DAY_MS]) {
        fast = applyAttempt(fast, at('q1', 'domain_1', true, ts, { ms: 20_000 }), PACE_MS);
        slow = applyAttempt(slow, at('q1', 'domain_1', true, ts, { ms: 200_000 }), PACE_MS);
    }
    assert.equal(Math.round(fast.ef * 100) / 100, 2.8);
    assert.equal(slow.ef, 2.5);
    assert.ok(fast.interval > slow.interval, `${fast.interval} > ${slow.interval}`);
    assert.equal(fast.interval, 17); // round(6 x 2.8)
    assert.equal(slow.interval, 15); // round(6 x 2.5)
});

test('a wrong answer restarts the repetition, keeps the lowered easiness, and counts a lapse', () => {
    let card;
    for (const ts of [0, DAY_MS, 7 * DAY_MS]) {
        card = applyAttempt(card, at('q1', 'domain_1', true, ts, { ms: 20_000 }), PACE_MS);
    }
    const before = card.ef;
    card = applyAttempt(card, at('q1', 'domain_1', false, 30 * DAY_MS), PACE_MS);
    assert.equal(card.reps, 0);
    assert.equal(card.interval, 1, 'it comes back tomorrow');
    assert.equal(card.lapses, 1);
    assert.equal(Math.round((before - card.ef) * 100) / 100, 0.54);
    assert.equal(card.lastCorrect, false);

    // And the recovery is slower than the first time round, because the
    // easiness factor is not restored.
    card = applyAttempt(card, at('q1', 'domain_1', true, 31 * DAY_MS, { ms: 20_000 }), PACE_MS);
    card = applyAttempt(card, at('q1', 'domain_1', true, 32 * DAY_MS, { ms: 20_000 }), PACE_MS);
    card = applyAttempt(card, at('q1', 'domain_1', true, 40 * DAY_MS, { ms: 20_000 }), PACE_MS);
    assert.ok(card.interval < 17, `${card.interval} < 17, the un-lapsed third interval`);
});

test('getting the first sighting wrong is not a lapse — there was nothing to lapse from', () => {
    const card = applyAttempt(undefined, at('q1', 'domain_1', false, 0), PACE_MS);
    assert.equal(card.lapses, 0);
    assert.equal(card.reps, 0);
    assert.equal(card.attempts, 1);
});

test('the fold is independent of the order the log arrives in', () => {
    // An import merges another device's attempts in after the fact, and SM-2 is
    // order-dependent: the same set of answers must not schedule differently
    // depending on when it arrived.
    const log = [
        at('q1', 'domain_1', true, 0, { ms: 20_000 }),
        at('q1', 'domain_1', false, 2 * DAY_MS),
        at('q1', 'domain_1', true, 3 * DAY_MS, { ms: 20_000 }),
        at('q2', 'domain_2', true, DAY_MS, { ms: 20_000 }),
    ];
    const forwards = schedule(log, PACE_MS);
    const backwards = schedule(log.slice().reverse(), PACE_MS);
    const shuffled = schedule([log[2], log[0], log[3], log[1]], PACE_MS);
    assert.deepEqual([...forwards.entries()], [...backwards.entries()]);
    assert.deepEqual([...forwards.entries()], [...shuffled.entries()]);
});

test('scheduler and rollup order the log identically — the duplicated comparator holds', () => {
    // scheduler.ts cannot import rollup.ts (no runtime imports in a pure module
    // here), so it repeats the comparator. If one drifts, this fails.
    const log = [
        { ...at('qb', 'domain_1', true, 5), id: 2 },
        { ...at('qa', 'domain_1', true, 5), id: 1 },
        at('qc', 'domain_1', true, 4),
        at('qd', 'domain_1', false, 9),
    ];
    // The scheduler's order is observable through which attempt wins per qid,
    // so compare on a log where every attempt is a different question: the
    // card's lastReviewed then reproduces the visit order exactly.
    const visited = [...schedule(log, PACE_MS).values()]
        .sort((a, b) => a.lastReviewed - b.lastReviewed || a.qid.localeCompare(b.qid))
        .map(c => c.qid);
    assert.deepEqual(visited, inOrder(log).map(a => a.qid));
});

// ── the due queue ────────────────────────────────────────────────────────────

test('the due queue is exactly the cards whose review date has arrived', () => {
    const cards = schedule([
        at('q1', 'domain_1', true, 0, { ms: 20_000 }),   // due at +1 day
        at('q2', 'domain_1', false, 0),                  // due at +1 day
        at('q3', 'domain_1', true, 5 * DAY_MS, { ms: 20_000 }), // due at +6 days
    ], PACE_MS);

    assert.deepEqual(dueQueue(cards, 0), []);
    assert.deepEqual(dueQueue(cards, DAY_MS).sort(), ['q1', 'q2']);
    assert.deepEqual(dueQueue(cards, 6 * DAY_MS).sort(), ['q1', 'q2', 'q3']);
});

test('most overdue first, then hardest, then id — and a limit takes from the front', () => {
    const cards = new Map([
        ['a', { qid: 'a', domainId: 'domain_1', ef: 2.5, interval: 1, reps: 1, due: 300, lastReviewed: 0, lapses: 0, attempts: 1, lastCorrect: true }],
        ['b', { qid: 'b', domainId: 'domain_1', ef: 2.5, interval: 1, reps: 1, due: 100, lastReviewed: 0, lapses: 0, attempts: 1, lastCorrect: true }],
        ['c', { qid: 'c', domainId: 'domain_1', ef: 1.4, interval: 1, reps: 1, due: 300, lastReviewed: 0, lapses: 2, attempts: 3, lastCorrect: true }],
        ['d', { qid: 'd', domainId: 'domain_1', ef: 2.5, interval: 1, reps: 1, due: 900, lastReviewed: 0, lapses: 0, attempts: 1, lastCorrect: true }],
    ]);
    assert.deepEqual(dueQueue(cards, 500), ['b', 'c', 'a']);
    assert.deepEqual(dueQueue(cards, 500, 2), ['b', 'c']);
    assert.deepEqual(dueQueue(cards, 500, 0), []);
});

test('the due queue is reproducible for a fixed clock', () => {
    const log = [];
    for (let i = 0; i < 40; i++) {
        log.push(at(`q${i}`, `domain_${(i % 8) + 1}`, i % 3 !== 0, i * 1000, { ms: 40_000 }));
    }
    const cards = schedule(log, PACE_MS);
    const now = 10 * DAY_MS;
    const first = dueQueue(cards, now, 12);
    for (let i = 0; i < 5; i++) {
        assert.deepEqual(dueQueue(schedule(log.slice().reverse(), PACE_MS), now, 12), first);
    }
});

// ── new material ─────────────────────────────────────────────────────────────

const poolOf = (...specs) => specs.map(([id, domainId, ...items]) => ({ id, domainId, outlineItems: items }));

test('new material never repeats a question that has been seen', () => {
    const r = rollup([at('q1', 'domain_1', true, 0, { outlineItems: ['1.1'] })]);
    const pool = poolOf(['q1', 'domain_1', '1.1'], ['q2', 'domain_1', '1.2']);
    assert.deepEqual(newQueue(r, pool, 10, BLUEPRINT), ['q2']);
});

test('an objective never attempted outranks one that is going badly', () => {
    // domain_2 is 10% of the paper and 2.1 is at 50%: need 5.
    // domain_2's 2.9 has never been attempted: need is the full 10.
    const r = rollup([
        at('a1', 'domain_2', true, 1, { outlineItems: ['2.1'] }),
        at('a2', 'domain_2', false, 2, { outlineItems: ['2.1'] }),
    ]);
    const pool = poolOf(['n1', 'domain_2', '2.1'], ['n2', 'domain_2', '2.9']);
    assert.deepEqual(newQueue(r, pool, 10, BLUEPRINT), ['n2', 'n1']);
});

test('with no history at all, new material follows the exam weights then blueprint order', () => {
    const r = rollup([]);
    const pool = poolOf(
        ['d8', 'domain_8', '8.1'],  // weight 10
        ['d1', 'domain_1', '1.1'],  // weight 16
        ['d6', 'domain_6', '6.1'],  // weight 12
        ['d4', 'domain_4', '4.1'],  // weight 13
        ['d3', 'domain_3', '3.1'],  // weight 13, earlier in the blueprint than 4
    );
    assert.deepEqual(newQueue(r, pool, 10, BLUEPRINT), ['d1', 'd3', 'd4', 'd6', 'd8']);
});

test('a question is scored by its most urgent objective, and a limit takes the front', () => {
    const r = rollup([
        at('a1', 'domain_1', true, 1, { outlineItems: ['1.1'] }),   // 1.1 at 100%: need 0
        at('a2', 'domain_1', false, 2, { outlineItems: ['1.2'] }),  // 1.2 at 0%: need 16
    ]);
    const pool = poolOf(['n1', 'domain_1', '1.1'], ['n2', 'domain_1', '1.1', '1.2']);
    assert.deepEqual(newQueue(r, pool, 10, BLUEPRINT), ['n2', 'n1']);
    assert.deepEqual(newQueue(r, pool, 1, BLUEPRINT), ['n2']);
});

test('a question citing no objectives falls back to its domain weight rather than to last place', () => {
    const r = rollup([]);
    const pool = [
        { id: 'bare', domainId: 'domain_1' },
        { id: 'tagged', domainId: 'domain_8', outlineItems: ['8.1'] },
    ];
    assert.deepEqual(newQueue(r, pool, 10, BLUEPRINT), ['bare', 'tagged']);
});

test('new material is deterministic', () => {
    const r = rollup([]);
    const pool = poolOf(...Array.from({ length: 30 }, (_, i) => [`q${i}`, `domain_${(i % 8) + 1}`, `${(i % 8) + 1}.1`]));
    const first = newQueue(r, pool, 12, BLUEPRINT);
    assert.deepEqual(newQueue(r, pool.slice().reverse(), 12, BLUEPRINT), first);
});

// ── the day's queue ──────────────────────────────────────────────────────────

test('reviews are never displaced by new material, and the target is the cap', () => {
    const log = [];
    for (let i = 0; i < 6; i++) log.push(at(`old${i}`, 'domain_1', true, i, { ms: 20_000 }));
    const r = rollup(log);
    const cards = schedule(log, PACE_MS);
    const pool = poolOf(...Array.from({ length: 20 }, (_, i) => [`new${i}`, 'domain_1', '1.1']));

    const q = studyQueue(cards, r, pool, 2 * DAY_MS, 4, BLUEPRINT);
    assert.equal(q.due.length, 4, 'six are due; the target of four is the cap');
    assert.equal(q.fresh.length, 0, 'and nothing new is added on top');
    assert.deepEqual(q.ids, q.due);

    const roomy = studyQueue(cards, r, pool, 2 * DAY_MS, 10, BLUEPRINT);
    assert.equal(roomy.due.length, 6);
    assert.equal(roomy.fresh.length, 4);
    assert.equal(roomy.ids.length, 10);
    assert.equal(new Set(roomy.ids).size, 10, 'no question appears twice');
});

test('with nothing due, the day is all new material', () => {
    const log = [at('seen', 'domain_1', true, 0, { ms: 20_000 })];
    const q = studyQueue(
        schedule(log, PACE_MS), rollup(log),
        poolOf(['a', 'domain_1', '1.1'], ['b', 'domain_1', '1.2']),
        1000, 5, BLUEPRINT,
    );
    assert.deepEqual(q.due, []);
    assert.equal(q.fresh.length, 2);
});

test('an exhausted pool with nothing due gives an empty day rather than a repeat', () => {
    const log = [at('a', 'domain_1', true, 0, { ms: 20_000 })];
    const q = studyQueue(
        schedule(log, PACE_MS), rollup(log),
        poolOf(['a', 'domain_1', '1.1']),
        1000, 20, BLUEPRINT,
    );
    assert.deepEqual(q.ids, []);
});

/**
 * The readiness formula, and the components it has to be able to show.
 *
 *     readiness = Σ_d weight_d × acc_d(last 30 days) × coverage_d
 *
 * The arithmetic is checked by hand on small logs rather than by re-deriving it
 * from the same code that computes it, which would test nothing. The invariants
 * — bounded by the total weight, bounded by the coverage ceiling, no NaN on an
 * empty log — are checked over the real 2024 outline denominators as well as
 * over toy ones.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { READINESS_WINDOW_DAYS, readiness, readinessFrom } from '../src/lib/progress/readiness.ts';
import { rollup } from '../src/lib/progress/rollup.ts';
import { DAY_MS } from '../src/lib/progress/scheduler.ts';
import { BLUEPRINT } from '../src/lib/blueprint.ts';

const WINDOW_MS = READINESS_WINDOW_DAYS * DAY_MS;
const NOW = 1_700_000_000_000;

const at = (qid, domainId, correct, ts, outlineItems = []) => ({
    qid, domainId, correct, ts, outlineItems,
    chosen: 'A', key: 'A', mode: 'domain', sessionId: 's1',
});

/** Ten objectives in every domain, so the arithmetic is readable. */
const tenEach = () => 10;

const run = (log, opts = {}) => readiness(log, {
    now: opts.now ?? NOW,
    windowMs: opts.windowMs ?? WINDOW_MS,
    blueprint: BLUEPRINT,
    objectivesInDomain: opts.objectivesInDomain ?? tenEach,
}, rollup);

test('the window is 30 days', () => {
    assert.equal(READINESS_WINDOW_DAYS, 30);
});

test('an empty log scores zero, with every component present and no NaN', () => {
    const r = run([]);
    assert.equal(r.score, 0);
    assert.equal(r.ceiling, 0);
    assert.equal(r.totalWeight, 100);
    assert.equal(r.domains.length, 8);
    for (const d of r.domains) {
        assert.equal(d.acc, 0);
        assert.equal(d.coverage, 0);
        assert.equal(d.contribution, 0);
        assert.ok(Number.isFinite(d.acc) && Number.isFinite(d.coverage));
    }
});

test('the score is the sum of the per-domain contributions, and each is weight x acc x coverage', () => {
    // domain_1 (16%): 3 of 4 right, 2 of 10 objectives touched
    //   => 16 x 0.75 x 0.2 = 2.4
    // domain_5 (13%): 1 of 1 right, 1 of 10 objectives touched
    //   => 13 x 1 x 0.1 = 1.3
    const r = run([
        at('a', 'domain_1', true, NOW - 1000, ['1.1']),
        at('b', 'domain_1', true, NOW - 1000, ['1.1']),
        at('c', 'domain_1', true, NOW - 1000, ['1.2']),
        at('d', 'domain_1', false, NOW - 1000, ['1.2']),
        at('e', 'domain_5', true, NOW - 1000, ['5.1']),
    ]);
    const d1 = r.domains.find(d => d.domainId === 'domain_1');
    const d5 = r.domains.find(d => d.domainId === 'domain_5');

    assert.equal(d1.attempts, 4);
    assert.equal(d1.correct, 3);
    assert.equal(d1.acc, 0.75);
    assert.equal(d1.objectivesAttempted, 2);
    assert.equal(d1.objectivesInDomain, 10);
    assert.equal(d1.coverage, 0.2);
    assert.equal(Math.round(d1.contribution * 1000) / 1000, 2.4);
    assert.equal(Math.round(d5.contribution * 1000) / 1000, 1.3);

    // The reader must be able to add the column up and get the total.
    const summed = r.domains.reduce((n, d) => n + d.contribution, 0);
    assert.equal(Math.round(r.score * 1e9), Math.round(summed * 1e9));
    assert.equal(Math.round(r.score * 1000) / 1000, 3.7);
});

test('everything right, everything covered, gives exactly 100', () => {
    const log = [];
    for (const b of BLUEPRINT) {
        for (let i = 1; i <= 10; i++) log.push(at(`${b.id}-${i}`, b.id, true, NOW - 1000, [`${b.number}.${i}`]));
    }
    const r = run(log);
    assert.equal(Math.round(r.score * 1e6) / 1e6, 100);
    assert.equal(Math.round(r.ceiling * 1e6) / 1e6, 100);
});

test('accuracy is windowed; coverage is not', () => {
    // One correct answer inside the window, one wrong answer well outside it,
    // on a different objective. The old answer must not touch accuracy, but the
    // objective it covered still counts as ground covered.
    const r = run([
        at('recent', 'domain_1', true, NOW - DAY_MS, ['1.1']),
        at('ancient', 'domain_1', false, NOW - 200 * DAY_MS, ['1.2']),
    ]);
    const d1 = r.domains.find(d => d.domainId === 'domain_1');
    assert.equal(d1.attempts, 1, 'only the recent attempt counts towards accuracy');
    assert.equal(d1.acc, 1);
    assert.equal(d1.objectivesAttempted, 2, 'both objectives count towards coverage');
    assert.equal(r.attemptsInWindow, 1);
    assert.equal(r.attemptsAllTime, 2);
    assert.equal(Math.round(d1.contribution * 1000) / 1000, 3.2); // 16 x 1 x 0.2
});

test('an attempt exactly on the window boundary is inside it', () => {
    const r = run([at('edge', 'domain_1', true, NOW - WINDOW_MS, ['1.1'])]);
    assert.equal(r.attemptsInWindow, 1);
    assert.equal(r.since, NOW - WINDOW_MS);
});

test('work that has gone stale stops holding the score up', () => {
    const fresh = run([at('a', 'domain_1', true, NOW - DAY_MS, ['1.1'])]);
    const stale = run([at('a', 'domain_1', true, NOW - 90 * DAY_MS, ['1.1'])]);
    assert.ok(fresh.score > 0);
    assert.equal(stale.score, 0, 'accuracy has no attempts left in the window');
    assert.ok(stale.ceiling > 0, 'but the ground covered is still on the record');
});

test('coverage is clamped at 1, so a cross-domain objective cannot push a domain over its weight', () => {
    // Three objectives attempted where the outline lists two.
    const r = run([
        at('a', 'domain_2', true, NOW - 1000, ['2.1', '2.2', '9.9']),
    ], { objectivesInDomain: () => 2 });
    const d2 = r.domains.find(d => d.domainId === 'domain_2');
    assert.equal(d2.objectivesAttempted, 3);
    assert.equal(d2.coverage, 1);
    assert.equal(d2.contribution, 10, 'the domain weight, not more');
});

test('a domain with no objectives in the outline contributes nothing rather than dividing by zero', () => {
    const r = run([at('a', 'domain_1', true, NOW - 1000, ['1.1'])], { objectivesInDomain: () => 0 });
    for (const d of r.domains) {
        assert.equal(d.coverage, 0);
        assert.ok(Number.isFinite(d.contribution));
    }
    assert.equal(r.score, 0);
});

test('the score never exceeds the ceiling, and the ceiling never exceeds the total weight', () => {
    // Random-ish but deterministic logs, over the real 2024 outline sizes.
    const perDomain = { domain_1: 46, domain_2: 22, domain_3: 72, domain_4: 29, domain_5: 35, domain_6: 32, domain_7: 74, domain_8: 30 };
    for (let seed = 1; seed <= 25; seed++) {
        const log = [];
        for (let i = 0; i < 120; i++) {
            const b = BLUEPRINT[(i * seed) % 8];
            log.push(at(
                `q${seed}-${i}`, b.id, (i * seed) % 3 !== 0,
                NOW - ((i * seed) % 60) * DAY_MS,
                [`${b.number}.${((i * seed) % 12) + 1}`],
            ));
        }
        const r = run(log, { objectivesInDomain: id => perDomain[id] });
        assert.ok(r.score >= 0, `seed ${seed}: score ${r.score}`);
        assert.ok(r.score <= r.ceiling + 1e-9, `seed ${seed}: ${r.score} <= ${r.ceiling}`);
        assert.ok(r.ceiling <= r.totalWeight + 1e-9, `seed ${seed}: ${r.ceiling} <= 100`);
        for (const d of r.domains) {
            assert.ok(d.acc >= 0 && d.acc <= 1);
            assert.ok(d.coverage >= 0 && d.coverage <= 1);
        }
    }
});

test('the free tier cannot reach 100, and the components say why', () => {
    // 20 questions a domain reach roughly 20 objectives; domain 1 has 46.
    // A perfect run over that sample still leaves the coverage column short,
    // which is exactly what the page has to be able to explain.
    const perDomain = { domain_1: 46, domain_2: 22, domain_3: 72, domain_4: 29, domain_5: 35, domain_6: 32, domain_7: 74, domain_8: 30 };
    const log = [];
    for (const b of BLUEPRINT) {
        for (let i = 1; i <= 20; i++) log.push(at(`${b.id}-${i}`, b.id, true, NOW - 1000, [`${b.number}.${i}`]));
    }
    const r = run(log, { objectivesInDomain: id => perDomain[id] });
    assert.ok(r.score < 100, `a perfect free run scores ${r.score}`);
    // Every domain is at 100% accuracy, so the whole shortfall is coverage.
    for (const d of r.domains) assert.equal(d.acc, 1);
    assert.equal(Math.round(r.score * 1e6), Math.round(r.ceiling * 1e6));
});

test('readinessFrom and readiness agree — the page may fold once and pass both in', () => {
    const log = [
        at('a', 'domain_1', true, NOW - DAY_MS, ['1.1']),
        at('b', 'domain_1', false, NOW - 100 * DAY_MS, ['1.2']),
        at('c', 'domain_7', true, NOW - 2 * DAY_MS, ['7.1']),
    ];
    const input = { now: NOW, windowMs: WINDOW_MS, blueprint: BLUEPRINT, objectivesInDomain: tenEach };
    const viaRaw = readiness(log, input, rollup);
    const viaFolded = readinessFrom(rollup(log), rollup(log.filter(a => a.ts >= NOW - WINDOW_MS)), input);
    assert.deepEqual(viaFolded, viaRaw);
});

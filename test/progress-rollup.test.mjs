/**
 * The fold: what the attempt log adds up to.
 *
 * src/lib/progress/rollup.ts is imported directly; Node 22 strips the types. It
 * holds no runtime imports at all for exactly this reason — its only imports are
 * `import type`, which are erased, so the module needs no bundler and no `@/`
 * alias resolution. Same arrangement as test/preview.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    inOrder,
    labelCounts,
    objectivesInPool,
    rollup,
    since,
    weakestDomains,
    weakestObjectives,
} from '../src/lib/progress/rollup.ts';
import { BLUEPRINT } from '../src/lib/blueprint.ts';

/** An attempt, with only the fields the fold reads spelled out. */
const at = (qid, domainId, correct, ts, outlineItems = [], extra = {}) => ({
    qid, domainId, correct, ts, outlineItems,
    chosen: correct ? 'A' : 'B', key: 'A', mode: 'domain', sessionId: 's1',
    ...extra,
});

test('the blueprint weights sum to 100, so a weighted score is already a percentage', () => {
    assert.equal(BLUEPRINT.reduce((n, b) => n + b.weight, 0), 100);
    assert.equal(BLUEPRINT.length, 8);
    assert.deepEqual(BLUEPRINT.map(b => b.weight), [16, 10, 13, 13, 13, 12, 13, 10]);
});

test('an empty log folds to zeroes, not to NaN', () => {
    const r = rollup([]);
    assert.deepEqual(r.total, { attempts: 0, correct: 0, acc: 0, lastSeen: 0 });
    assert.deepEqual(r.byDomain, {});
    assert.deepEqual(r.byObjective, {});
    assert.equal(r.seen.size, 0);
    assert.equal(r.latest.size, 0);
});

test('domain buckets count attempts, correct answers, accuracy and the last sighting', () => {
    const r = rollup([
        at('q1', 'domain_1', true, 1000),
        at('q2', 'domain_1', false, 2000),
        at('q3', 'domain_1', true, 3000),
        at('q4', 'domain_2', false, 1500),
    ]);
    assert.deepEqual(r.byDomain.domain_1, { attempts: 3, correct: 2, acc: 2 / 3, lastSeen: 3000 });
    assert.deepEqual(r.byDomain.domain_2, { attempts: 1, correct: 0, acc: 0, lastSeen: 1500 });
    assert.deepEqual(r.total, { attempts: 4, correct: 2, acc: 0.5, lastSeen: 3000 });
});

test('an attempt credits every objective it cites, and each keeps its domain', () => {
    const r = rollup([
        at('q1', 'domain_3', false, 1000, ['3.1.1', '3.4.2']),
        at('q1', 'domain_3', true, 2000, ['3.1.1', '3.4.2']),
        at('q2', 'domain_3', true, 3000, ['3.1.1']),
    ]);
    assert.equal(r.byObjective['3.1.1'].attempts, 3);
    assert.equal(r.byObjective['3.1.1'].correct, 2);
    assert.equal(r.byObjective['3.4.2'].attempts, 2);
    assert.equal(r.byObjective['3.4.2'].domainId, 'domain_3');
    // Coverage numerator: distinct objectives touched, not attempts.
    assert.deepEqual([...r.objectivesByDomain.domain_3].sort(), ['3.1.1', '3.4.2']);
});

test('`latest` is the most recent attempt per question, whatever order the log arrives in', () => {
    const log = [
        at('q1', 'domain_1', true, 3000),
        at('q1', 'domain_1', false, 1000),
        at('q1', 'domain_1', true, 2000),
    ];
    assert.equal(rollup(log).latest.get('q1').ts, 3000);
    assert.equal(rollup(log.slice().reverse()).latest.get('q1').ts, 3000);
});

test('the fold does not depend on the order attempts arrive in', () => {
    const log = [
        at('q1', 'domain_1', true, 1000, ['1.1']),
        at('q2', 'domain_2', false, 2000, ['2.1']),
        at('q1', 'domain_1', false, 3000, ['1.1']),
        at('q3', 'domain_1', true, 4000, ['1.2']),
    ];
    const forwards = rollup(log);
    const backwards = rollup(log.slice().reverse());
    assert.deepEqual(forwards.byDomain, backwards.byDomain);
    assert.deepEqual(forwards.byObjective, backwards.byObjective);
    assert.deepEqual(forwards.total, backwards.total);
});

test('inOrder is a total order: ties on ts break on id, then on question', () => {
    const a = { ...at('qb', 'domain_1', true, 5), id: 2 };
    const b = { ...at('qa', 'domain_1', true, 5), id: 1 };
    const c = at('qc', 'domain_1', true, 4);
    assert.deepEqual(inOrder([a, b, c]).map(x => x.qid), ['qc', 'qa', 'qb']);
    // Same input, different starting order, same result.
    assert.deepEqual(inOrder([b, c, a]).map(x => x.qid), ['qc', 'qa', 'qb']);
});

test('since() windows the log inclusively', () => {
    const log = [at('q1', 'domain_1', true, 100), at('q2', 'domain_1', true, 200)];
    assert.equal(since(log, 200).length, 1);
    assert.equal(since(log, 100).length, 2);
    assert.equal(since(log, 201).length, 0);
});

// ── weakness ordering ────────────────────────────────────────────────────────

test('weakness is what a gap costs: (1 - accuracy) x the domain exam weight', () => {
    // domain_1 is 16% of the paper, domain_2 is 10%.
    // Half right in domain_1 => 0.5 x 16 = 8. All wrong in domain_2 => 1 x 10 = 10.
    const r = rollup([
        at('q1', 'domain_1', true, 1000, ['1.1']),
        at('q2', 'domain_1', false, 1100, ['1.1']),
        at('q3', 'domain_2', false, 1200, ['2.1']),
    ]);
    const rows = weakestObjectives(r, BLUEPRINT);
    assert.deepEqual(rows.map(x => x.id), ['2.1', '1.1']);
    assert.equal(rows[0].score, 10);
    assert.equal(rows[1].score, 8);
});

test('accuracy alone would get the ordering wrong, which is the point of the weighting', () => {
    // 60% right in domain 1 (16%) costs 6.4; 50% right in domain 8 (10%) costs 5.
    // By accuracy alone domain 8 looks worse.
    const log = [];
    for (let i = 0; i < 10; i++) log.push(at(`a${i}`, 'domain_1', i < 6, 1000 + i, ['1.1']));
    for (let i = 0; i < 10; i++) log.push(at(`b${i}`, 'domain_8', i < 5, 2000 + i, ['8.1']));
    const rows = weakestObjectives(rollup(log), BLUEPRINT);
    assert.equal(rows[0].id, '1.1');
    assert.equal(Math.round(rows[0].score * 100) / 100, 6.4);
    assert.equal(rows[1].score, 5);
});

test('ties break on blueprint order and then on id, so the ordering is total', () => {
    // Both entirely wrong, both in domain_3: same score, so id decides.
    const r = rollup([
        at('q1', 'domain_3', false, 1000, ['3.9']),
        at('q2', 'domain_3', false, 1001, ['3.1']),
        // domain_4 has the same weight as domain_3; blueprint order decides.
        at('q3', 'domain_4', false, 1002, ['4.1']),
    ]);
    assert.deepEqual(weakestObjectives(r, BLUEPRINT).map(x => x.id), ['3.1', '3.9', '4.1']);
});

test('a limit takes the costliest, and weakestDomains works the same way', () => {
    const r = rollup([
        at('q1', 'domain_1', false, 1000),
        at('q2', 'domain_2', false, 1000),
        at('q3', 'domain_8', true, 1000),
    ]);
    const rows = weakestDomains(r, BLUEPRINT);
    assert.deepEqual(rows.map(x => x.id), ['domain_1', 'domain_2', 'domain_8']);
    assert.deepEqual(rows.map(x => x.score), [16, 10, 0]);
    assert.equal(weakestDomains(r, BLUEPRINT, 1).length, 1);
    assert.equal(weakestDomains(r, BLUEPRINT, 1)[0].id, 'domain_1');
});

// ── the distractor vocabulary ────────────────────────────────────────────────

test('labels are counted over wrong answers only', () => {
    const counts = labelCounts([
        at('q1', 'domain_1', false, 1000, [], { label: 'wrong scope' }),
        at('q2', 'domain_1', false, 2000, [], { label: 'wrong scope' }),
        at('q3', 'domain_1', false, 3000, [], { label: 'wrong phase' }),
        // Correct answers carry no label, and a stray one is still ignored.
        at('q4', 'domain_1', true, 4000, [], { label: 'wrong scope' }),
        // A wrong answer on a question with no reasons recorded.
        at('q5', 'domain_1', false, 5000),
    ]);
    assert.deepEqual(counts.map(c => [c.label, c.count]), [['wrong scope', 2], ['wrong phase', 1]]);
    assert.equal(counts[0].share, 2 / 3);
    assert.equal(counts[1].share, 1 / 3);
});

test('the example on each label is the most recent, whatever order the log arrives in', () => {
    const log = [
        at('q1', 'domain_1', false, 1000, [], { label: 'wrong scope' }),
        at('q9', 'domain_1', false, 9000, [], { label: 'wrong scope' }),
        at('q5', 'domain_1', false, 5000, [], { label: 'wrong scope' }),
    ];
    assert.equal(labelCounts(log)[0].example.qid, 'q9');
    assert.equal(labelCounts(log.slice().reverse())[0].example.qid, 'q9');
});

test('equal counts break on the label, so the list does not reshuffle between loads', () => {
    const counts = labelCounts([
        at('q1', 'domain_1', false, 1000, [], { label: 'wrong scope' }),
        at('q2', 'domain_1', false, 2000, [], { label: 'correct but not first' }),
    ]);
    assert.deepEqual(counts.map(c => c.label), ['correct but not first', 'wrong scope']);
});

test('the label list is counted off the log, not seeded from the published eight', () => {
    // A ninth label added to the bank appears without an edit to rollup.ts, and
    // a label the reader has never fallen for never appears at all.
    const counts = labelCounts([at('q1', 'domain_1', false, 1, [], { label: 'a ninth label' })]);
    assert.deepEqual(counts.map(c => c.label), ['a ninth label']);
});

// ── coverage context ─────────────────────────────────────────────────────────

test('objectivesInPool reports what the loaded questions can actually reach', () => {
    const reach = objectivesInPool([
        { id: 'q1', domainId: 'domain_1', outlineItems: ['1.1', '1.2'] },
        { id: 'q2', domainId: 'domain_1', outlineItems: ['1.2'] },
        { id: 'q3', domainId: 'domain_2', outlineItems: ['2.1'] },
        { id: 'q4', outlineItems: ['9.9'] }, // no domain: not reachable by domain
    ]);
    assert.equal(reach.domain_1.size, 2);
    assert.equal(reach.domain_2.size, 1);
    assert.equal(reach.undefined, undefined);
});

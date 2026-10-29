/**
 * Taking your progress with you, and the two things that must be true of it:
 * nothing but the answer log leaves the device, and an import cannot corrupt
 * what is already here.
 *
 * The last test in this file is the acceptance criterion in one line — export,
 * import on a clean profile, and the rollup and the SM-2 schedule come out
 * identical.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    EXPORT_SCHEMA,
    attemptKey,
    buildExport,
    exportFilename,
    mergeAttempts,
    parseExport,
} from '../src/lib/progress/export.ts';
import { labelCounts, rollup, weakestObjectives } from '../src/lib/progress/rollup.ts';
import { schedule } from '../src/lib/progress/scheduler.ts';
import { BLUEPRINT } from '../src/lib/blueprint.ts';

const PACE_MS = 75_000;

const at = (qid, domainId, correct, ts, extra = {}) => ({
    qid, domainId, correct, ts, outlineItems: [`${domainId.slice(-1)}.1`],
    chosen: correct ? 'A' : 'C', key: 'A', mode: 'domain', sessionId: 's1', ms: 40_000,
    ...extra,
});

const sample = () => [
    at('q1', 'domain_1', true, 1_000),
    at('q2', 'domain_1', false, 2_000, { label: 'wrong scope' }),
    at('q3', 'domain_5', true, 3_000, { ms: 200_000 }),
    at('q1', 'domain_1', false, 4_000, { label: 'wrong phase' }),
];

test('the export names its schema, its time and the bank edition it was recorded against', () => {
    const out = buildExport(sample(), '2026-09-06', 5_000);
    assert.equal(out.schema, EXPORT_SCHEMA);
    assert.equal(out.schema, 1);
    assert.equal(out.exportedAt, 5_000);
    assert.equal(out.edition, '2026-09-06');
    assert.equal(out.attempts.length, 4);
});

test('attempts come out oldest first, so two exports from one device differ by an append', () => {
    const out = buildExport(sample().slice().reverse(), 'ed', 0);
    assert.deepEqual(out.attempts.map(a => a.ts), [1_000, 2_000, 3_000, 4_000]);
});

test('NO entitlement, licence or device data can ride out in the file', () => {
    // The export copies a named list of fields rather than spreading the record,
    // so a field added to an attempt elsewhere is dropped rather than published.
    const contaminated = [{
        ...at('q1', 'domain_1', true, 1_000),
        id: 42,
        licenceKey: 'SPD-XXXX-YYYY',
        unlockToken: 'eyJhbGciOi...',
        entitlement: { tier: 'paid', email: 'reader@example.com' },
        deviceId: 'abc-123',
    }];
    const out = buildExport(contaminated, 'ed', 0);
    const keys = Object.keys(out.attempts[0]).sort();
    assert.deepEqual(keys, [
        'chosen', 'correct', 'domainId', 'key', 'label', 'mode', 'ms', 'outlineItems', 'qid', 'sessionId', 'ts',
    ].filter(k => keys.includes(k)));
    for (const banned of ['id', 'licenceKey', 'unlockToken', 'entitlement', 'deviceId']) {
        assert.equal(banned in out.attempts[0], false, `${banned} must not be exported`);
    }
    // And nothing resembling one survives a round trip through JSON either.
    const text = JSON.stringify(out);
    for (const banned of ['licenceKey', 'unlockToken', 'entitlement', 'deviceId', 'reader@example.com']) {
        assert.equal(text.includes(banned), false, `${banned} found in the exported text`);
    }
});

test('the local autoincrement key is never exported — it is this device\'s, not the answer\'s', () => {
    const out = buildExport([{ ...at('q1', 'domain_1', true, 1), id: 7 }], 'ed', 0);
    assert.equal('id' in out.attempts[0], false);
});

test('an absent optional field stays absent rather than becoming null', () => {
    const bare = { qid: 'q1', domainId: 'domain_1', correct: true, ts: 1, outlineItems: [], chosen: 'A', key: 'A', mode: 'domain', sessionId: 's' };
    const out = buildExport([bare], 'ed', 0);
    assert.equal('ms' in out.attempts[0], false);
    assert.equal('label' in out.attempts[0], false);
});

// ── reading a file back ──────────────────────────────────────────────────────

test('a file that is not a progress export is rejected, by message', () => {
    assert.throws(() => parseExport('[]'), /Not a progress file/);
    assert.throws(() => parseExport('"hello"'), /Not a progress file/);
    assert.throws(() => parseExport(JSON.stringify({ attempts: [] })), /no schema/);
    assert.throws(() => parseExport(JSON.stringify({ schema: 1 })), /no attempts/);
    assert.throws(() => parseExport('{ not json'), SyntaxError);
});

test('a file from a newer app says so instead of being read half-correctly', () => {
    assert.throws(
        () => parseExport(JSON.stringify({ schema: 2, attempts: [] })),
        /newer version/,
    );
});

test('rows that are not attempts are skipped and counted, not thrown on', () => {
    const parsed = parseExport(JSON.stringify({
        schema: 1,
        exportedAt: 10,
        edition: 'ed',
        attempts: [
            at('good', 'domain_1', true, 1),
            null,
            'nonsense',
            { qid: 'no-domain', correct: true, ts: 2 },
            { qid: 'bad-ts', domainId: 'domain_1', correct: true, ts: 'yesterday' },
            { qid: 'bad-correct', domainId: 'domain_1', correct: 'yes', ts: 3 },
            { qid: '', domainId: 'domain_1', correct: true, ts: 4 },
            { ...at('bad-items', 'domain_1', true, 5), outlineItems: [1, 2] },
            at('also-good', 'domain_2', false, 6),
        ],
    }));
    assert.deepEqual(parsed.attempts.map(a => a.qid), ['good', 'also-good']);
    assert.equal(parsed.skipped, 7);
    assert.equal(parsed.edition, 'ed');
    assert.equal(parsed.exportedAt, 10);
});

test('parseExport accepts an object as well as text, so a caller need not re-stringify', () => {
    const out = buildExport(sample(), 'ed', 0);
    assert.deepEqual(parseExport(out).attempts, parseExport(JSON.stringify(out)).attempts);
});

// ── merging ──────────────────────────────────────────────────────────────────

test('an attempt is identified by (question, time)', () => {
    assert.equal(attemptKey({ qid: 'q1', ts: 5 }), attemptKey({ qid: 'q1', ts: 5, chosen: 'B' }));
    assert.notEqual(attemptKey({ qid: 'q1', ts: 5 }), attemptKey({ qid: 'q1', ts: 6 }));
    assert.notEqual(attemptKey({ qid: 'q1', ts: 5 }), attemptKey({ qid: 'q2', ts: 5 }));
});

test('importing the same file twice adds nothing the second time', () => {
    const log = sample();
    const file = parseExport(buildExport(log, 'ed', 0)).attempts;

    const first = mergeAttempts([], file);
    assert.equal(first.added.length, 4);
    assert.equal(first.duplicates, 0);

    const second = mergeAttempts(first.added, file);
    assert.equal(second.added.length, 0);
    assert.equal(second.duplicates, 4);
});

test('a partial overlap adds only what is missing', () => {
    const here = sample().slice(0, 2);
    const file = parseExport(buildExport(sample(), 'ed', 0)).attempts;
    const { added, duplicates } = mergeAttempts(here, file);
    assert.deepEqual(added.map(a => a.ts), [3_000, 4_000]);
    assert.equal(duplicates, 2);
});

test('a file that repeats a row inside itself still adds it once', () => {
    const one = parseExport(buildExport([at('q1', 'domain_1', true, 1)], 'ed', 0)).attempts;
    const { added, duplicates } = mergeAttempts([], [...one, ...one]);
    assert.equal(added.length, 1);
    assert.equal(duplicates, 1);
});

test('two answers to the same question at different times are both kept', () => {
    // The log is a history, not a set of latest-known states.
    const file = parseExport(buildExport([
        at('q1', 'domain_1', false, 1_000),
        at('q1', 'domain_1', true, 2_000),
    ], 'ed', 0)).attempts;
    assert.equal(mergeAttempts([], file).added.length, 2);
});

test('merge never touches what is already stored', () => {
    const here = Object.freeze(sample().map(Object.freeze));
    mergeAttempts(here, parseExport(buildExport(sample(), 'ed', 0)).attempts);
    assert.equal(here.length, 4);
});

test('the filename carries the date, so two exports do not overwrite each other', () => {
    const name = exportFilename(Date.UTC(2026, 8, 7, 12));
    assert.match(name, /^eight-domains-progress-2026-09-0\d\.json$/);
});

// ── the acceptance criterion ─────────────────────────────────────────────────

test('export, then import on a clean profile, reproduces the rollup and the schedule exactly', () => {
    const log = [];
    for (let i = 0; i < 60; i++) {
        const d = (i % 8) + 1;
        log.push(at(
            `q${i}`, `domain_${d}`, i % 3 !== 0, 1_000 + i * 60_000,
            { outlineItems: [`${d}.${(i % 5) + 1}`], label: i % 3 === 0 ? 'wrong scope' : undefined, ms: 30_000 + (i % 4) * 30_000 },
        ));
    }
    // The device that exported: attempts carry local autoincrement ids.
    const here = log.map((a, i) => ({ ...a, id: i + 1 }));

    const file = JSON.stringify(buildExport(here, '2026-09-06', 999_999));

    // A clean profile: nothing stored, ids assigned fresh on the way in.
    const parsed = parseExport(file);
    const { added } = mergeAttempts([], parsed.attempts);
    const there = added.map((a, i) => ({ ...a, id: i + 1 }));

    assert.equal(there.length, here.length);
    assert.deepEqual(rollup(there).byDomain, rollup(here).byDomain);
    assert.deepEqual(rollup(there).byObjective, rollup(here).byObjective);
    assert.deepEqual(rollup(there).total, rollup(here).total);
    assert.deepEqual(
        weakestObjectives(rollup(there), BLUEPRINT).map(r => [r.id, r.score]),
        weakestObjectives(rollup(here), BLUEPRINT).map(r => [r.id, r.score]),
    );
    assert.deepEqual(
        labelCounts(there).map(l => [l.label, l.count]),
        labelCounts(here).map(l => [l.label, l.count]),
    );
    assert.deepEqual(
        [...schedule(there, PACE_MS).entries()].map(([k, c]) => [k, c.ef, c.interval, c.reps, c.due]),
        [...schedule(here, PACE_MS).entries()].map(([k, c]) => [k, c.ef, c.interval, c.reps, c.due]),
    );
});

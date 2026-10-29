/**
 * The free preview: what the practice app serves out of the paid bank.
 *
 * These run against the REAL src/data/content.json, not a fixture. The point of
 * the picker is a claim about coverage -- "every scenario in the domain is
 * represented", "the key is not skewed" -- and a claim like that is only worth
 * anything measured on the bank that actually ships. A fixture would prove the
 * algorithm compiles.
 *
 * src/lib/preview.ts is imported directly; Node 22 strips the types. It holds
 * no runtime imports for exactly this reason -- its only import is `import type`,
 * which is erased, so the module needs no bundler and no `@/` alias resolution.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
    DISCRETE_GROUP,
    FREE_PREVIEW_PER_DOMAIN,
    groupKeyOf,
    isDrill,
    pickPreview,
    previewStats,
} from '../src/lib/preview.ts';
import { PREVIEW_PATH, buildPreview, serialise } from '../scripts/build-preview.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bank = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'content.json'), 'utf8'));

const drillsOf = (domain) => (domain.questionsV2 ?? []).filter(isDrill);
const previewOf = (domain) => pickPreview(drillsOf(domain), FREE_PREVIEW_PER_DOMAIN);

test('the bank still carries the v2 examination the preview is drawn from', () => {
    assert.equal(bank.domains.length, 8);
    const v2 = bank.domains.flatMap(d => d.questionsV2 ?? []);
    assert.equal(v2.length, 750, 'the paid examination is 750 items');
    assert.equal(v2.filter(isDrill).length, 500, '500 domain drills; the rest are Forms A and B');
    assert.equal(bank.domains.flatMap(d => d.stimuli ?? []).length, 133);
});

test('every previewed question carries the data the app now shows', () => {
    for (const domain of bank.domains) {
        for (const q of previewOf(domain)) {
            const wrong = ['A', 'B', 'C', 'D'].filter(L => L !== q.correctAnswer);
            assert.deepEqual(
                Object.keys(q.distractorReasons ?? {}).sort(), wrong.sort(),
                `${q.id}: a reason for every wrong option and none for the key`,
            );
            for (const L of wrong) {
                assert.ok(q.distractorReasons[L].label, `${q.id}/${L}: label`);
                assert.ok(q.distractorReasons[L].wouldAnswer, `${q.id}/${L}: wouldAnswer`);
            }
            assert.ok(q.optionsShort?.[q.correctAnswer], `${q.id}: short form of the key`);
            assert.ok(q.recallLine, `${q.id}: recallLine`);
        }
    }
});

test('a previewed question that names a scenario has one in the bank', () => {
    const ids = new Set(bank.domains.flatMap(d => (d.stimuli ?? []).map(s => s.id)));
    for (const domain of bank.domains) {
        for (const q of previewOf(domain)) {
            if (q.stimulusId) assert.ok(ids.has(q.stimulusId), `${q.id} -> missing ${q.stimulusId}`);
        }
    }
});

test('the pick is deterministic and independent of the order the bank arrives in', () => {
    // Static export: the sample is computed at build time for the server markup
    // and again in the browser at hydration. If those disagree React discards
    // the tree. And a re-import that reorders the JSON must not silently change
    // which questions are free.
    const rotate = (xs, n) => xs.slice(n).concat(xs.slice(0, n));
    for (const domain of bank.domains) {
        const pool = drillsOf(domain);
        const a = previewOf(domain).map(q => q.id);
        const b = previewOf(domain).map(q => q.id);
        assert.deepEqual(a, b, 'same call, same answer');
        const rotated = pickPreview(rotate(pool, 7), FREE_PREVIEW_PER_DOMAIN).map(q => q.id);
        assert.deepEqual([...rotated].sort(), [...a].sort(), `${domain.id}: same set from a rotated pool`);
    }
});

test('the preview is spread across the domain, not clustered in three scenarios', () => {
    // Taking the first 20 drills of a domain would land inside four or five
    // testlets, because the drills are written in runs of three to six.
    for (const domain of bank.domains) {
        const pool = drillsOf(domain);
        const scenariosAvailable = new Set(pool.map(groupKeyOf));
        scenariosAvailable.delete(DISCRETE_GROUP);
        const picked = previewOf(domain);
        const stats = previewStats(picked);

        assert.equal(picked.length, FREE_PREVIEW_PER_DOMAIN, `${domain.id}: 20 questions`);
        assert.equal(new Set(picked.map(q => q.id)).size, picked.length, `${domain.id}: no repeats`);
        assert.equal(
            stats.scenarios, scenariosAvailable.size,
            `${domain.id}: every scenario in the domain appears at least once`,
        );
        assert.ok(stats.objectives >= 18, `${domain.id}: reaches ${stats.objectives} outline objectives, wanted 18+`);

        // The naive first-20 is the thing this picker exists to beat.
        const naive = previewStats(pool.slice(0, FREE_PREVIEW_PER_DOMAIN));
        assert.ok(
            stats.scenarios > naive.scenarios,
            `${domain.id}: ${stats.scenarios} scenarios vs ${naive.scenarios} for the first 20`,
        );
    }
});

test('the answer key of the preview is flat, so position tells the reader nothing', () => {
    const total = { A: 0, B: 0, C: 0, D: 0 };
    for (const domain of bank.domains) {
        for (const [L, n] of Object.entries(previewStats(previewOf(domain)).keyCounts)) total[L] += n;
    }
    const served = Object.values(total).reduce((a, b) => a + b, 0);
    assert.equal(served, 8 * FREE_PREVIEW_PER_DOMAIN);
    const worst = Math.max(...Object.values(total)) / served;
    assert.ok(worst <= 0.30, `answer key skewed: ${JSON.stringify(total)}, worst ${(worst * 100).toFixed(1)}%`);
});

test('a scenario\'s questions stay together, in the order the book prints them', () => {
    for (const domain of bank.domains) {
        const picked = previewOf(domain);
        const seen = new Set();
        let last = null;
        for (const q of picked) {
            const key = groupKeyOf(q);
            if (key !== last) {
                assert.ok(!seen.has(key), `${domain.id}: ${key} appears in two runs`);
                seen.add(key);
                last = key;
            } else if (q.stimulusSeq !== undefined) {
                // within a run, book order
                const prev = picked[picked.indexOf(q) - 1];
                assert.ok((prev.stimulusSeq ?? 0) <= q.stimulusSeq, `${domain.id}: ${key} out of order`);
            }
        }
    }
});

test('pickPreview copes with a pool smaller than the limit and an empty one', () => {
    const pool = drillsOf(bank.domains[0]).slice(0, 3);
    assert.equal(pickPreview(pool, FREE_PREVIEW_PER_DOMAIN).length, 3);
    assert.deepEqual(pickPreview([], 20), []);
});

test('the committed preview.json is what the generator produces from the bank', () => {
    // preview.json is generated and committed, and `npm run build` regenerates
    // it first, so a stale one cannot ship. This catches the other direction:
    // a hand-edit, or a bank change committed without rerunning the generator,
    // which would make the reviewed file and the shipped file different things.
    const onDisk = readFileSync(PREVIEW_PATH, 'utf8');
    assert.equal(serialise(buildPreview(bank)), onDisk,
        'src/data/preview.json is out of date -- run `npm run preview:build`');
});

test('preview.json carries the sample and NOT the rest of the paid bank', () => {
    const shipped = JSON.parse(readFileSync(PREVIEW_PATH, 'utf8'));
    const shippedIds = new Set(shipped.domains.flatMap(d => d.questions.map(q => q.id)));

    assert.equal(shippedIds.size, 8 * FREE_PREVIEW_PER_DOMAIN);
    assert.equal(shipped.preview.served, shippedIds.size);
    assert.equal(shipped.preview.paid, 750);

    // The whole point of generating this file: an imported JSON module is
    // bundled into the client, so anything left in here is published. The 590
    // questions the preview did not pick must not be reachable, in any shape.
    const text = readFileSync(PREVIEW_PATH, 'utf8');
    const withheld = bank.domains
        .flatMap(d => d.questionsV2 ?? [])
        .filter(q => !shippedIds.has(q.id));
    assert.equal(withheld.length, 750 - shippedIds.size);
    for (const q of withheld) {
        assert.ok(!text.includes(q.id), `${q.id} is not in the preview but its id ships`);
        assert.ok(!text.includes(q.question), `a withheld question's stem ships: ${q.id}`);
    }
    assert.ok(!('questionsV2' in shipped.domains[0]), 'the v2 pool must not be copied through');
    assert.ok(!shipped.domains[0].questions.some(q => q.form && q.form !== 'drill'),
        'the mock forms are not part of the free sample');

    // Every scenario that ships is one a shipped question is set in.
    const needed = new Set(shipped.domains.flatMap(d => d.questions.map(q => q.stimulusId).filter(Boolean)));
    for (const d of shipped.domains) {
        for (const stim of d.stimuli) assert.ok(needed.has(stim.id), `unused scenario ships: ${stim.id}`);
    }
});

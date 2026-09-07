/**
 * WP0: the seams the paid tier is built on.
 *
 * The important one is the last test. Everything else here is a convenience;
 * `no src/ file imports the full bank` is the one that stops the paid product
 * being published by accident, and it is deliberately a dumb grep rather than
 * anything clever, because the failure it guards against is also dumb.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

import { flatten, readSource } from '../scripts/sync-outline.mjs';
import { buildPaid, readBank } from '../scripts/build-paid.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const bank = readBank();
const outline = readJson('src/data/outline.json');
const preview = readJson('src/data/preview.json');

const allOutlineRefs = () => {
    const used = new Set();
    for (const d of bank.domains) {
        for (const q of [...(d.questions ?? []), ...(d.questionsV2 ?? [])])
            for (const o of q.outlineItems ?? []) used.add(o);
        for (const s of d.stimuli ?? []) for (const o of s.outlineItems ?? []) used.add(o);
    }
    return used;
};

test('the committed outline.json is what the sync produces', () => {
    assert.deepEqual(flatten(readSource()), outline,
        'src/data/outline.json is stale — run `node scripts/sync-outline.mjs`');
});

test('every outline reference in the bank resolves to a title', () => {
    const used = allOutlineRefs();
    assert.equal(used.size, 307, 'the bank cites 307 distinct objectives');
    const missing = [...used].filter(id => !outline.items[id]);
    assert.deepEqual(missing, [], 'these are cited by questions but absent from the outline');
    // and every one knows its domain, which the weakness map needs
    const homeless = [...used].filter(id => !outline.domainOf[id]);
    assert.deepEqual(homeless, [], 'cited objectives with no domain');
});

test('the paid cut is the whole examination, versioned with the preview', () => {
    const paid = buildPaid(bank);
    const q = paid.domains.reduce((n, d) => n + d.questions.length, 0);
    const s = paid.domains.reduce((n, d) => n + d.stimuli.length, 0);
    assert.equal(q, 750);
    assert.equal(s, 133);
    assert.equal(paid.schema, 1);
    assert.equal(paid.edition, bank.bank.v2.edition);
    assert.equal(paid.edition, preview.bank.v2.edition,
        'the client checks its cached bank against preview.json\'s edition — they must agree');
});

test('the free preview is a strict subset of the paid bank', () => {
    // Unlocking replaces the bank wholesale rather than merging two pools. That
    // is only correct while this holds.
    const paidIds = new Set(buildPaid(bank).domains.flatMap(d => d.questions.map(q => q.id)));
    const freeIds = preview.domains.flatMap(d => d.questions.map(q => q.id));
    assert.equal(freeIds.length, 160);
    const strays = freeIds.filter(id => !paidIds.has(id));
    assert.deepEqual(strays, [], 'free questions that are not in the paid bank');
});

test('preview.json carries the paid drill count per domain', () => {
    const byDomain = preview.preview.paidDrillsByDomain;
    assert.ok(byDomain, 'missing — a domain card cannot say "20 of 80" without it');
    assert.equal(Object.keys(byDomain).length, 8);
    for (const d of bank.domains) {
        const drills = (d.questionsV2 ?? []).filter(q => (q.form ?? 'drill') === 'drill').length;
        assert.equal(byDomain[d.id], drills, `${d.id}`);
        assert.ok(drills >= 20, `${d.id}: fewer drills than the free sample takes`);
    }
});

test('no file under src/ imports the full bank or the paid cut', () => {
    // The app imports src/data/preview.json and nothing else. An imported JSON
    // module is bundled into the client: importing content.json here publishes
    // all 750 paid questions, measured at 4.2 MB of chunks with every withheld
    // item readable. stage-learn.sh greps the built export for the same thing;
    // this catches it a minute earlier and names the file.
    const offenders = [];
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            if (statSync(p).isDirectory()) { walk(p); continue; }
            if (!/\.(ts|tsx|mjs|js)$/.test(name)) continue;
            const src = readFileSync(p, 'utf8');
            // Match an import/require SPECIFIER, not the words. content.ts talks
            // about content.json at length, in a comment explaining why it does
            // not import it; a substring check flags that and cries wolf.
            const re = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]*\/)?(content|paid)\.json['"]/g;
            for (const m of src.matchAll(re))
                offenders.push(`${relative(root, p)} imports ${m[0].slice(m[0].indexOf("'") + 1 || m[0].indexOf('"') + 1)}`);
        }
    };
    walk(join(root, 'src'));
    assert.deepEqual(offenders, [], 'these would ship the paid bank to every visitor');
});

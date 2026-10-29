/**
 * The attempt log where it actually lives: IndexedDB, through src/lib/idb.ts.
 *
 * fake-indexeddb/auto installs the globals before anything else is imported —
 * ESM hoists imports, so this line has to stay first and stay side-effecting.
 * src/lib/idb.ts is imported directly; it has no `@/` imports, only the `idb`
 * package, which Node resolves normally.
 *
 * What is checked here is the round trip the acceptance criteria name: an
 * answer lands in the store and in the rollup, a reload preserves it, and an
 * export imported onto a clean profile reproduces the rollup exactly.
 */
import 'fake-indexeddb/auto';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DB_NAME, db, kvGet, kvSet, resetDbHandle } from '../src/lib/idb.ts';
import { rollup, weakestDomains } from '../src/lib/progress/rollup.ts';
import { schedule } from '../src/lib/progress/scheduler.ts';
import { buildExport, mergeAttempts, parseExport } from '../src/lib/progress/export.ts';
import { BLUEPRINT } from '../src/lib/blueprint.ts';

const PACE_MS = 75_000;

const at = (qid, domainId, correct, ts, extra = {}) => ({
    qid, domainId, correct, ts,
    outlineItems: [`${domainId.slice(-1)}.1`],
    chosen: correct ? 'A' : 'C', key: 'A', mode: 'domain', sessionId: 's1', ms: 30_000,
    ...extra,
});

/**
 * A fresh browser profile.
 *
 * The connection has to be CLOSED before the delete, not merely forgotten:
 * resetDbHandle() drops the cached promise, but the underlying IDBDatabase is
 * still open, and deleteDatabase then fires `blocked` and never completes. That
 * hangs the run rather than failing it.
 */
async function wipe() {
    (await db()).close();
    resetDbHandle();
    await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        // A leaked connection makes the delete wait rather than fail, and the
        // run then hangs with no output at all. Fail it instead, by name.
        const guard = setTimeout(
            () => reject(new Error('deleteDatabase never completed: a connection was left open')),
            2_000,
        );
        const settle = (fn, arg) => { clearTimeout(guard); fn(arg); };
        req.onsuccess = () => settle(resolve);
        req.onerror = () => settle(reject, req.error);
        req.onblocked = () => settle(reject, new Error('deleteDatabase blocked: a connection is still open'));
    });
}

/** What the store's recordAttempt does. */
const append = async (record) => (await db()).add('attempts', record);

/** What the store's hydrate does. */
const readAll = async () => {
    const rows = await (await db()).getAll('attempts');
    rows.sort((a, b) => (a.ts - b.ts) || ((a.id ?? 0) - (b.id ?? 0)));
    return rows;
};

test('an answer lands in the store, and in the rollup, immediately', async () => {
    await wipe();
    await append(at('q1', 'domain_1', true, 1_000));
    const rows = await readAll();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].qid, 'q1');
    assert.ok(typeof rows[0].id === 'number', 'the store assigns the key');

    const r = rollup(rows);
    assert.equal(r.total.attempts, 1);
    assert.equal(r.byDomain.domain_1.correct, 1);
    assert.equal(r.byObjective['1.1'].attempts, 1);
});

test('a reload preserves it — the handle is dropped and the data is still there', async () => {
    await wipe();
    for (let i = 0; i < 5; i++) await append(at(`q${i}`, 'domain_2', i % 2 === 0, 1_000 + i));

    const before = await readAll();
    // Everything the browser keeps between page loads is on disk, not in the
    // module. A reload closes the connection and drops the cached handle; the
    // close matters, and not only here — a leaked connection blocks the next
    // test's deleteDatabase.
    (await db()).close();
    resetDbHandle();
    const after = await readAll();

    assert.deepEqual(after, before);
    assert.deepEqual(rollup(after).total, rollup(before).total);
});

test('the log is append-only: a second answer to the same question is a second row', async () => {
    await wipe();
    await append(at('q1', 'domain_1', false, 1_000));
    await append(at('q1', 'domain_1', true, 2_000));
    const rows = await readAll();
    assert.equal(rows.length, 2);
    const r = rollup(rows);
    assert.equal(r.seen.size, 1);
    assert.equal(r.latest.get('q1').correct, true, 'the later answer is the current one');
    assert.equal(r.byDomain.domain_1.attempts, 2, 'but both count towards accuracy');
});

test('the qid and ts indexes exist, so the log can be queried without a full scan', async () => {
    await wipe();
    await append(at('q1', 'domain_1', true, 1_000));
    await append(at('q2', 'domain_1', true, 2_000));
    await append(at('q1', 'domain_1', false, 3_000));

    const handle = await db();
    assert.equal((await handle.getAllFromIndex('attempts', 'qid', 'q1')).length, 2);
    assert.equal((await handle.getAllFromIndex('attempts', 'ts', IDBKeyRange.lowerBound(2_000))).length, 2);
});

test('the kv store is untouched by the attempt log, and vice versa', async () => {
    // The two share one database and one upgrade. A progress wipe must not take
    // the cached paid bank with it, and caching the bank must not disturb the log.
    await wipe();
    await kvSet('paid-bank', { edition: '2026-09-06', questions: 750 });
    await append(at('q1', 'domain_1', true, 1_000));

    await (await db()).clear('attempts');
    assert.deepEqual(await kvGet('paid-bank'), { edition: '2026-09-06', questions: 750 });
    assert.equal((await readAll()).length, 0);
});

test('export on one profile, import on a clean one, reproduces the rollup exactly', async () => {
    await wipe();
    const log = [];
    for (let i = 0; i < 40; i++) {
        const d = (i % 8) + 1;
        log.push(at(`q${i}`, `domain_${d}`, i % 3 !== 0, 1_000 + i * 60_000, {
            outlineItems: [`${d}.${(i % 4) + 1}`],
            label: i % 3 === 0 ? 'wrong scope' : undefined,
            ms: 20_000 + (i % 5) * 20_000,
        }));
    }
    for (const a of log) await append(a);

    const here = await readAll();
    const file = JSON.stringify(buildExport(here, '2026-09-06', 9_999_999));

    // A clean profile: a different browser, nothing stored.
    await wipe();
    assert.equal((await readAll()).length, 0);

    const parsed = parseExport(file);
    assert.equal(parsed.edition, '2026-09-06');
    const { added, duplicates } = mergeAttempts(await readAll(), parsed.attempts);
    assert.equal(duplicates, 0);
    for (const a of added) await append(a);

    const there = await readAll();
    assert.equal(there.length, here.length);
    assert.deepEqual(rollup(there).byDomain, rollup(here).byDomain);
    assert.deepEqual(rollup(there).byObjective, rollup(here).byObjective);
    assert.deepEqual(
        weakestDomains(rollup(there), BLUEPRINT).map(r => [r.id, r.score]),
        weakestDomains(rollup(here), BLUEPRINT).map(r => [r.id, r.score]),
    );
    assert.deepEqual([...schedule(there, PACE_MS).keys()].sort(), [...schedule(here, PACE_MS).keys()].sort());
    for (const [qid, card] of schedule(there, PACE_MS)) {
        const original = schedule(here, PACE_MS).get(qid);
        assert.deepEqual(
            [card.ef, card.interval, card.reps, card.due, card.lapses],
            [original.ef, original.interval, original.reps, original.due, original.lapses],
            qid,
        );
    }

    // And importing the same file a second time changes nothing.
    const again = mergeAttempts(there, parseExport(file).attempts);
    assert.equal(again.added.length, 0);
    assert.equal(again.duplicates, here.length);
});

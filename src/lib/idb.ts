import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * The one IndexedDB database, opened once and shared.
 *
 * Two stores, and the split is deliberate:
 *
 *   kv        small singletons — the cached paid bank, and whatever else needs
 *             to survive a reload but is too big for localStorage. The paid bank
 *             is 2.3 MB; localStorage's ~5 MB budget is already carrying a quiz
 *             sitting, and exceeding it throws rather than degrading.
 *   attempts  the append-only answer log. The ONLY stored truth about progress:
 *             SM-2 card state, per-objective rollups and the readiness score are
 *             all folds over this store, recomputed on load. Nothing derived is
 *             persisted, so nothing derived can disagree with the log.
 *
 * Both stores are declared here, in one upgrade callback, because two features
 * adding stores independently is how you end up with a version race that only
 * reproduces on a device that has been through both upgrades in the wrong order.
 */
export interface AttemptRecord {
    /** Auto-assigned by the store. */
    id?: number;
    /** Question id, e.g. "d1_v2_q033". Not the object: see quiz-store. */
    qid: string;
    domainId: string;
    /** 2024 outline objectives this question tests, copied at answer time. */
    outlineItems: string[];
    chosen: string;
    key: string;
    correct: boolean;
    /** The distractor label fallen for, when the answer was wrong. */
    label?: string;
    mode: string;
    sessionId: string;
    /** Unix milliseconds. */
    ts: number;
    /** Time to answer, milliseconds. */
    ms?: number;
}

interface EightDomainsDB extends DBSchema {
    kv: { key: string; value: unknown };
    attempts: {
        key: number;
        value: AttemptRecord;
        indexes: { qid: string; ts: number };
    };
}

export const DB_NAME = 'eight-domains';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EightDomainsDB>> | null = null;

/** Opens (and caches) the database. Safe to call from anywhere in the browser. */
export function db(): Promise<IDBPDatabase<EightDomainsDB>> {
    if (!dbPromise) {
        dbPromise = openDB<EightDomainsDB>(DB_NAME, DB_VERSION, {
            upgrade(database) {
                if (!database.objectStoreNames.contains('kv')) {
                    database.createObjectStore('kv');
                }
                if (!database.objectStoreNames.contains('attempts')) {
                    const store = database.createObjectStore('attempts', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('qid', 'qid');
                    store.createIndex('ts', 'ts');
                }
            },
        });
    }
    return dbPromise;
}

/** Tests and the "forget me" path both need to start from nothing. */
export function resetDbHandle(): void {
    dbPromise = null;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
    return (await db()).get('kv', key) as Promise<T | undefined>;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
    await (await db()).put('kv', value, key);
}

export async function kvDelete(key: string): Promise<void> {
    await (await db()).delete('kv', key);
}

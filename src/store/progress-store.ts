import { create } from 'zustand';
import { db, type AttemptRecord } from '@/lib/idb';
import { BLUEPRINT, PACE_SECONDS_PER_QUESTION } from '@/lib/blueprint';
import { getBankManifest, getExamQuestions } from '@/lib/content';
import { objectivesInDomain } from '@/lib/outline';
import type { AttemptInput } from '@/lib/progress/types';
import {
    labelCounts as foldLabelCounts,
    objectivesInPool,
    rollup as fold,
    weakestDomains as foldWeakestDomains,
    weakestObjectives as foldWeakestObjectives,
    type LabelCount,
    type Rollup,
    type WeaknessRow,
} from '@/lib/progress/rollup';
import {
    DAY_MS,
    dueQueue,
    schedule,
    studyQueue,
    type Card,
} from '@/lib/progress/scheduler';
import {
    READINESS_WINDOW_DAYS,
    readinessFrom,
    type Readiness,
} from '@/lib/progress/readiness';
import {
    buildExport,
    mergeAttempts,
    parseExport,
    type ProgressExport,
} from '@/lib/progress/export';

/**
 * Progress: the attempt log in memory, IndexedDB underneath, and every derived
 * number folded out of the log on demand.
 *
 * THIS REPLACES src/store/user-stats-store.ts, AND NOTHING WAS MIGRATED.
 * That store persisted eight `{correct, total}` pairs under the localStorage key
 * `cissp-user-stats`. There is no way to turn two running totals into the
 * attempts they came from — which question, when, chosen what, how long it took
 * — so there was nothing to carry across and no honest way to fake it. The key
 * is deleted once on hydration and the reader starts from an empty log.
 *
 * The state here is deliberately thin: `attempts`, and a hydration flag. Card
 * schedules, per-objective accuracy and the readiness score are all pure folds
 * (src/lib/progress/), recomputed from the log and cached only against the
 * identity of the array they were computed from. Nothing derived is stored, in
 * memory or on disk, so nothing derived can drift from the log.
 */

const PACE_MS = PACE_SECONDS_PER_QUESTION * 1000;

/** The 30-day accuracy window the readiness formula is defined over. */
const READINESS_WINDOW_MS = READINESS_WINDOW_DAYS * DAY_MS;

/** How many questions "Due today" aims at when there is nothing overdue. */
export const DAILY_TARGET = 20;

interface Derived {
    all: Rollup;
    cards: Map<string, Card>;
}

/**
 * Folds cached against the identity of the attempts array, not its contents.
 * `recordAttempt` replaces the array, so a new answer invalidates everything
 * without any invalidation logic to get wrong.
 */
const derivedCache = new WeakMap<readonly AttemptRecord[], Derived>();

function derive(attempts: readonly AttemptRecord[]): Derived {
    const hit = derivedCache.get(attempts);
    if (hit) return hit;
    const value: Derived = { all: fold(attempts), cards: schedule(attempts, PACE_MS) };
    derivedCache.set(attempts, value);
    return value;
}

/**
 * The question pool new material is drawn from: everything the app currently
 * serves, in blueprint order. On the free tier that is the 160-question
 * preview; if the paid bank is loaded it is whatever content.ts then serves.
 * The scheduler never sees a question object, only ids and objectives.
 */
const pool = () =>
    getExamQuestions().map(q => ({
        id: q.id,
        domainId: q.domainId,
        outlineItems: q.outlineItems,
    }));

const bankEdition = (): string => {
    const bank = getBankManifest();
    return bank?.v2?.edition ?? bank?.edition ?? 'unknown';
};

export interface ImportOutcome {
    added: number;
    duplicates: number;
    /** Rows in the file that were not attempts. */
    skipped: number;
    /** The edition the file was recorded against, when it named one. */
    edition: string;
}

interface ProgressState {
    /** The append-only log, oldest first once hydrated. The only stored truth. */
    attempts: AttemptRecord[];
    /** False until IndexedDB has been read. Selectors are honest but empty before then. */
    hydrated: boolean;
    hydrating: boolean;
    /** Set when IndexedDB is unavailable — a private window, or storage denied. */
    error: string | null;

    hydrate: () => Promise<void>;
    recordAttempt: (input: AttemptInput) => Promise<void>;
    /** Forget everything. The log is the reader's, including the right to drop it. */
    clearProgress: () => Promise<void>;

    // ── selectors: pure folds over `attempts` ────────────────────────────────
    rollup: () => Rollup;
    cards: () => Map<string, Card>;
    weakestDomains: (limit?: number) => WeaknessRow[];
    objectiveRollup: (limit?: number) => WeaknessRow[];
    labelCounts: () => LabelCount[];
    dueToday: (now?: number, limit?: number) => string[];
    /** Reviews due, topped up with unseen questions to the daily target. */
    todaysQueue: (now?: number, target?: number) => { due: string[]; fresh: string[]; ids: string[] };
    readiness: (now?: number) => Readiness;
    /** Objectives the loaded questions can reach, per domain — the honest ceiling. */
    reachableObjectives: () => Record<string, number>;
    exportPayload: (now?: number) => ProgressExport;
    exportJson: (now?: number) => string;
    importJson: (text: string) => Promise<ImportOutcome>;
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
    attempts: [],
    hydrated: false,
    hydrating: false,
    error: null,

    hydrate: async () => {
        if (get().hydrated || get().hydrating) return;
        set({ hydrating: true });
        try {
            // The store this replaces kept eight running totals here and nothing
            // else. Totals cannot become attempts, so there is nothing to
            // migrate; the key is simply dropped so it stops taking up space and
            // stops looking like a second source of truth.
            try { window.localStorage.removeItem('cissp-user-stats'); } catch { /* private mode */ }

            const rows = await (await db()).getAll('attempts');
            rows.sort((a, b) => (a.ts - b.ts) || ((a.id ?? 0) - (b.id ?? 0)));
            set({ attempts: rows, hydrated: true, hydrating: false, error: null });
        } catch (e) {
            // A browser with IndexedDB blocked still has to be able to take a
            // quiz; it just cannot remember it. Say so rather than crashing.
            set({
                hydrated: true,
                hydrating: false,
                error: e instanceof Error ? e.message : 'Progress storage is unavailable in this browser.',
            });
        }
    },

    recordAttempt: async (input) => {
        const record: AttemptRecord = { ...input, ts: input.ts ?? Date.now() };
        let stored: AttemptRecord = record;
        try {
            const key = await (await db()).add('attempts', record);
            stored = { ...record, id: key as number };
        } catch (e) {
            // Keep it in memory anyway: the sitting in front of the reader still
            // marks correctly, and the results page still adds up. It just will
            // not survive the reload, and the progress page says why.
            set({ error: e instanceof Error ? e.message : 'Could not save this answer.' });
        }
        // A new array, so the fold cache above misses and everything recomputes.
        set(state => ({ attempts: [...state.attempts, stored] }));
    },

    clearProgress: async () => {
        try {
            await (await db()).clear('attempts');
        } catch { /* nothing stored to clear */ }
        set({ attempts: [], error: null });
    },

    rollup: () => derive(get().attempts).all,
    cards: () => derive(get().attempts).cards,

    weakestDomains: (limit) => foldWeakestDomains(derive(get().attempts).all, BLUEPRINT, limit),
    objectiveRollup: (limit) => foldWeakestObjectives(derive(get().attempts).all, BLUEPRINT, limit),
    labelCounts: () => foldLabelCounts(get().attempts),

    dueToday: (now = Date.now(), limit) => dueQueue(derive(get().attempts).cards, now, limit),

    todaysQueue: (now = Date.now(), target = DAILY_TARGET) => {
        const { all, cards } = derive(get().attempts);
        return studyQueue(cards, all, pool(), now, target, BLUEPRINT);
    },

    readiness: (now = Date.now()) => {
        const attempts = get().attempts;
        const since = now - READINESS_WINDOW_MS;
        return readinessFrom(
            derive(attempts).all,
            fold(attempts.filter(a => a.ts >= since)),
            { now, windowMs: READINESS_WINDOW_MS, blueprint: BLUEPRINT, objectivesInDomain },
        );
    },

    reachableObjectives: () => {
        const byDomain = objectivesInPool(pool());
        const out: Record<string, number> = {};
        for (const b of BLUEPRINT) out[b.id] = byDomain[b.id]?.size ?? 0;
        return out;
    },

    exportPayload: (now = Date.now()) => buildExport(get().attempts, bankEdition(), now),
    exportJson: (now = Date.now()) => JSON.stringify(buildExport(get().attempts, bankEdition(), now), null, 2),

    importJson: async (text) => {
        const parsed = parseExport(text);
        const { added, duplicates } = mergeAttempts(get().attempts, parsed.attempts);

        const appended: AttemptRecord[] = [];
        try {
            const handle = await db();
            const tx = handle.transaction('attempts', 'readwrite');
            for (const a of added) {
                const key = await tx.store.add(a as AttemptRecord);
                appended.push({ ...(a as AttemptRecord), id: key as number });
            }
            await tx.done;
        } catch (e) {
            set({ error: e instanceof Error ? e.message : 'Could not save the imported attempts.' });
            appended.length = 0;
            for (const a of added) appended.push(a as AttemptRecord);
        }

        set(state => ({
            attempts: [...state.attempts, ...appended].sort(
                (x, y) => (x.ts - y.ts) || ((x.id ?? 0) - (y.id ?? 0)),
            ),
        }));

        return {
            added: added.length,
            duplicates,
            skipped: parsed.skipped,
            edition: parsed.edition,
        };
    },
}));


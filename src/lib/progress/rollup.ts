/**
 * The fold. Every number the progress page and the report show is computed
 * here, from the attempt log, on load.
 *
 * WHY NOTHING IS STORED
 * ---------------------
 * The append-only `attempts` table is the only stored truth. Per-objective
 * totals, SM-2 card state and the readiness score are all recomputed from it.
 * The store this replaces kept eight correct/total pairs and no log, so there
 * was no way to ask it a question it had not been designed for, and no way to
 * check it: a rollup that is only ever written can quietly disagree with what
 * actually happened and nothing notices. A fold cannot disagree with its input.
 *
 * Pure: no imports with a runtime value, no clock, no storage. Everything it
 * needs about the exam blueprint arrives as an argument.
 */
import type { AttemptRecord, DomainWeight } from '@/lib/progress/types';

export interface Bucket {
    attempts: number;
    correct: number;
    /** correct / attempts, and 0 when there are none — never NaN on a page. */
    acc: number;
    /** Unix ms of the most recent attempt, 0 when there are none. */
    lastSeen: number;
}

export interface ObjectiveBucket extends Bucket {
    /** The 2024 outline objective, e.g. "1.3.2". */
    id: string;
    /**
     * Taken from the attempts themselves, not from the outline. A question is
     * answered inside a domain, and that is the domain its objectives are
     * credited to — which also keeps this module free of a runtime import of
     * the outline data.
     */
    domainId: string;
}

export interface Rollup {
    byObjective: Record<string, ObjectiveBucket>;
    byDomain: Record<string, Bucket>;
    /** Distinct objectives attempted, per domain. The coverage numerator. */
    objectivesByDomain: Record<string, Set<string>>;
    /** Question ids with at least one attempt. */
    seen: Set<string>;
    /** The most recent attempt per question. "Currently missed" reads this. */
    latest: Map<string, AttemptRecord>;
    total: Bucket;
}

const emptyBucket = (): Bucket => ({ attempts: 0, correct: 0, acc: 0, lastSeen: 0 });

const credit = (b: Bucket, a: AttemptRecord): void => {
    b.attempts += 1;
    if (a.correct) b.correct += 1;
    b.acc = b.correct / b.attempts;
    if (a.ts > b.lastSeen) b.lastSeen = a.ts;
};

/**
 * Attempts oldest first, ties broken by insertion id then question id.
 *
 * The log is append-only but not necessarily sorted: an import merges another
 * device's attempts in after the fact. Anything order-dependent — the SM-2 fold
 * above all — has to sort first or the same set of attempts produces a
 * different schedule depending on when they were imported.
 */
export function inOrder(attempts: readonly AttemptRecord[]): AttemptRecord[] {
    return attempts.slice().sort((x, y) => {
        if (x.ts !== y.ts) return x.ts - y.ts;
        if ((x.id ?? 0) !== (y.id ?? 0)) return (x.id ?? 0) - (y.id ?? 0);
        return x.qid.localeCompare(y.qid);
    });
}

export function rollup(attempts: readonly AttemptRecord[]): Rollup {
    const r: Rollup = {
        byObjective: {},
        byDomain: {},
        objectivesByDomain: {},
        seen: new Set<string>(),
        latest: new Map<string, AttemptRecord>(),
        total: emptyBucket(),
    };

    for (const a of inOrder(attempts)) {
        r.seen.add(a.qid);
        // inOrder() is oldest-first, so the last write per qid is the latest.
        r.latest.set(a.qid, a);
        credit(r.total, a);

        const domain = (r.byDomain[a.domainId] ??= emptyBucket());
        credit(domain, a);

        const objectives = (r.objectivesByDomain[a.domainId] ??= new Set<string>());
        for (const oid of a.outlineItems ?? []) {
            objectives.add(oid);
            const bucket = (r.byObjective[oid] ??= { ...emptyBucket(), id: oid, domainId: a.domainId });
            credit(bucket, a);
        }
    }

    return r;
}

/** Attempts on or after `since` (unix ms). Readiness windows the log with this. */
export const since = (attempts: readonly AttemptRecord[], from: number): AttemptRecord[] =>
    attempts.filter(a => a.ts >= from);

// ── weakness ordering ────────────────────────────────────────────────────────

export interface WeaknessRow {
    /** Objective id ("1.3.2") or domain id ("domain_1"), depending on the call. */
    id: string;
    domainId: string;
    /** The domain's share of the real examination, per the 2024 outline. */
    weight: number;
    /**
     * (1 - acc) × weight. Marks available to win back: getting an objective in
     * domain 1 (16% of the paper) from 50% to 100% is worth more than the same
     * gain in domain 2 (10%), and ordering by accuracy alone hides that.
     */
    score: number;
    bucket: Bucket;
}

const weightIndex = (blueprint: readonly DomainWeight[]) => {
    const weight: Record<string, number> = {};
    const order: Record<string, number> = {};
    blueprint.forEach((b, i) => {
        weight[b.id] = b.weight;
        order[b.id] = b.number ?? i + 1;
    });
    return { weight, order };
};

/** score desc, then blueprint order, then id — total and stable. */
const byUrgency = (order: Record<string, number>) => (a: WeaknessRow, b: WeaknessRow) => {
    if (a.score !== b.score) return b.score - a.score;
    const oa = order[a.domainId] ?? 99;
    const ob = order[b.domainId] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
};

export function weakestObjectives(
    r: Rollup,
    blueprint: readonly DomainWeight[],
    limit?: number,
): WeaknessRow[] {
    const { weight, order } = weightIndex(blueprint);
    const rows = Object.values(r.byObjective).map(b => ({
        id: b.id,
        domainId: b.domainId,
        weight: weight[b.domainId] ?? 0,
        score: (1 - b.acc) * (weight[b.domainId] ?? 0),
        bucket: b as Bucket,
    }));
    rows.sort(byUrgency(order));
    return limit === undefined ? rows : rows.slice(0, limit);
}

export function weakestDomains(
    r: Rollup,
    blueprint: readonly DomainWeight[],
    limit?: number,
): WeaknessRow[] {
    const { weight, order } = weightIndex(blueprint);
    const rows = Object.entries(r.byDomain).map(([id, b]) => ({
        id,
        domainId: id,
        weight: weight[id] ?? 0,
        score: (1 - b.acc) * (weight[id] ?? 0),
        bucket: b,
    }));
    rows.sort(byUrgency(order));
    return limit === undefined ? rows : rows.slice(0, limit);
}

// ── the distractor vocabulary ────────────────────────────────────────────────

export interface LabelCount {
    label: string;
    count: number;
    /** Share of all labelled wrong answers, 0..1. */
    share: number;
    /** The most recent wrong attempt carrying this label — the report's example. */
    example: AttemptRecord;
}

/**
 * Which of the eight distractor labels the reader keeps falling for.
 *
 * The vocabulary is fixed and published in the book's front matter, but the
 * list is COUNTED off the log rather than seeded from a hard-coded eight: a
 * label the reader has never fallen for should not appear on their page, and a
 * ninth label added to the bank should appear without an edit here.
 */
export function labelCounts(attempts: readonly AttemptRecord[]): LabelCount[] {
    const counts = new Map<string, { count: number; example: AttemptRecord }>();
    let labelled = 0;
    for (const a of inOrder(attempts)) {
        if (a.correct || !a.label) continue;
        labelled += 1;
        const hit = counts.get(a.label);
        // inOrder() is oldest-first, so overwriting keeps the most recent.
        if (hit) { hit.count += 1; hit.example = a; }
        else counts.set(a.label, { count: 1, example: a });
    }
    return [...counts.entries()]
        .map(([label, v]) => ({ label, count: v.count, share: v.count / labelled, example: v.example }))
        .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
}

// ── coverage context ─────────────────────────────────────────────────────────

export interface PoolItem {
    id: string;
    domainId?: string;
    outlineItems?: string[];
}

/**
 * Which objectives the loaded question pool can actually reach, per domain.
 *
 * The coverage denominator in the readiness formula is the whole 2024 outline —
 * 46 objectives in domain 1, 74 in domain 7. The free app serves 20 questions a
 * domain, which between them touch about twenty objectives, so free-tier
 * coverage cannot exceed roughly 40% however well the reader does. That is a
 * true statement about their preparation and the page says so, but it is only
 * honest next to what the questions in front of them can reach. Hence this.
 */
export function objectivesInPool(pool: readonly PoolItem[]): Record<string, Set<string>> {
    const out: Record<string, Set<string>> = {};
    for (const q of pool) {
        if (!q.domainId) continue;
        const set = (out[q.domainId] ??= new Set<string>());
        for (const oid of q.outlineItems ?? []) set.add(oid);
    }
    return out;
}

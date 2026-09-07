/**
 * Spaced repetition over the attempt log: SM-2, folded per question.
 *
 * There is no stored card table. Card state is recomputed from the attempts
 * every time the app loads, for the same reason the rollup is — a persisted
 * schedule and the log it came from can disagree, and then neither is
 * trustworthy. The fold is cheap: a few thousand attempts is a few milliseconds.
 *
 * Pure: no clock, no storage, no runtime imports. `now` and the pace budget
 * arrive as arguments so the queue is reproducible for a fixed clock, which is
 * what makes it testable at all.
 */
import type { AttemptRecord, DomainWeight } from '@/lib/progress/types';
import type { Rollup } from '@/lib/progress/rollup';

export const DAY_MS = 86_400_000;

/**
 * Attempts oldest first — the SAME total order as rollup.inOrder, written out
 * again rather than imported.
 *
 * Not a preference: this module must have no runtime import at all, because
 * `node --test` loads it directly and cannot resolve the `@/` alias, and Node
 * will not resolve an extensionless relative specifier either. The duplication
 * is held honest by a test that runs both comparators over the same shuffled
 * log and asserts the orderings are identical — if one drifts, that fails.
 */
function oldestFirst(attempts: readonly AttemptRecord[]): AttemptRecord[] {
    return attempts.slice().sort((x, y) => {
        if (x.ts !== y.ts) return x.ts - y.ts;
        if ((x.id ?? 0) !== (y.id ?? 0)) return (x.id ?? 0) - (y.id ?? 0);
        return x.qid.localeCompare(y.qid);
    });
}

export interface Card {
    qid: string;
    domainId: string;
    /** SM-2 easiness factor. Starts at 2.5, floored at 1.3. */
    ef: number;
    /** Days to the next review, as SM-2 computes it. */
    interval: number;
    /** Consecutive correct reviews. A wrong answer sends it back to 0. */
    reps: number;
    /** Unix ms the card comes up again. */
    due: number;
    lastReviewed: number;
    /** How many times it has been answered wrong after having been right. */
    lapses: number;
    attempts: number;
    /** Whether the most recent answer was correct. */
    lastCorrect: boolean;
}

export const INITIAL_EF = 2.5;
export const MIN_EF = 1.3;

/**
 * SM-2 grades an answer 0-5 from memory. There is no such dial here, so three
 * of the six are used and each is earned by something measurable:
 *
 *   5  right, and inside the exam's own pace budget for one question
 *   4  right, but slower than that (or with no timing recorded)
 *   1  wrong
 *
 * 1 rather than 0: both are below SM-2's "correct" threshold of 3 and both
 * reset the interval, but 0 costs 0.8 of the easiness factor against 1's 0.54,
 * and a four-option multiple choice does not distinguish "no idea" from
 * "narrowed it to two and picked wrong" well enough to justify the harsher one.
 */
export function quality(correct: boolean, ms: number | undefined, paceMs: number): 1 | 4 | 5 {
    if (!correct) return 1;
    // An attempt with no timing cannot be shown to have beaten the budget.
    return ms !== undefined && ms <= paceMs ? 5 : 4;
}

/** SM-2's easiness update, floored. q=4 leaves it alone; q=5 adds 0.1; q=1 costs 0.54. */
export function nextEf(ef: number, q: number): number {
    const updated = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    return Math.max(MIN_EF, updated);
}

/** One attempt applied to a card, or to nothing (the first sighting). */
export function applyAttempt(card: Card | undefined, a: AttemptRecord, paceMs: number): Card {
    const q = quality(a.correct, a.ms, paceMs);
    const prev: Card = card ?? {
        qid: a.qid,
        domainId: a.domainId,
        ef: INITIAL_EF,
        interval: 0,
        reps: 0,
        due: a.ts,
        lastReviewed: 0,
        lapses: 0,
        attempts: 0,
        lastCorrect: false,
    };

    const ef = nextEf(prev.ef, q);
    let reps: number;
    let interval: number;
    let lapses = prev.lapses;

    if (q < 3) {
        // SM-2 restarts the repetition on a failure but keeps the (now lower)
        // easiness factor, so a question you keep missing comes back tomorrow
        // and its intervals grow more slowly each time.
        reps = 0;
        interval = 1;
        if (prev.reps > 0) lapses += 1;
    } else {
        reps = prev.reps + 1;
        // The published schedule: 1 day, then 6, then multiply. Using the
        // UPDATED easiness factor, as SuperMemo 2 specifies.
        interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(prev.interval * ef);
    }

    return {
        qid: a.qid,
        domainId: a.domainId,
        ef,
        interval,
        reps,
        due: a.ts + interval * DAY_MS,
        lastReviewed: a.ts,
        lapses,
        attempts: prev.attempts + 1,
        lastCorrect: a.correct,
    };
}

/**
 * Every answered question's card state. Attempts are sorted oldest-first before
 * folding: an import merges another device's log in after the fact, and SM-2 is
 * order-dependent, so the same set of attempts must not schedule differently
 * depending on when it arrived.
 */
export function schedule(attempts: readonly AttemptRecord[], paceMs: number): Map<string, Card> {
    const cards = new Map<string, Card>();
    for (const a of oldestFirst(attempts)) {
        cards.set(a.qid, applyAttempt(cards.get(a.qid), a, paceMs));
    }
    return cards;
}

/**
 * Cards whose next review has arrived, most overdue first.
 *
 * Ties break on easiness (the question that has been hardest comes first) and
 * then on id, so the queue is fully determined by the log and the clock.
 */
export function dueQueue(
    cards: ReadonlyMap<string, Card> | readonly Card[],
    now: number,
    limit?: number,
): string[] {
    const all = Array.isArray(cards) ? cards : [...(cards as ReadonlyMap<string, Card>).values()];
    const ready = all.filter(c => c.due <= now);
    ready.sort((a, b) => (a.due - b.due) || (a.ef - b.ef) || a.qid.localeCompare(b.qid));
    const ids = ready.map(c => c.qid);
    return limit === undefined ? ids : ids.slice(0, limit);
}

export interface NewCandidate {
    id: string;
    domainId?: string;
    outlineItems?: string[];
}

/**
 * Unseen questions, weakest objective first.
 *
 * A question's urgency is the largest need among the objectives it tests, where
 * need is `(1 - acc) × domain weight` for an objective already attempted and
 * the full domain weight for one never attempted — nothing known about an
 * objective is treated as everything left to learn, which is why a domain that
 * has never been touched leads.
 *
 * With no history at all every candidate scores its domain's exam weight, so a
 * cold start deals domain 1 (16% of the paper) before domain 2 (10%). That is
 * "the weakest objectives in blueprint order" with nothing yet to distinguish
 * them, and it is deliberate: it is also the order the printed book teaches in.
 */
export function newQueue(
    r: Rollup,
    pool: readonly NewCandidate[],
    limit: number,
    blueprint: readonly DomainWeight[],
): string[] {
    const weight: Record<string, number> = {};
    const order: Record<string, number> = {};
    blueprint.forEach((b, i) => {
        weight[b.id] = b.weight;
        order[b.id] = b.number ?? i + 1;
    });

    const need = (oid: string, domainId: string): number => {
        const w = weight[domainId] ?? 0;
        const bucket = r.byObjective[oid];
        return bucket ? (1 - bucket.acc) * w : w;
    };

    const scored = pool
        .filter(q => !r.seen.has(q.id))
        .map(q => {
            const domainId = q.domainId ?? '';
            const items = q.outlineItems ?? [];
            // No objectives cited: fall back to the domain's own weight, so an
            // unannotated question is still reachable rather than always last.
            const score = items.length
                ? Math.max(...items.map(oid => need(oid, domainId)))
                : (weight[domainId] ?? 0);
            return { id: q.id, domainId, score };
        });

    scored.sort((a, b) =>
        (b.score - a.score)
        || ((order[a.domainId] ?? 99) - (order[b.domainId] ?? 99))
        || a.id.localeCompare(b.id));

    return scored.slice(0, Math.max(0, limit)).map(s => s.id);
}

/**
 * What the "Due today" button starts: everything genuinely due, topped up with
 * new material only if there is room left in the day's target.
 *
 * Reviews come first and are never displaced. A reader who has fallen behind
 * gets their backlog, not a set padded with questions they have never seen.
 */
export function studyQueue(
    cards: ReadonlyMap<string, Card>,
    r: Rollup,
    pool: readonly NewCandidate[],
    now: number,
    target: number,
    blueprint: readonly DomainWeight[],
): { due: string[]; fresh: string[]; ids: string[] } {
    const due = dueQueue(cards, now, target);
    const fresh = newQueue(r, pool, Math.max(0, target - due.length), blueprint);
    return { due, fresh, ids: [...due, ...fresh] };
}

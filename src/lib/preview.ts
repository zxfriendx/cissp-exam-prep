/**
 * The free preview: which of the paid bank's questions the practice app serves.
 *
 * The app used to serve `domains[].questions[]` whole -- 439 questions, the v1
 * examination. That was never a preview, it was the product. Since the v2
 * refactor the bank also carries `domains[].questionsV2[]`: 750 questions, each
 * one sitting under a named scenario and carrying, for every wrong option, a
 * reason label and the question that option WOULD have been the right answer
 * to. The app shows a sample of those instead.
 *
 * WHY THE PICK IS DETERMINISTIC
 * -----------------------------
 * No Math.random anywhere in here. The app is a static export: the sample is
 * computed during `next build` for the server markup and again in the browser
 * at hydration, and the two have to agree or React throws the tree away. It
 * also means the preview is the same set for every visitor, which is what makes
 * a claim about its coverage checkable.
 *
 * WHAT "SPREAD ACROSS THE TOPICS" MEANS HERE
 * ------------------------------------------
 * Taking the first 20 of a domain would land almost all of them inside three or
 * four scenarios -- the drills are written in testlets of three to six. So the
 * picker deals round-robin across the domain's scenarios, and at each step takes
 * the question that tests the most exam objectives nothing picked so far has
 * tested. Measured on the current bank at 20 per domain: every scenario in every
 * domain is represented, each domain reaches 18-22 distinct 2024-outline
 * objectives, and the answer key comes out 40/40/40/40 across A-D.
 */

import type { Question } from '@/lib/content';

/**
 * How many questions of each domain the free app serves. The paid examination
 * carries 500 drills plus two 125-question mock forms; this is the shop window.
 */
export const FREE_PREVIEW_PER_DOMAIN = 20;

/** Bucket for the discrete items -- the ones written to stand without a scenario. */
export const DISCRETE_GROUP = '__discrete__';

/** The fields the picker reads. Anything with these can be sampled. */
export interface PreviewCandidate {
    id: string;
    correctAnswer: string;
    stimulusId?: string;
    stimulusSeq?: number;
    outlineItems?: string[];
}

export const groupKeyOf = (q: PreviewCandidate): string => q.stimulusId ?? DISCRETE_GROUP;

/**
 * `limit` questions from `pool`, dealt across scenarios and biased towards
 * uncovered exam objectives, then returned in book order.
 *
 * Selection is independent of the order `pool` arrives in (scenarios are visited
 * in sorted key order, candidates within one in sorted id order) so a re-import
 * that reshuffles the JSON cannot silently change which questions are free.
 * Presentation is not: the returned list is ordered by where each scenario first
 * appears in `pool`, so the reader meets the scenarios the way the book prints
 * them and a scenario's questions stay together.
 */
export function pickPreview<T extends PreviewCandidate>(
    pool: readonly T[],
    limit: number = FREE_PREVIEW_PER_DOMAIN,
): T[] {
    const groups = new Map<string, T[]>();
    const firstSeen = new Map<string, number>();
    pool.forEach((q, i) => {
        const key = groupKeyOf(q);
        if (!groups.has(key)) {
            groups.set(key, []);
            firstSeen.set(key, i);
        }
        groups.get(key)!.push(q);
    });
    for (const list of groups.values()) list.sort((a, b) => a.id.localeCompare(b.id));
    const keys = [...groups.keys()].sort();

    const picked: T[] = [];
    const taken = new Map<string, number>();
    const covered = new Set<string>();
    const keyCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    const used = new Set<string>();

    while (picked.length < Math.min(limit, pool.length)) {
        let best: T | undefined;
        let bestScore: [number, number, number, string] | undefined;
        let bestGroup = '';

        for (const key of keys) {
            const already = taken.get(key) ?? 0;
            for (const q of groups.get(key)!) {
                if (used.has(q.id)) continue;
                // How many objectives this question would add that nothing picked
                // so far tests. Negated: the comparison below takes the smallest.
                let fresh = 0;
                for (const item of q.outlineItems ?? []) if (!covered.has(item)) fresh += 1;
                // `already` FIRST, and that ordering is the whole point: every
                // scenario gets its first question before any scenario gets its
                // second. Scored the other way round -- most-new-objectives
                // first -- a domain whose last scenario happens to test only
                // objectives already covered gets left out of the preview
                // entirely, which is what happened to domain_5.
                const score: [number, number, number, string] = [
                    already,
                    -fresh,
                    keyCounts[q.correctAnswer] ?? 0,
                    q.id,
                ];
                if (bestScore === undefined || lessThan(score, bestScore)) {
                    bestScore = score;
                    best = q;
                    bestGroup = key;
                }
            }
        }
        if (!best) break;

        picked.push(best);
        used.add(best.id);
        taken.set(bestGroup, (taken.get(bestGroup) ?? 0) + 1);
        for (const item of best.outlineItems ?? []) covered.add(item);
        keyCounts[best.correctAnswer] = (keyCounts[best.correctAnswer] ?? 0) + 1;
    }

    return picked.sort((a, b) => {
        const ga = firstSeen.get(groupKeyOf(a)) ?? 0;
        const gb = firstSeen.get(groupKeyOf(b)) ?? 0;
        if (ga !== gb) return ga - gb;
        const sa = a.stimulusSeq ?? 0;
        const sb = b.stimulusSeq ?? 0;
        if (sa !== sb) return sa - sb;
        return a.id.localeCompare(b.id);
    });
}

/** Lexicographic compare of the [-fresh, taken, keyCount, id] score tuples. */
function lessThan(a: [number, number, number, string], b: [number, number, number, string]): boolean {
    if (a[0] !== b[0]) return a[0] < b[0];
    if (a[1] !== b[1]) return a[1] < b[1];
    if (a[2] !== b[2]) return a[2] < b[2];
    return a[3] < b[3];
}

export interface PreviewStats {
    questions: number;
    /** Distinct scenarios represented; the discrete bucket does not count as one. */
    scenarios: number;
    /** Distinct 2024-outline objectives the sample tests. */
    objectives: number;
    /** Items written to stand without a scenario. */
    discrete: number;
    keyCounts: Record<string, number>;
}

export function previewStats(picked: readonly PreviewCandidate[]): PreviewStats {
    const scenarios = new Set<string>();
    const objectives = new Set<string>();
    const keyCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    let discrete = 0;
    for (const q of picked) {
        if (q.stimulusId) scenarios.add(q.stimulusId);
        else discrete += 1;
        for (const item of q.outlineItems ?? []) objectives.add(item);
        keyCounts[q.correctAnswer] = (keyCounts[q.correctAnswer] ?? 0) + 1;
    }
    return { questions: picked.length, scenarios: scenarios.size, objectives: objectives.size, discrete, keyCounts };
}

/** A drill is a domain question; forms A and B are the two mock examinations. */
export const isDrill = (q: Pick<Question, 'form'>): boolean => (q.form ?? 'drill') === 'drill';

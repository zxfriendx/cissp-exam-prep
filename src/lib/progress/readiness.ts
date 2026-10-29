/**
 * How ready the reader is, and — the point of this module — the arithmetic that
 * says so.
 *
 *     readiness = Σ_d  weight_d × acc_d(last 30 days) × coverage_d
 *     coverage_d = objectives attempted in d / objectives the 2024 outline
 *                  lists for d
 *
 * The weights are the real examination's (16/10/13/13/13/12/13/10), so the sum
 * is a percentage without any further scaling.
 *
 * WHY IT RETURNS ITS WORKING
 * --------------------------
 * A single "you are 62% ready" is not believed, and should not be: it is three
 * judgements stacked — how much of the domain you have touched, how well you
 * did lately, and how much the exam cares. Every one of those is shown per
 * domain so the reader can see which term is dragging, and can check the total
 * by adding the column up. A figure a reader cannot check is a figure they
 * discount.
 *
 * Two deliberate consequences of the formula, both visible in the components:
 *
 *   Recency. Only the last 30 days count towards accuracy. Work from two months
 *   ago stops propping the score up; coverage, which is about ground covered
 *   rather than current form, is counted over the whole log.
 *
 *   Coverage is against the OUTLINE, not against the questions on hand. The
 *   free tier's 20 questions a domain reach about twenty of domain 1's 46
 *   objectives, so free-tier readiness is capped near 40% however well the
 *   reader does. That is true, and the page shows both denominators rather than
 *   quietly swapping in the flattering one.
 *
 * Pure: no clock, no storage, no runtime imports.
 */
import type { AttemptRecord, DomainWeight } from '@/lib/progress/types';
import type { Rollup } from '@/lib/progress/rollup';

/** SM-2 intervals run to weeks; a month of work is the shortest window that is not noise. */
export const READINESS_WINDOW_DAYS = 30;

export interface DomainReadiness {
    domainId: string;
    number: number;
    name: string;
    /** Percentage of the real examination. */
    weight: number;
    /** Attempts inside the window. */
    attempts: number;
    correct: number;
    /** correct / attempts inside the window, 0 when there were none. */
    acc: number;
    /** Distinct objectives attempted, over the whole log. */
    objectivesAttempted: number;
    /** What the 2024 outline lists for this domain. */
    objectivesInDomain: number;
    /** objectivesAttempted / objectivesInDomain, clamped to 1. */
    coverage: number;
    /** weight × acc × coverage — this domain's marks towards the total. */
    contribution: number;
}

export interface Readiness {
    /** Σ of the contributions. 0-100. */
    score: number;
    now: number;
    /** Start of the accuracy window, unix ms. */
    since: number;
    windowMs: number;
    /** Attempts inside the window, across all domains. */
    attemptsInWindow: number;
    /** Attempts in the whole log. Coverage is counted over these. */
    attemptsAllTime: number;
    /** Summed from the blueprint passed in, not asserted to be 100. */
    totalWeight: number;
    /** The ceiling the reader could reach today: Σ weight × 1 × coverage. */
    ceiling: number;
    domains: DomainReadiness[];
}

export interface ReadinessInput {
    now: number;
    windowMs: number;
    blueprint: readonly DomainWeight[];
    /** How many objectives the 2024 outline lists for a domain. */
    objectivesInDomain: (domainId: string) => number;
}

/**
 * `all` is the whole attempt log; `windowed` is the same log folded over the
 * accuracy window. Both are passed in already folded so the caller does the
 * work once and the two rollups cannot be built from different logs.
 */
export function readinessFrom(
    all: Rollup,
    windowed: Rollup,
    input: ReadinessInput,
): Readiness {
    const domains: DomainReadiness[] = input.blueprint.map(b => {
        const win = windowed.byDomain[b.id];
        const attempts = win?.attempts ?? 0;
        const correct = win?.correct ?? 0;
        const acc = attempts > 0 ? correct / attempts : 0;

        const objectivesInDomain = input.objectivesInDomain(b.id);
        const attemptedSet = all.objectivesByDomain[b.id];
        const objectivesAttempted = attemptedSet ? attemptedSet.size : 0;
        // Clamped: a question can cite an objective the outline files under
        // another domain (crossDomain items do), and coverage above 1 would
        // make the total exceed the weight and stop being a percentage.
        const coverage = objectivesInDomain > 0
            ? Math.min(1, objectivesAttempted / objectivesInDomain)
            : 0;

        return {
            domainId: b.id,
            number: b.number,
            name: b.name ?? b.id,
            weight: b.weight,
            attempts,
            correct,
            acc,
            objectivesAttempted,
            objectivesInDomain,
            coverage,
            contribution: b.weight * acc * coverage,
        };
    });

    const sum = (pick: (d: DomainReadiness) => number) =>
        domains.reduce((n, d) => n + pick(d), 0);

    return {
        score: sum(d => d.contribution),
        now: input.now,
        since: input.now - input.windowMs,
        windowMs: input.windowMs,
        attemptsInWindow: windowed.total.attempts,
        attemptsAllTime: all.total.attempts,
        totalWeight: sum(d => d.weight),
        ceiling: sum(d => d.weight * d.coverage),
        domains,
    };
}

/**
 * The same thing from a raw log, for callers that have not already folded it.
 * `fold` is injected rather than imported so this module keeps its promise of
 * having no runtime imports; the store and the tests both pass rollup.rollup.
 */
export function readiness(
    attempts: readonly AttemptRecord[],
    input: ReadinessInput,
    fold: (a: readonly AttemptRecord[]) => Rollup,
): Readiness {
    const from = input.now - input.windowMs;
    return readinessFrom(fold(attempts), fold(attempts.filter(a => a.ts >= from)), input);
}

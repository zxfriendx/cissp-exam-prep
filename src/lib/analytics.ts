/**
 * The four things the app tells GA4 beyond page views, added 2026-09-16.
 *
 * Until then the property (G-Y20Q6FPX5T, shared with the apex; split reports
 * on Hostname) received page_view and nothing else, so "used the app" meant
 * "loaded a page" and a finished quiz, a score, or a click on a buy button
 * were all invisible. The attempt log in IndexedDB, the richest record of use
 * the app has, never left the browser either.
 *
 *   quiz_start      every start action in the quiz store, and restarts
 *   quiz_complete   the moment the last question is answered, with the score
 *   buy_click       every checkout link, wherever it sits
 *   history_loaded  once per page load, after the progress store hydrates,
 *                   carrying the attempts_bucket user property so "returning"
 *                   means "has answered questions here before", which a GA
 *                   cookie cannot say
 *
 * gtag is loaded by src/app/layout.tsx. The inline bootstrap there defines
 * window.gtag even when the GA script itself is blocked, so calls never throw;
 * they push onto a dataLayer nothing reads. On the server there is no window
 * and every call is a no-op.
 */

import { useBankStore } from "@/lib/bank";

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

type Params = Record<string, string | number | boolean | undefined>;

function gtag(...args: unknown[]): void {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag(...args);
}

/** Free or paid, read at the moment the event fires, so paid use is separable. */
const tier = (): string => useBankStore.getState().tier;

export function track(event: string, params: Params = {}): void {
    gtag("event", event, { tier: tier(), ...params });
}

/**
 * The quiz store keys a sitting by `currentDomainId`, which is a domain id for
 * a domain drill and a mode name for everything else. Reports want the mode
 * as one dimension and the domain as another.
 */
export function quizMode(currentDomainId: string | null): { mode: string; domain: string } {
    const id = currentDomainId ?? "none";
    if (id.startsWith("domain_")) return { mode: "domain", domain: id };
    if (id.startsWith("form-")) return { mode: "form", domain: id };
    if (id === "weakness-hunter") return { mode: "weakness", domain: "mixed" };
    return { mode: id, domain: "mixed" };
}

export function trackQuizStart(currentDomainId: string | null, count: number, restart = false): void {
    track("quiz_start", { ...quizMode(currentDomainId), count, restart });
}

export function trackQuizComplete(
    currentDomainId: string | null,
    count: number,
    correct: number,
    elapsedSeconds: number,
): void {
    track("quiz_complete", {
        ...quizMode(currentDomainId),
        count,
        correct,
        percent: count > 0 ? Math.round((correct / count) * 100) : 0,
        elapsed_s: elapsedSeconds,
    });
}

export type BuyTier = "books" | "plus";

/** `placement` names the surface, so the funnel can say which button sells. */
export function trackBuyClick(buy: BuyTier, placement: string): void {
    track("buy_click", { product: buy, placement });
}

export type AttemptsBucket = "none" | "1-10" | "11-50" | "51+";

export function attemptsBucket(attempts: number): AttemptsBucket {
    if (attempts <= 0) return "none";
    if (attempts <= 10) return "1-10";
    if (attempts <= 50) return "11-50";
    return "51+";
}

/**
 * User properties ride on every later event in the session. They are set
 * here and then announced with one event, because a property with no event
 * after it never reaches a report.
 */
export function identifyHistory(attempts: number): void {
    const bucket = attemptsBucket(attempts);
    gtag("set", "user_properties", { attempts_bucket: bucket });
    track("history_loaded", { attempts, attempts_bucket: bucket });
}

export function identifyTier(t: string): void {
    gtag("set", "user_properties", { tier: t });
}

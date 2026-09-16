"use client"

import { useEffect, useRef } from "react";
import { useProgressStore } from "@/store/progress-store";
import { useBankStore } from "@/lib/bank";
import { identifyHistory, identifyTier } from "@/lib/analytics";

/**
 * Renders nothing. Once per page load, after the attempt log has been read
 * out of IndexedDB, it tells GA4 how much history this browser has, as the
 * attempts_bucket user property and one history_loaded event. See
 * src/lib/analytics.ts for why the event is needed.
 *
 * Mounted in the root layout so the property is set on every route, not only
 * the ones that happened to hydrate the progress store for their own reasons.
 * hydrate() is idempotent, so a page that also calls it costs nothing extra.
 */
export function AnalyticsIdentity() {
    const hydrate = useProgressStore(state => state.hydrate);
    const hydrated = useProgressStore(state => state.hydrated);
    const attempts = useProgressStore(state => state.attempts.length);
    const tier = useBankStore(state => state.tier);
    const sent = useRef(false);

    useEffect(() => { void hydrate() }, [hydrate]);

    useEffect(() => {
        if (!hydrated || sent.current) return;
        sent.current = true;
        identifyHistory(attempts);
    }, [hydrated, attempts]);

    // Flips from free to paid when BankLoader finishes, which can be after
    // history_loaded went out; the property is re-set so later events carry it.
    useEffect(() => { identifyTier(tier) }, [tier]);

    return null;
}

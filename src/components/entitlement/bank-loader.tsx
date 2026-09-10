"use client";

import { useEffect } from "react";
import {
    cacheBank,
    readCachedBank,
    setActiveBank,
    setBankLoading,
} from "@/lib/bank";
import { getBankManifest } from "@/lib/content";
import { mayServePaidBank } from "@/lib/entitlement";
import { fetchBank, isUnlockConfigured } from "@/lib/unlock-client";
import { isTerminal } from "@/lib/unlock-protocol";
import { useEntitlementStore } from "@/store/entitlement-store";

/**
 * Puts the paid bank in front of the free preview, once, on mount.
 *
 * Mounted in the root layout so it runs on every route — a buyer who lands
 * straight on /quiz/domain_3/ from a bookmark gets their 65 questions, not the
 * free 20. It renders nothing.
 *
 * THE ORDER MATTERS
 * -----------------
 *   1. Nothing at all until React has hydrated. The server rendered the free
 *      preview; swapping the bank in during the first client render would make
 *      the client build different markup from the one it is hydrating, and
 *      React would throw the whole tree away.
 *   2. The cache first, then the network. A reader on a train opens the app and
 *      has their questions before anything touches the wire.
 *   3. The network only when the cached edition is not the one this build
 *      expects, or there is nothing cached at all.
 *
 * WHAT A FAILURE DOES
 * -------------------
 * A TERMINAL refusal (refunded, chargebacked, disabled, not_found, denied)
 * wipes the token and the cached bank: the purchase is gone, so the questions
 * go with it. Anything else — offline, a 500, a timeout, a service that was
 * never configured — changes NOTHING until the token's own `exp`. That is the
 * whole design: a buyer with a good token keeps their questions on a plane.
 */
export function BankLoader() {
    const token = useEntitlementStore(state => state.token);
    const exp = useEntitlementStore(state => state.exp);
    const status = useEntitlementStore(state => state.status);
    const revoke = useEntitlementStore(state => state.revoke);
    const refreshIfDue = useEntitlementStore(state => state.refreshIfDue);

    useEffect(() => {
        // The effect can outlive the token it was started for: a `forget()` in
        // another tab, a fast unmount. Everything below checks this before it
        // touches the active bank.
        let cancelled = false;

        // Expired-but-inside-the-refresh-grace still counts: see mayServePaidBank.
        const held = token;
        if (!held || !mayServePaidBank({ token: held, exp }, Math.floor(Date.now() / 1000))) {
            setActiveBank(null);
            return;
        }

        const online = typeof navigator === "undefined" || navigator.onLine;

        void (async () => {
            setBankLoading(true);
            try {
                const wanted = getBankManifest()?.v2?.edition ?? null;
                const cached = await readCachedBank();
                if (cancelled) return;

                const stale = cached != null && wanted != null && cached.edition !== wanted;
                if (cached && !stale) {
                    setActiveBank(cached);
                    return;
                }

                if (!online || !isUnlockConfigured()) {
                    // A stale edition still beats the 20-question preview for
                    // someone who paid. It is replaced on the next connection.
                    if (cached) setActiveBank(cached);
                    return;
                }

                const res = await fetchBank(held);
                if (cancelled) return;

                if (res.ok) {
                    setActiveBank(res.bank);
                    await cacheBank(res.bank);
                    return;
                }

                if (isTerminal(res.code)) {
                    revoke(res.code);
                    return;
                }

                if (cached) setActiveBank(cached);
            } finally {
                if (!cancelled) setBankLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, exp, revoke]);

    /* Re-checking the licence is separate from loading the bank: it is allowed
       to fail quietly and it must not hold up the questions appearing.

       `expired` is in here as well as `refresh_due` because /v1/refresh takes an
       expired token for another ninety days (REFRESH_GRACE in the service). A
       reader who was offline for a month gets their questions back by opening
       the app, rather than by finding the receipt again. refreshIfDue() decides
       whether it is actually time; this only decides that it is worth asking. */
    useEffect(() => {
        if (status !== "refresh_due" && status !== "expired") return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        void refreshIfDue();
    }, [status, refreshIfDue]);

    return null;
}

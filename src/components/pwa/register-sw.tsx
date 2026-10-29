"use client"

import { useEffect } from "react";

/**
 * Register /sw.js — production, https, once.
 *
 * Renders nothing. It is a component rather than a bare script so it lives in
 * the React tree next to <InstallCoach/>, which is the only thing that depends
 * on a worker being registered.
 *
 * WHY THE TWO GUARDS
 * ------------------
 * NODE_ENV: `next dev` serves modules the export does not contain, so a worker
 * registered in development caches development URLs and then answers production
 * ones from them. Worse, unregistering it means finding the right box in
 * devtools — the failure outlives the session that caused it. Next inlines this
 * as a literal at build time, so the branch is gone from the shipped bundle.
 *
 * https: the API exists on http://localhost too, which is what makes this worth
 * stating. Registering there is the same trap by a different door — a worker on
 * localhost:3000 outlives the dev server and intercepts anything else served on
 * that port. isSecureContext alone would allow localhost, so the protocol is
 * checked as well.
 */
export function RegisterSW() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (window.location.protocol !== "https:") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
            // A failed registration means no offline support, and nothing else.
            // Every route still works, so this must not surface to the visitor.
            console.warn("[pwa] service worker registration failed", err);
        });
    }, []);

    return null;
}

"use client";

import { useEffect } from "react";
import { setSampleJoined } from "@/lib/bank";
import { JOINED_STORAGE_KEY, captureUtm, readJoined } from "@/lib/sample-gate";

/**
 * Two small jobs, once per page load, after hydration. Renders nothing.
 *
 *   1. Reads the "joined the mailing list" flag and, if it is there, opens the
 *      other 120 free questions. From an effect, never at module scope: the
 *      server rendered the 40 open ones and the first client render has to
 *      match it (see the hydration rule in src/lib/bank.ts).
 *   2. Keeps the utm_* tags of the URL the visit landed on in sessionStorage,
 *      so a signup three pages later is still credited to the campaign.
 *
 * Also follows the flag across tabs: join in one and the others open too.
 */
export function SampleGateLoader() {
    useEffect(() => {
        setSampleJoined(readJoined(window.localStorage));
        captureUtm(window.sessionStorage, window.location.search);

        const onStorage = (e: StorageEvent) => {
            if (e.key === JOINED_STORAGE_KEY || e.key === null) setSampleJoined(readJoined(window.localStorage));
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    return null;
}

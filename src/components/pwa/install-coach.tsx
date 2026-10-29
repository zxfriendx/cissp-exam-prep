"use client"

import { useCallback, useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

/**
 * The one place in this app that asks the visitor for anything.
 *
 * Installed, the practice app works on a phone with no signal — which is the
 * only reason to mention installing at all, and the only thing this card says.
 *
 * TWO PLATFORMS, TWO ENTIRELY DIFFERENT MECHANISMS
 * ------------------------------------------------
 * Chromium fires `beforeinstallprompt`, which can be deferred and replayed from
 * a click, so there is a real Install button that does the thing.
 *
 * iOS Safari has no such event and never will. Add to Home Screen is a manual
 * gesture through the Share sheet, so on iOS the only honest thing to show is
 * the instruction. That is why this is a "coach" and not a button: half the
 * audience cannot be given a button.
 *
 * Firefox on desktop installs nothing and fires nothing, so it sees no card —
 * which falls out of the logic rather than being special-cased: no event, not
 * iOS, nothing rendered.
 *
 * QUIET
 * -----
 *  - never shown to an already-installed app (display-mode, and Safari's own
 *    navigator.standalone, which predates the media query and is still the only
 *    signal iOS gives);
 *  - held back for a moment after load, so it is not the first thing a visitor
 *    who has not decided to stay is asked to deal with;
 *  - dismissal is remembered, and installing dismisses it too.
 */

/** Chromium-only, and absent from lib.dom. */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "eight-domains:install-coach-dismissed";

/**
 * Long enough that the card is never the first thing on screen, short enough
 * that someone reading a question has not put the phone down before it appears.
 */
const APPEAR_AFTER_MS = 15_000;

function isStandalone(): boolean {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // Safari's pre-standard flag. iOS still sets only this one.
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS 13+ reports itself as a Mac. A Mac with a touchscreen is an iPad.
    return /Macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;
}

function wasDismissed(): boolean {
    try {
        return window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
        // Safari in private browsing throws on localStorage rather than
        // returning null. Treat it as "not dismissed" and let the card appear;
        // the alternative is a card that cannot be dismissed at all.
        return false;
    }
}

export function InstallCoach() {
    const [visible, setVisible] = useState(false);
    const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [ios, setIOS] = useState(false);

    const dismiss = useCallback(() => {
        setVisible(false);
        try {
            window.localStorage.setItem(DISMISSED_KEY, "1");
        } catch {
            // Private browsing. It stays dismissed for this session, which is
            // the whole session the visitor has.
        }
    }, []);

    useEffect(() => {
        if (isStandalone() || wasDismissed()) return;

        const onBeforeInstallPrompt = (event: Event) => {
            // Without this Chromium shows its own mini-infobar as well, so the
            // visitor is asked twice by two different-looking things.
            event.preventDefault();
            setPrompt(event as BeforeInstallPromptEvent);
        };
        const onInstalled = () => dismiss();

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onInstalled);

        // Both setState calls are deferred into the timer rather than run here:
        // an effect body that sets state synchronously re-renders immediately
        // for no gain, and this card has nothing to show for 15 seconds anyway.
        const timer = window.setTimeout(() => {
            setIOS(isIOS());
            setVisible(true);
        }, APPEAR_AFTER_MS);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onInstalled);
            window.clearTimeout(timer);
        };
    }, [dismiss]);

    const install = async () => {
        if (!prompt) return;
        await prompt.prompt();
        await prompt.userChoice;
        // The event is single-use: Chromium will fire a fresh one if the
        // visitor declined and later becomes eligible again.
        setPrompt(null);
        dismiss();
    };

    // Nothing to offer: not iOS, and the browser never said it could install.
    if (!visible || (!ios && !prompt)) return null;

    return (
        <div
            role="complementary"
            aria-label="Install this app"
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-lg border border-[rgb(var(--vault-line))] bg-[rgb(var(--vault-surface))] p-4 shadow-lg shadow-black/40 sm:inset-x-auto sm:right-4"
        >
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
                <X className="h-4 w-4" />
            </button>

            <p className="pr-6 font-display text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                Offline practice
            </p>

            {ios ? (
                <>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                        Add this to your Home Screen and the questions work with no signal.
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        Tap
                        <Share className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span className="sr-only">Share</span>
                        then
                        <SquarePlus className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        <span className="font-medium text-foreground">Add to Home Screen</span>
                    </p>
                </>
            ) : (
                <>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                        Install this and the questions work with no signal.
                    </p>
                    <button
                        type="button"
                        onClick={install}
                        className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-all hover:brightness-110"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Install
                    </button>
                </>
            )}
        </div>
    );
}

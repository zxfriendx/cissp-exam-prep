"use client"

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBankStore } from "@/lib/bank";
import { BUY, BUY_HREF } from "@/lib/checkout";
import {
    SERVICE_UNCONFIGURED_MESSAGE,
    SUPPORT_PHONE,
    isEntitled,
    messageForError,
} from "@/lib/entitlement";
import { isUnlockConfigured } from "@/lib/unlock-client";
import { LICENCE_KEY_RE, normaliseKey } from "@/lib/unlock-protocol";
import { useEntitlementStore } from "@/store/entitlement-store";

/*
 * The persisted entitlement only exists in the browser, so the first client
 * render has to match the server's markup and then catch up. Same trick as
 * src/app/quiz/[domainId]/quiz-client.tsx, and for the same reason.
 */
const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

/* NO ?key= PREFILL, DELIBERATELY.
 *
 * Reading the key out of the query string would be a nice touch on a link in a
 * receipt — and it would also put the licence key in the URL, which this site
 * ships straight to Google Analytics as `page_location` on every page view (see
 * the gtag snippet in src/app/layout.tsx). It would land in the browser history
 * and in any Referer header too. The key gets pasted by hand. */

export function UnlockPageClient() {
    const mounted = useMounted();
    const [field, setField] = useState("");

    const status = useEntitlementStore(state => state.status);
    const storedKey = useEntitlementStore(state => state.key);
    const edition = useEntitlementStore(state => state.edition);
    const lastError = useEntitlementStore(state => state.lastError);
    const cap = useEntitlementStore(state => state.cap);
    const activate = useEntitlementStore(state => state.activate);
    const forget = useEntitlementStore(state => state.forget);

    const tier = useBankStore(state => state.tier);
    const loadingBank = useBankStore(state => state.loading);
    const served = useBankStore(state => state.served);

    const configured = isUnlockConfigured();
    const entitled = isEntitled(status);
    const busy = status === "activating";
    const typed = normaliseKey(field);
    const wellFormed = LICENCE_KEY_RE.test(typed);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (busy || !wellFormed) return;
        void activate(typed);
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="container max-w-3xl mx-auto px-6 sm:px-10 py-16 space-y-12">
                <header className="space-y-4">
                    <p className="vault-label">Your Licence</p>
                    <h1
                        className="font-display uppercase text-2xl sm:text-3xl md:text-4xl font-normal text-primary"
                        style={{ lineHeight: "1.2" }}
                    >
                        Unlock your <span className="grad-copper">questions</span>
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        The licence key that came with the books loads all of them into this app, on this
                        device. Once they are here they stay here, and they work with no connection at all.
                    </p>
                </header>

                {/* Everything below the header depends on what this browser is
                    holding, so it waits for hydration. */}
                {!mounted ? (
                    <div className="h-48 rounded-xl border border-primary/15 bg-card" aria-hidden />
                ) : !configured ? (
                    <Panel tone="warn" icon={<TriangleAlert className="h-5 w-5" />} title="No licence check in this build">
                        <p className="text-sm text-muted-foreground leading-relaxed">{SERVICE_UNCONFIGURED_MESSAGE}</p>
                    </Panel>
                ) : entitled || tier === "paid" ? (
                    <Panel tone="ok" icon={<CheckCircle2 className="h-5 w-5" />} title="Unlocked on this device">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {loadingBank
                                    ? "Fetching your questions now. This happens once."
                                    : tier === "paid"
                                        ? `All ${served} questions are loaded, mock forms included. They work offline from here on.`
                                        : "Your licence is good. The questions load the next time you are online."}
                            </p>
                            {edition && (
                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                                    Bank edition {edition}
                                </p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <Button asChild size="lg" className="font-medium">
                                    <Link href="/practice/">Start practising</Link>
                                </Button>
                                <button
                                    type="button"
                                    onClick={forget}
                                    className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors self-start sm:self-auto"
                                >
                                    Remove this key from this device
                                </button>
                            </div>
                            {/* Local only. There is no deactivate call in the
                                unlock protocol, so this cannot free the slot on
                                Gumroad and must not claim to. */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                That deletes the downloaded questions from this browser and forgets the key.
                                It does not free the device slot &mdash; call {SUPPORT_PHONE} if you need one back.
                            </p>
                        </div>
                    </Panel>
                ) : (
                    <Panel
                        tone={lastError ? "warn" : "plain"}
                        icon={<KeyRound className="h-5 w-5" />}
                        title={
                            status === "expired"
                                ? "This device needs renewing"
                                : status === "revoked"
                                    ? "This key stopped working"
                                    : "Enter your licence key"
                        }
                    >
                        <form onSubmit={submit} className="space-y-4">
                            <label htmlFor="licence-key" className="sr-only">Licence key</label>
                            <input
                                id="licence-key"
                                name="licence-key"
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                                value={field}
                                onChange={(e) => setField(e.target.value)}
                                disabled={busy}
                                aria-invalid={field.length > 0 && !wellFormed}
                                className="w-full rounded-md border border-primary/20 bg-background px-4 py-3 font-mono text-sm tracking-wider text-foreground placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:opacity-50"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <Button type="submit" size="lg" className="font-medium" disabled={busy || !wellFormed}>
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {busy ? "Checking…" : "Unlock"}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Four groups of eight characters, separated by dashes.
                                </p>
                            </div>
                            {/* Renewing is the common case after an expiry, and
                                re-typing a key you already gave us is a pointless
                                thing to ask for. It does not use a device slot. */}
                            {status === "expired" && storedKey && (
                                <button
                                    type="button"
                                    onClick={() => void activate(storedKey)}
                                    disabled={busy}
                                    className="text-sm text-accent underline underline-offset-4 hover:brightness-110 disabled:opacity-50"
                                >
                                    Renew with the key already on this device
                                </button>
                            )}
                            {lastError && (
                                <p role="alert" className="text-sm text-destructive leading-relaxed">
                                    {messageForError({ code: lastError, cap: cap ?? undefined })}
                                </p>
                            )}
                        </form>
                    </Panel>
                )}

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight text-primary">Where to find your key</h2>
                    <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                        <li>
                            Gumroad emails a receipt the moment the payment clears. The licence key is in it,
                            alongside the download links.
                        </li>
                        <li>
                            It is also on the product&rsquo;s page in your Gumroad library, if the email has
                            gone the way of most receipts.
                        </li>
                        <li>
                            One key covers several devices. Entering it again on a device that already has
                            it renews that device rather than using up another slot.
                        </li>
                        <li>
                            Stuck? Call {SUPPORT_PHONE}.
                        </li>
                    </ul>
                </section>

                <section className="rounded-xl border border-primary/15 bg-card p-6 space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight text-primary">Not bought them yet?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {BUY.price} for all three books, and the key that loads the whole question bank into
                        this app. The free practice test stays free either way.
                    </p>
                    <Button asChild variant="outline" className="font-medium">
                        <a href={BUY_HREF} rel="noopener">Buy on Gumroad &mdash; {BUY.price}</a>
                    </Button>
                </section>
            </main>
        </div>
    );
}

/** One bordered block, tinted by how the news reads. */
function Panel({
    tone,
    icon,
    title,
    children,
}: {
    tone: "ok" | "warn" | "plain";
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    const border =
        tone === "ok" ? "border-success/40" : tone === "warn" ? "border-destructive/40" : "border-primary/15";
    const accent =
        tone === "ok" ? "text-success" : tone === "warn" ? "text-destructive" : "text-secondary";
    return (
        <section className={`rounded-xl border ${border} bg-card p-6 sm:p-8 space-y-4`}>
            <div className="flex items-center gap-3">
                <span className={accent}>{icon}</span>
                <h2 className="text-xl font-semibold tracking-tight text-primary">{title}</h2>
            </div>
            {children}
        </section>
    );
}

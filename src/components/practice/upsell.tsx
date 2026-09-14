"use client"

import Link from "next/link";
import { getAllDomains, getDrillCountPaid, getPreviewSummary, getTotalQuestionCount } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { BUY, BUY_HREF, BUY_PLUS, BUY_PLUS_HREF } from "@/lib/checkout";
import { Button } from "@/components/ui/button";

/**
 * The one place this page asks for money. No modal, no interstitial, no card
 * with a lock on it in the middle of the grid: the reader is here to practice,
 * and a page that keeps interrupting that is a page they leave.
 *
 * It says what the free questions are a sample OF, and what the rest buys.
 * Until 2026-09-14 it opened "You have 160 of the 750 questions" and went on
 * counting objectives and scenarios, which is inventory: a reader who had just
 * cleared a set learned how many questions were withheld and nothing about
 * what they were for.
 *
 * Every number below is counted from the file that ships — getPreviewSummary()
 * reads the meta block scripts/build-preview.mjs wrote — for the same reason
 * the rest of the page is: the site spent a while claiming 491 free questions
 * while the app served 439, and the fix was to stop typing numbers in.
 *
 * Two buttons, and the order matters: the licence key that unlocks this app
 * exists only on the `lkidg` product. Cloud Run runs with that product's id, so
 * an `eight-domains` buyer has no key to enter. This block used to offer the
 * cheaper product and promise a key with it.
 */
export function Upsell() {
    const tier = useBankStore(state => state.tier);
    if (tier === "paid") return null;

    const summary = getPreviewSummary();
    const served = getTotalQuestionCount();
    const withheld = summary.paid - served;
    // Counted from the same meta block, not typed in: paidDrillsByDomain is
    // written by the generator out of the bank that ships.
    const paidDrills = getAllDomains().reduce((n, d) => n + (getDrillCountPaid(d.id) ?? 0), 0);
    const formItems = summary.paid - paidDrills;
    const split = paidDrills > 0 && formItems > 0;

    return (
        <section className="pt-8 border-t border-primary/10">
            <div className="rounded-xl border border-primary/15 bg-card p-6 sm:p-8 space-y-5">
                <div className="space-y-2 max-w-3xl">
                    <p className="vault-label">The rest of the examination</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-primary">
                        These {served} are a sample. The examination is {summary.paid}.
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        The questions here come from <em>The Eight Domains</em>, a CISSP practice
                        examination of {summary.paid} questions: the same questions, at the same
                        difficulty, with the same reason on every wrong answer. What the free sample
                        leaves out is the {withheld} you have not seen
                        {split ? `, including two full-length mock exams of ${formItems / 2} to sit under a timer` : ""},
                        a lesson for every objective on the 2024 outline, and one revision page per
                        domain for the night before.
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {BUY.price} is the five books as PDFs. {BUY_PLUS.price} is the same five plus a
                        licence key that loads all {summary.paid} into this app, offline, on up to five
                        devices, with practice weighted to the domains you keep missing.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button asChild size="lg" className="font-medium">
                        <a href={BUY_PLUS_HREF} rel="noopener">
                            Unlock all {summary.paid} in this app &mdash; {BUY_PLUS.price}
                        </a>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="font-medium">
                        <a href={BUY_HREF} rel="noopener">The five books &mdash; {BUY.price}</a>
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        <Link href="/" className="text-accent underline underline-offset-4 hover:brightness-110">
                            See what is in it
                        </Link>
                        {" "}&middot; Already bought?{" "}
                        <Link href="/unlock/" className="text-accent underline underline-offset-4 hover:brightness-110">
                            Enter your key.
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

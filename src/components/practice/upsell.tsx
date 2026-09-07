"use client"

import Link from "next/link";
import { getAllDomains, getDrillCountPaid, getPreviewSummary, getTotalQuestionCount } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { BUY, BUY_HREF } from "@/lib/checkout";
import { Button } from "@/components/ui/button";

/**
 * The one place this page asks for money. No modal, no interstitial, no card
 * with a lock on it in the middle of the grid: the reader is here to practise,
 * and a page that keeps interrupting that is a page they leave.
 *
 * Every number below is counted from the file that ships — getPreviewSummary()
 * reads the meta block scripts/build-preview.mjs wrote — for the same reason
 * the rest of the page is: the site spent a while claiming 491 free questions
 * while the app served 439, and the fix was to stop typing numbers in.
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
                    <p className="vault-label">The other {withheld}</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-primary">
                        You are practising {served} of {summary.paid} questions
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {summary.perDomain} drills from each domain, chosen to reach {summary.objectives} of
                        the 2024 outline&rsquo;s objectives and to spread across all {summary.scenarios} scenarios
                        they come from. The printed <em>Practice Examination</em> carries{" "}
                        {split ? `${paidDrills} drills and ${formItems} mock-form questions` : `all ${summary.paid}`},
                        every one of them with all four options explained. Unlock it here and this app serves
                        the whole bank, offline, on this device.
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {BUY.price} buys all three books &mdash; the Outline Companion, the Practice
                        Examination and the Revision Sheets &mdash; as PDFs, plus the licence key that
                        unlocks them here.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button asChild size="lg" className="font-medium">
                        <a href={BUY_HREF} rel="noopener">Buy on Gumroad &mdash; {BUY.price}</a>
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Already bought?{" "}
                        <Link href="/unlock/" className="text-accent underline underline-offset-4 hover:brightness-110">
                            Enter your key.
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

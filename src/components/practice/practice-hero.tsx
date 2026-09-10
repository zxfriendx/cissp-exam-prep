"use client"

import { getBankManifest, getPreviewSummary, getTotalQuestionCount } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { QuickStartButton } from "@/components/quiz/quick-start-button";

/**
 * The counts at the top of /practice/.
 *
 * A client component only so it can re-read the accessors when the paid bank
 * swaps in — the numbers themselves still come out of the picker, not out of a
 * variable somebody typed. On the free tier this renders exactly what the
 * server page rendered before the paid tier existed, which is what keeps
 * hydration quiet.
 */
export function PracticeHero() {
    const tier = useBankStore(state => state.tier);
    const summary = getPreviewSummary();
    const drills = getTotalQuestionCount();
    const bank = getBankManifest();
    const paid = tier === "paid";
    const forms = 2;
    const perForm = 125;

    return (
        <section className="text-center space-y-6 pt-8 md:pt-16 pb-4">
            <p className="vault-label">{paid ? "Your Practice Examination" : "Free Practice"}</p>
            {/* Krona One is a display face — uppercase, and only here and in the
                wordmark. Everything else is Schibsted Grotesk. */}
            <h1
                className="font-display uppercase text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-primary max-w-4xl mx-auto"
                style={{ lineHeight: '1.2' }}
            >
                Master the <span className="grad-copper">CISSP</span>
                <sup className="text-[0.5em] align-super">&reg;</sup> Exam
            </h1>
            {paid ? (
                <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed px-4">
                    {drills} domain drills and {forms} full-length mock forms of {perForm}. Every one puts you
                    in a company with a decision to make, the way the real exam does. Miss it and you find out
                    why the answer you liked was the weaker one.
                </p>
            ) : (
                <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed px-4">
                    {drills} free questions, {summary.perDomain} in each domain. Every one puts you in a company
                    with a decision to make, the way the real exam does. Miss it and you find out why the answer
                    you liked was the weaker one.
                </p>
            )}
            <QuickStartButton count={10} />
            {!paid && (
                <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 leading-relaxed px-4">
                    The printed <em>Practice Examination</em> has all {summary.paid}, including two
                    full-length mock forms to sit under a timer.
                </p>
            )}
            {bank && (
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                    Question bank edition {bank.v2?.edition ?? bank.edition}
                </p>
            )}
        </section>
    );
}

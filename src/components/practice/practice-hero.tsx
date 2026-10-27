"use client"

import { getBankManifest, getPreviewSummary, getSampleCounts, getTotalQuestionCount } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import Link from "next/link";
import { QuickStartButton } from "@/components/quiz/quick-start-button";
import { BUY, BUY_PLUS } from "@/lib/checkout";

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
    const access = useBankStore(state => state.access);
    const summary = getPreviewSummary();
    const counts = getSampleCounts();
    const drills = getTotalQuestionCount();
    const bank = getBankManifest();
    const paid = access === "paid";
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
            ) : access === "joined" ? (
                <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed px-4">
                    {counts.sample} free questions, {counts.perDomain} in each domain. Every one puts you in a company
                    with a decision to make, the way the real exam does. Miss it and you find out why the answer
                    you liked was the weaker one.
                </p>
            ) : (
                <p className="mx-auto max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed px-4">
                    Try {counts.open} now, {counts.sample} free with email, {counts.perDomain} in each domain. Every
                    one puts you in a company with a decision to make, the way the real exam does. Miss it and you
                    find out why the answer you liked was the weaker one.
                </p>
            )}
            <QuickStartButton count={10} />
            {/* Says what the free set is a sample of, and links to the page that
                sells the rest. It used to name "the printed Practice Examination"
                with no link and no price, so a reader who wanted the rest had to
                go looking for it. */}
            {!paid && (
                <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 leading-relaxed px-4">
                    The free {counts.sample} are drawn from the {summary.paid} in <em>The Eight Domains</em>, a CISSP practice
                    examination with two full-length mock exams to sit under a timer and a lesson behind
                    every miss. Five books from {BUY.price}, or {BUY_PLUS.price} with all {summary.paid} in this app.{" "}
                    <Link href="/" className="text-accent underline underline-offset-4 hover:brightness-110">
                        See what is in it
                    </Link>
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

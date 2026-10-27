"use client"

import { useState } from "react";
import { getPreviewSummary, getSampleCounts, getTotalQuestionCount } from "@/lib/content";
import { useBankStore } from "@/lib/bank";
import { ExamButton } from "@/components/quiz/exam-button";
import { SignupPanel } from "@/components/practice/signup-panel";

/**
 * The Practice Examination section: which sittings are on offer.
 *
 * WHY THE PAID TIER HAS NO "EVERYTHING" CARD
 * ------------------------------------------
 * quiz-store persists whole question OBJECTS, not ids, because the URL alone
 * cannot rebuild a random or weighted set. That is fine at 160 questions and
 * ruinous at 750: the sitting is rewritten to localStorage on every answer, and
 * 750 of these questions — stem, four options, four distractor reasons, a
 * worked explanation each — is about 2.3 MB against a ~5 MB budget that already
 * holds the free bank's sitting. So a paid sitting caps at one mock form of 125,
 * which is also the largest set the printed book asks anyone to sit in one go.
 * The free tier keeps its "Everything Free" card: 160 is small enough.
 *
 * Before the email signup only 40 are open, so a weighted 50 or 100 cannot be
 * drawn. Those cards stay on the page, say they open with the signup, and a
 * click shows the signup panel here rather than starting a short set.
 */
export function ExamModes() {
    const access = useBankStore(state => state.access);
    const total = getTotalQuestionCount();
    const summary = getPreviewSummary();
    const counts = getSampleCounts();
    const paid = access === "paid";
    const [asked, setAsked] = useState(false);
    // A weighted set the visitor has not opened enough questions for.
    const gate = (count: number) => (count > total ? () => setAsked(true) : undefined);

    return (
        <section className="space-y-6 pt-8 border-t border-primary/10">
            <div className="space-y-2 max-w-3xl">
                <h2 className="text-2xl font-semibold tracking-tight text-primary">
                    Practice Examination
                </h2>
                {paid ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Sit it like the real thing. Nothing is marked until you finish, and then you get the
                        score, the worked answers and every scenario you saw. Budget about 1 minute 15 seconds
                        a question. The two mock forms are the ones printed in Volume I, question for question,
                        in the same order.
                    </p>
                ) : (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Sit it like the real thing. Nothing is marked until you finish, and then you get the
                        score, the worked answers and every scenario you saw. Budget about 1 minute 15 seconds
                        a question. You cannot guess your way through on position either: across the free{" "}
                        {counts.sample}, A, B, C and D each win exactly {summary.keyCounts.A} times.
                    </p>
                )}
            </div>
            {paid ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ExamButton form="A" total={total} />
                    <ExamButton form="B" total={total} />
                    <ExamButton count={50} total={total} />
                    <ExamButton count={100} total={total} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ExamButton count={50} total={total} onGated={gate(50)} />
                    <ExamButton count={100} total={total} onGated={gate(100)} />
                    <ExamButton total={total} everythingOpen={access === "open"} />
                </div>
            )}
            {asked && (
                <SignupPanel
                    placement="exam_modes"
                    autoFocus
                    context={`A weighted set draws on all ${counts.sample} free questions, so it opens with the signup.`}
                />
            )}
        </section>
    );
}

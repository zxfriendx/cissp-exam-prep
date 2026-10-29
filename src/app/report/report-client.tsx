"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Printer, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BLUEPRINT } from "@/lib/blueprint"
import { getPreviewSummary, getQuestionById, type Question } from "@/lib/content"
import { objectiveTitle } from "@/lib/outline"
import { cleanExplanation, orderedOptions } from "@/lib/text"
import { QuestionProvenance } from "@/components/quiz/question-provenance"
import { READINESS_WINDOW_DAYS } from "@/lib/progress/readiness"
import type { AttemptRecord } from "@/lib/idb"
import { useProgressStore } from "@/store/progress-store"

import "./print.css"

/**
 * The study guide: everything the attempt log knows, laid out to be read once
 * and then printed.
 *
 * No PDF library and no server. The browser's own print-to-PDF is better than
 * anything that would fit in a static export — it hyphenates, it paginates, it
 * embeds the fonts, and it is already installed. src/app/report/print.css is
 * the whole of the paper design.
 *
 * THE FREE TIER GETS ALL OF THIS. It is generated over whatever the reader has
 * answered, which on the free tier is a 160-question set; the guide says so at
 * the end and says how much larger the printed examination is. A locked report
 * would make the upsell abstract — "there is more" — where an unlocked one over
 * a small sample makes it concrete: this is the shape of the thing, and it gets
 * this much more useful with four and a half times the questions behind it.
 */

const subscribeNoop = () => () => { }
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false)

const pct = (n: number) => `${Math.round(n * 100)}%`
const oneDp = (n: number) => (Math.round(n * 10) / 10).toString()

interface MissedRow {
    attempt: AttemptRecord
    question: Question
}

export default function ReportClient() {
    const mounted = useMounted()

    const hydrate = useProgressStore(s => s.hydrate)
    const hydrated = useProgressStore(s => s.hydrated)
    const attempts = useProgressStore(s => s.attempts)
    const rollupOf = useProgressStore(s => s.rollup)
    const readinessOf = useProgressStore(s => s.readiness)
    const objectiveRollup = useProgressStore(s => s.objectiveRollup)
    const labelCounts = useProgressStore(s => s.labelCounts)

    useEffect(() => { void hydrate() }, [hydrate])

    // print.css is scoped to this class so its inversion cannot follow the
    // reader onto the quiz — an imported stylesheet in the App Router is global.
    useEffect(() => {
        document.documentElement.classList.add("report-printing")
        return () => document.documentElement.classList.remove("report-printing")
    }, [])

    // One clock for the whole document, so the readiness window and the
    // generated date in the footer answer the same "now". A lazy initialiser
    // rather than an effect: the body below is never reached on the server, so
    // the build-time value it computes never enters the markup.
    const [now] = useState(() => Date.now())

    if (!mounted || !hydrated) {
        return (
            <div className="container max-w-4xl mx-auto px-6 py-24 text-center text-muted-foreground">
                Building your study guide&hellip;
            </div>
        )
    }

    const readiness = readinessOf(now)
    const r = rollupOf()
    const labels = labelCounts()
    const preview = getPreviewSummary()

    // ── section 3: what is currently wrong ───────────────────────────────────
    // The LATEST attempt per question, not every wrong answer ever: a question
    // missed in June and got right in August is learned, and printing it as a
    // failure would send the reader back over settled ground.
    const missedAttempts = [...r.latest.values()].filter(a => !a.correct)

    const byDomain = new Map<string, MissedRow[]>()
    let unresolved = 0
    for (const attempt of missedAttempts) {
        const question = getQuestionById(attempt.qid)
        if (!question) {
            // The question is not in the bank this browser has loaded. That is
            // the paid bank being cached rather than bundled: the attempt is
            // real, the text of it is simply not here to print.
            unresolved += 1
            continue
        }
        const list = byDomain.get(attempt.domainId) ?? []
        list.push({ attempt, question })
        byDomain.set(attempt.domainId, list)
    }
    for (const list of byDomain.values()) {
        list.sort((a, b) => a.question.id.localeCompare(b.question.id))
    }
    const missedTotal = missedAttempts.length - unresolved

    // ── section 2: weakest objectives, in blueprint order ────────────────────
    // Ordered by the book rather than by severity: the guide is read front to
    // back alongside the domains it belongs to, and jumping domain 7 to the top
    // because one objective went badly makes it unusable as a study plan. The
    // marks-at-stake figure is still on every row, so the ordering costs
    // nothing. Objectives with nothing wrong are left out and counted instead.
    const allObjectives = objectiveRollup()
    const weakObjectives = allObjectives
        .filter(o => o.bucket.acc < 1)
        .sort((a, b) => {
            const na = BLUEPRINT.find(x => x.id === a.domainId)?.number ?? 99
            const nb = BLUEPRINT.find(x => x.id === b.domainId)?.number ?? 99
            if (na !== nb) return na - nb
            if (a.score !== b.score) return b.score - a.score
            return a.id.localeCompare(b.id)
        })
    const cleanObjectives = allObjectives.length - weakObjectives.length

    const generated = new Date(now)

    if (attempts.length === 0) {
        return (
            <div className="container max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
                <h1 className="text-2xl font-semibold text-primary">Nothing to report yet</h1>
                <p className="text-muted-foreground">
                    The study guide is generated from your answers, and there are none. Take a quiz and
                    come back.
                </p>
                <Button asChild><Link href="/practice/">Start a quiz</Link></Button>
            </div>
        )
    }

    return (
        <div className="container max-w-4xl mx-auto px-6 py-12">
            {/* ── screen-only controls ──────────────────────────────────── */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-4 mb-10">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/progress/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to progress</Link>
                </Button>
                <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground max-w-xs text-right hidden sm:block">
                        Prints through your browser. Choose &ldquo;Save as PDF&rdquo; in the print dialog
                        to keep a copy.
                    </p>
                    <Button size="sm" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
            </div>

            <article className="report-root space-y-14">
                <header className="space-y-3">
                    <p className="vault-label">Secure Path Digital &middot; The Eight Domains</p>
                    <h1 className="font-display uppercase text-2xl sm:text-3xl font-normal text-primary" style={{ lineHeight: 1.2 }}>
                        Your <span className="grad-copper">study guide</span>
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        Generated {generated.toISOString().slice(0, 10)} from {readiness.attemptsAllTime} answer
                        {readiness.attemptsAllTime === 1 ? "" : "s"} recorded in this browser.
                        Every figure below is computed from that log; nothing was sent anywhere to produce it.
                    </p>
                </header>

                {/* ── 1. readiness and coverage ─────────────────────────── */}
                <section className="report-section space-y-5">
                    <h2 className="text-xl font-semibold tracking-tight text-primary">
                        1. Readiness and coverage
                    </h2>

                    <div className="report-block report-rule border-2 rounded-md p-4 space-y-2">
                        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                            readiness = Σ<sub>domain</sub> ( exam weight × accuracy over the
                            last {READINESS_WINDOW_DAYS} days × objectives covered )
                        </p>
                        <p className="text-sm">
                            <span className="font-display text-2xl text-primary">{oneDp(readiness.score)}</span>
                            <span className="text-muted-foreground"> of a possible {readiness.totalWeight}.</span>
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Accuracy counts {readiness.attemptsInWindow} of your {readiness.attemptsAllTime} answers
                            — the ones inside the {READINESS_WINDOW_DAYS}-day window. Coverage counts the whole
                            history against the 2024 outline: answering every question you have seen correctly
                            today would give you {oneDp(readiness.ceiling)}, because the coverage column
                            would not move.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b">
                                    <th className="py-2 pr-3 font-normal">Domain</th>
                                    <th className="py-2 px-2 font-normal text-right">Weight</th>
                                    <th className="py-2 px-2 font-normal text-right">Right</th>
                                    <th className="py-2 px-2 font-normal text-right">Accuracy</th>
                                    <th className="py-2 px-2 font-normal text-right">Objectives</th>
                                    <th className="py-2 px-2 font-normal text-right">Coverage</th>
                                    <th className="py-2 pl-2 font-normal text-right">Marks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {readiness.domains.map(d => (
                                    <tr key={d.domainId}>
                                        <td className="py-2 pr-3">{d.number}. {d.name}</td>
                                        <td className="py-2 px-2 text-right font-mono text-xs">{d.weight}</td>
                                        <td className="py-2 px-2 text-right font-mono text-xs">{d.correct}/{d.attempts}</td>
                                        <td className="py-2 px-2 text-right font-mono text-xs">{pct(d.acc)}</td>
                                        <td className="py-2 px-2 text-right font-mono text-xs">{d.objectivesAttempted}/{d.objectivesInDomain}</td>
                                        <td className="py-2 px-2 text-right font-mono text-xs">{pct(d.coverage)}</td>
                                        <td className="py-2 pl-2 text-right font-mono text-xs text-primary">{oneDp(d.contribution)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2">
                                    <td className="py-2 pr-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total</td>
                                    <td className="py-2 px-2 text-right font-mono text-xs">{readiness.totalWeight}</td>
                                    <td className="py-2 px-2" />
                                    <td className="py-2 px-2" />
                                    <td className="py-2 px-2" />
                                    <td className="py-2 px-2" />
                                    <td className="py-2 pl-2 text-right font-mono text-sm font-semibold text-primary">{oneDp(readiness.score)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* ── 2. weakest objectives ─────────────────────────────── */}
                <section className="report-section space-y-5">
                    <h2 className="text-xl font-semibold tracking-tight text-primary">
                        2. Objectives to work on
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        The 2024 outline objectives you have got something wrong on, in book order.
                        &ldquo;Marks&rdquo; is what the objective is costing you: how much of it you are
                        missing, multiplied by the domain&rsquo;s share of the real examination.
                        {cleanObjectives > 0 && <> {cleanObjectives} other objective{cleanObjectives === 1 ? " is" : "s are"} clean and left out.</>}
                    </p>

                    {weakObjectives.length === 0 ? (
                        <p className="text-sm">Nothing wrong on any objective you have been tested on.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b">
                                        <th className="py-2 pr-3 font-normal">Objective</th>
                                        <th className="py-2 px-2 font-normal">Title</th>
                                        <th className="py-2 px-2 font-normal text-right">Attempts</th>
                                        <th className="py-2 px-2 font-normal text-right">Accuracy</th>
                                        <th className="py-2 pl-2 font-normal text-right">Marks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {weakObjectives.map(o => (
                                        <tr key={o.id} className="report-block">
                                            <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">{o.id}</td>
                                            <td className="py-2 px-2">{objectiveTitle(o.id) ?? "—"}</td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">{o.bucket.correct}/{o.bucket.attempts}</td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">{pct(o.bucket.acc)}</td>
                                            <td className="py-2 pl-2 text-right font-mono text-xs">{oneDp(o.score)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ── 3. the questions currently wrong ──────────────────── */}
                <section className="report-section space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight text-primary">
                        3. The questions you have wrong
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        {missedTotal === 0
                            ? "Your most recent answer to every question you have attempted was correct."
                            : <>The {missedTotal} question{missedTotal === 1 ? "" : "s"} whose most recent answer
                                was wrong, grouped by domain. A question you missed once and have since got
                                right is not here — it is learned.</>}
                        {unresolved > 0 && (
                            <> {unresolved} more {unresolved === 1 ? "question needs" : "questions need"} the
                                app to reconnect: {unresolved === 1 ? "it was" : "they were"} answered against a
                                question bank this browser has not loaded, so the text cannot be printed.</>
                        )}
                    </p>

                    {BLUEPRINT.map(b => {
                        const rows = byDomain.get(b.id)
                        if (!rows || rows.length === 0) return null
                        return (
                            <div key={b.id} className="space-y-5">
                                <h3 className="text-sm font-mono uppercase tracking-[0.18em] text-muted-foreground report-rule border-b pb-2">
                                    Domain {b.number} &middot; {b.name} &middot; {rows.length} wrong
                                </h3>
                                {rows.map(({ attempt, question }) => {
                                    const reason = question.distractorReasons?.[attempt.chosen]
                                    const explanation = cleanExplanation(
                                        question.explanation,
                                        question.options[question.correctAnswer],
                                    )
                                    return (
                                        <div key={question.id} className="report-block report-rule border rounded-md p-4 space-y-3">
                                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                                {question.id}
                                                {question.number && <> &middot; book question {question.number}</>}
                                            </p>

                                            {/* The recall line restates the question so the block stands
                                                alone on paper, away from the scenario it was set in. */}
                                            <p className="text-sm font-medium text-primary leading-relaxed">
                                                {question.recallLine ?? question.question}
                                            </p>

                                            <ul className="space-y-1.5">
                                                {orderedOptions(question.options).map(([letter, text]) => {
                                                    const isKey = letter === question.correctAnswer
                                                    const isChosen = letter === attempt.chosen
                                                    return (
                                                        <li
                                                            key={letter}
                                                            className={[
                                                                "text-sm leading-relaxed pl-3 py-1",
                                                                isKey ? "report-key border-l-[3px] border-l-[rgb(var(--success))]" : "",
                                                                !isKey && isChosen ? "report-chosen border-l-[3px] border-l-[rgb(var(--destructive))]" : "",
                                                                !isKey && !isChosen ? "border-l-[3px] border-l-transparent text-muted-foreground" : "",
                                                            ].join(" ")}
                                                        >
                                                            <span className="font-mono text-xs mr-2">{letter}.</span>
                                                            {text}
                                                            {isKey && <span className="font-mono text-[10px] uppercase tracking-widest ml-2 text-[rgb(var(--success))]">correct</span>}
                                                            {!isKey && isChosen && <span className="font-mono text-[10px] uppercase tracking-widest ml-2 text-[rgb(var(--destructive))]">you chose this</span>}
                                                        </li>
                                                    )
                                                })}
                                            </ul>

                                            {explanation && (
                                                <p className="text-sm leading-relaxed text-foreground/85">{explanation}</p>
                                            )}

                                            {/* Why the option actually chosen loses. The whole argument for
                                                this bank is that a wrong option is not noise — it is the
                                                right answer to a different question, and the book names it. */}
                                            {reason ? (
                                                <div className="text-sm leading-relaxed report-rule border-t pt-3">
                                                    <p>
                                                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                                            Option {attempt.chosen} &middot; {reason.label}
                                                        </span>
                                                    </p>
                                                    <p className="mt-1 text-foreground/85">
                                                        {reason.wouldAnswer}
                                                    </p>
                                                </div>
                                            ) : attempt.label ? (
                                                <div className="text-sm leading-relaxed report-rule border-t pt-3">
                                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                                        Option {attempt.chosen} &middot; {attempt.label}
                                                    </p>
                                                </div>
                                            ) : null}

                                            <QuestionProvenance question={question} />
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </section>

                {/* ── 4. the reasoning traps ────────────────────────────── */}
                <section className="report-section space-y-5">
                    <h2 className="text-xl font-semibold tracking-tight text-primary">
                        4. How you go wrong
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        Every wrong option in this bank is labelled with the kind of mistake it is. Counted
                        over your {labels.reduce((n, l) => n + l.count, 0)} labelled wrong answer
                        {labels.reduce((n, l) => n + l.count, 0) === 1 ? "" : "s"}, this is the shape of them
                        — a habit of reasoning rather than a gap in a topic, and the faster of the two to fix.
                    </p>

                    {labels.length === 0 ? (
                        <p className="text-sm">No labelled wrong answers yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {labels.map(l => {
                                const q = getQuestionById(l.example.qid)
                                const reason = q?.distractorReasons?.[l.example.chosen]
                                return (
                                    <div key={l.label} className="report-block report-rule border rounded-md p-4 space-y-2">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-primary">{l.label}</h3>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {l.count} time{l.count === 1 ? "" : "s"} &middot; {pct(l.share)} of your wrong answers
                                            </span>
                                        </div>
                                        {q ? (
                                            <div className="text-sm leading-relaxed space-y-1">
                                                <p className="text-muted-foreground">
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Most recent</span>
                                                    {" "}&middot; {q.id}
                                                </p>
                                                <p className="text-foreground/85">{q.recallLine ?? q.question}</p>
                                                <p>
                                                    You chose {l.example.chosen}
                                                    {q.optionsShort?.[l.example.chosen] && <> ({q.optionsShort[l.example.chosen]})</>};
                                                    the key was {q.correctAnswer}
                                                    {q.optionsShort?.[q.correctAnswer] && <> ({q.optionsShort[q.correctAnswer]})</>}.
                                                </p>
                                                {reason && (
                                                    <p className="text-foreground/85">
                                                        {reason.wouldAnswer}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                The example needs the app to reconnect: it was answered against a
                                                question bank this browser has not loaded.
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* ── the footer line ───────────────────────────────────── */}
                <footer className="report-block report-rule border-t pt-5 space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        This guide was built over the {preview.served} questions the free practice app serves,
                        {" "}{preview.perDomain} per domain. The printed <em>Practice Examination</em> carries
                        {" "}{preview.paid} — the same scenarios and the same labelled wrong options, over
                        {" "}{(preview.paid / preview.served).toFixed(1)} times the ground, which is what
                        moves the coverage column in section 1.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Generated {generated.toISOString().slice(0, 10)} at learn.securepathdigital.net.
                        Secure Path Digital LLC. CISSP is a registered mark of ISC2; this is not an ISC2 product.
                    </p>
                </footer>
            </article>
        </div>
    )
}

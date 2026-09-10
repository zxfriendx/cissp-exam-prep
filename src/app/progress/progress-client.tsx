"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
    AlertTriangle,
    CalendarClock,
    Download,
    FileText,
    Upload,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BLUEPRINT, formatMinutes, PACE_SECONDS_PER_QUESTION } from "@/lib/blueprint"
import { getPreviewSummary } from "@/lib/content"
import { objectiveTitle } from "@/lib/outline"
import { exportFilename } from "@/lib/progress/export"
import { READINESS_WINDOW_DAYS } from "@/lib/progress/readiness"
import { DAILY_TARGET, useProgressStore, type ImportOutcome } from "@/store/progress-store"
import { useQuizStore } from "@/store/quiz-store"
import { useRouter } from "next/navigation"

// Everything on this page is read out of IndexedDB, which the prerender does
// not have. Render nothing until mounted rather than rendering zeroes the
// browser then has to correct.
const subscribeNoop = () => () => { }
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false)

const pct = (n: number) => `${Math.round(n * 100)}%`
const oneDp = (n: number) => (Math.round(n * 10) / 10).toString()

/** "3 days ago", "today". Relative, because an absolute date needs a locale. */
function ago(ts: number, now: number): string {
    if (!ts) return "never"
    const days = Math.floor((now - ts) / 86_400_000)
    if (days <= 0) return "today"
    if (days === 1) return "yesterday"
    if (days < 30) return `${days} days ago`
    const months = Math.round(days / 30)
    return months === 1 ? "a month ago" : `${months} months ago`
}

export default function ProgressClient() {
    const mounted = useMounted()
    const router = useRouter()

    const hydrate = useProgressStore(s => s.hydrate)
    const hydrated = useProgressStore(s => s.hydrated)
    const error = useProgressStore(s => s.error)
    const attempts = useProgressStore(s => s.attempts)
    const readinessOf = useProgressStore(s => s.readiness)
    const objectiveRollup = useProgressStore(s => s.objectiveRollup)
    const weakestDomains = useProgressStore(s => s.weakestDomains)
    const labelCounts = useProgressStore(s => s.labelCounts)
    const todaysQueue = useProgressStore(s => s.todaysQueue)
    const reachableObjectives = useProgressStore(s => s.reachableObjectives)
    const exportJson = useProgressStore(s => s.exportJson)
    const importJson = useProgressStore(s => s.importJson)
    const clearProgress = useProgressStore(s => s.clearProgress)
    const startReviewQuiz = useQuizStore(s => s.startReviewQuiz)

    useEffect(() => { void hydrate() }, [hydrate])

    // One clock for the whole page, read once at mount. Readiness, the due queue
    // and every "3 days ago" then all answer the same "now" — computed per call
    // they can disagree across a second boundary, which shows up as a due count
    // that does not match the queue the button starts.
    //
    // A lazy initialiser rather than an effect: the server render never reaches
    // the body below (it returns early until `mounted && hydrated`), so the
    // build-time value it computes is never in the markup and there is nothing
    // for the client to mismatch.
    const [now] = useState(() => Date.now())

    const fileInput = useRef<HTMLInputElement>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [confirmClear, setConfirmClear] = useState(false)

    if (!mounted || !hydrated) {
        return (
            <div className="container max-w-5xl mx-auto px-6 py-24 text-center text-muted-foreground">
                Reading your history&hellip;
            </div>
        )
    }

    const readiness = readinessOf(now)
    const queue = todaysQueue(now, DAILY_TARGET)
    const objectives = objectiveRollup()
    const domains = weakestDomains()
    const labels = labelCounts()
    const reachable = reachableObjectives()
    const preview = getPreviewSummary()

    const answered = readiness.attemptsAllTime
    const distinct = new Set(attempts.map(a => a.qid)).size
    const wrongNow = attempts.length > 0 ? [...new Map(
        attempts.slice().sort((a, b) => a.ts - b.ts).map(a => [a.qid, a]),
    ).values()].filter(a => !a.correct).length : 0

    const handleExport = () => {
        const blob = new Blob([exportJson(now)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = exportFilename(now)
        a.click()
        URL.revokeObjectURL(url)
        setNotice(`Saved ${attempts.length} attempt${attempts.length === 1 ? "" : "s"} to ${exportFilename(now)}.`)
    }

    const handleImport = async (file: File) => {
        try {
            const outcome: ImportOutcome = await importJson(await file.text())
            const parts = [
                `${outcome.added} attempt${outcome.added === 1 ? "" : "s"} added`,
                outcome.duplicates > 0 ? `${outcome.duplicates} already here` : null,
                outcome.skipped > 0 ? `${outcome.skipped} row${outcome.skipped === 1 ? "" : "s"} skipped as unreadable` : null,
                outcome.edition ? `bank edition ${outcome.edition}` : null,
            ].filter(Boolean)
            setNotice(`${parts.join(", ")}.`)
        } catch (e) {
            setNotice(e instanceof Error ? e.message : "That file could not be read.")
        }
    }

    const startDue = () => {
        if (queue.ids.length === 0) return
        startReviewQuiz(queue.ids)
        router.push("/quiz/review")
    }

    return (
        <div className="container max-w-5xl mx-auto px-6 py-16 space-y-16">
            <header className="space-y-4">
                <p className="vault-label">Your progress</p>
                <h1 className="font-display uppercase text-2xl sm:text-3xl md:text-4xl font-normal text-primary" style={{ lineHeight: 1.2 }}>
                    Where you <span className="grad-copper">stand</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    Computed in this browser from the {answered} answer{answered === 1 ? "" : "s"} you have
                    given, across {distinct} distinct question{distinct === 1 ? "" : "s"}. Nothing is sent
                    anywhere; clear your browser storage and it is gone, which is why there is an export
                    button at the bottom of this page.
                </p>
            </header>

            {error && (
                <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive stroke-2" />
                    <div>
                        <p className="font-medium text-primary">This browser is not storing your answers.</p>
                        <p className="text-muted-foreground mt-1">{error}</p>
                        <p className="text-muted-foreground mt-1">
                            Quizzes still mark correctly, but nothing here will survive a reload. A private
                            window, or storage blocked for this site, is the usual cause.
                        </p>
                    </div>
                </div>
            )}

            {answered === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center space-y-4">
                        <p className="text-lg text-primary font-medium">Nothing recorded yet.</p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            Answer a few questions and this page fills in: a readiness figure with the
                            arithmetic behind it, the objectives costing you the most marks, and a review
                            queue that brings each question back just before you would forget it.
                        </p>
                        <Button asChild><Link href="/practice/">Start a quiz</Link></Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── readiness, with its working ───────────────────────── */}
                    <section className="space-y-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-primary">Readiness</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Not a pass prediction. It is the sum of one row per domain, and every row is below.
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="font-display text-4xl text-primary">{oneDp(readiness.score)}</div>
                                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    of a possible {readiness.totalWeight}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-md border-2 border-primary/10 bg-card/40 p-4">
                            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                                readiness = Σ<sub>domain</sub> ( exam weight × accuracy over the
                                last {READINESS_WINDOW_DAYS} days × objectives covered )
                            </p>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Accuracy counts only the
                                last {READINESS_WINDOW_DAYS} days ({readiness.attemptsInWindow} of
                                your {readiness.attemptsAllTime} answers), so work you did two months ago
                                stops holding the number up. Coverage counts the whole history, because
                                ground covered does not go stale the way form does.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                        <th className="py-2 pr-3 font-normal">Domain</th>
                                        <th className="py-2 px-3 font-normal text-right">Weight</th>
                                        <th className="py-2 px-3 font-normal text-right">Accuracy ({READINESS_WINDOW_DAYS} d)</th>
                                        <th className="py-2 px-3 font-normal text-right">Coverage</th>
                                        <th className="py-2 pl-3 font-normal text-right">Contribution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/10">
                                    {readiness.domains.map(d => (
                                        <tr key={d.domainId}>
                                            <td className="py-3 pr-3">
                                                <div className="text-foreground/90">{d.number}. {d.name}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {d.attempts === 0
                                                        ? <>nothing in the window</>
                                                        : <>{d.correct} of {d.attempts} right</>}
                                                    {" · "}
                                                    {d.objectivesAttempted} of {d.objectivesInDomain} objectives touched
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-xs">{d.weight}</td>
                                            <td className="py-3 px-3 text-right font-mono text-xs">{pct(d.acc)}</td>
                                            <td className="py-3 px-3 text-right font-mono text-xs">{pct(d.coverage)}</td>
                                            <td className="py-3 pl-3 text-right font-mono text-xs text-primary">{oneDp(d.contribution)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-primary/20">
                                        <td className="py-3 pr-3 text-xs uppercase font-mono tracking-widest text-muted-foreground">Total</td>
                                        <td className="py-3 px-3 text-right font-mono text-xs">{readiness.totalWeight}</td>
                                        <td className="py-3 px-3" />
                                        <td className="py-3 px-3" />
                                        <td className="py-3 pl-3 text-right font-mono text-sm text-primary font-semibold">{oneDp(readiness.score)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="text-xs text-muted-foreground leading-relaxed space-y-2 max-w-3xl">
                            <p>
                                <span className="text-foreground/80 font-medium">Why coverage caps the score.</span>{" "}
                                Answering everything correctly today would give you {oneDp(readiness.ceiling)},
                                not {readiness.totalWeight}, because the coverage column would not move:
                                the denominator is the whole 2024 outline.
                            </p>
                            <p>
                                The {preview.served} free questions between them reach{" "}
                                {BLUEPRINT.reduce((n, b) => n + (reachable[b.id] ?? 0), 0)} of the{" "}
                                {readiness.domains.reduce((n, d) => n + d.objectivesInDomain, 0)} objectives
                                the outline lists, so free-tier readiness has a ceiling however well you do.
                                The printed examination&rsquo;s {preview.paid} questions are what move it.
                            </p>
                        </div>
                    </section>

                    {/* ── due today ─────────────────────────────────────────── */}
                    <section className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-semibold text-primary">Due today</CardTitle>
                                <CalendarClock className="h-5 w-5 text-secondary stroke-2" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-3xl font-bold text-primary">{queue.ids.length}</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {queue.due.length} scheduled for review
                                    {queue.fresh.length > 0 && <> and {queue.fresh.length} you have not seen</>}.
                                    At exam pace that is about {formatMinutes(queue.ids.length * PACE_SECONDS_PER_QUESTION)}.
                                </p>
                                <Button size="sm" onClick={startDue} disabled={queue.ids.length === 0}>
                                    Start the queue
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-semibold text-primary">Currently wrong</CardTitle>
                                <FileText className="h-5 w-5 text-secondary stroke-2" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-3xl font-bold text-primary">{wrongNow}</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Question{wrongNow === 1 ? "" : "s"} whose most recent answer was wrong, out
                                    of {distinct} you have attempted. The study guide works through every one
                                    of them, and prints.
                                </p>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/report/">Open the study guide</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── weakness by domain ────────────────────────────────── */}
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-primary">Weakest domains</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ordered by marks left on the table: how much you are getting wrong, multiplied
                                by how much of the paper the domain is. Getting domain 1 (16%) from half right
                                to all right is worth more than the same gain in domain 2 (10%).
                            </p>
                        </div>
                        <div className="divide-y divide-primary/10 border-2 border-primary/10 rounded-md overflow-hidden">
                            {domains.map(row => (
                                <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                                        {row.id.replace("domain_", "Domain ")}
                                    </span>
                                    <span className="flex-1 min-w-[12rem] text-foreground/90">
                                        {BLUEPRINT.find(b => b.id === row.id)?.name ?? row.id}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {row.bucket.correct}/{row.bucket.attempts} · {pct(row.bucket.acc)}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground w-24 text-right">
                                        {oneDp(row.score)} marks
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground/70 w-24 text-right">
                                        {ago(row.bucket.lastSeen, now)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── weakness by objective ─────────────────────────────── */}
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-primary">Weakest objectives</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                The same ordering, one level down: the 2024 outline objectives your answers
                                have actually been tagged against. {objectives.length} of
                                them so far.
                            </p>
                        </div>
                        <div className="divide-y divide-primary/10 border-2 border-primary/10 rounded-md overflow-hidden">
                            {objectives.slice(0, 15).map(row => (
                                <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                                    <span className="font-mono text-xs text-secondary border border-secondary/25 rounded px-2 py-0.5 shrink-0">
                                        {row.id}
                                    </span>
                                    <span className="flex-1 min-w-[14rem] text-foreground/90">
                                        {objectiveTitle(row.id) ?? "—"}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {row.bucket.correct}/{row.bucket.attempts} · {pct(row.bucket.acc)}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground w-20 text-right">
                                        {oneDp(row.score)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {objectives.length > 15 && (
                            <p className="text-xs text-muted-foreground">
                                Showing the 15 costliest of {objectives.length}. The study guide lists them all.
                            </p>
                        )}
                    </section>

                    {/* ── the distractor vocabulary ─────────────────────────── */}
                    {labels.length > 0 && (
                        <section className="space-y-4">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-primary">How you go wrong</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Every wrong option in the bank carries a reason label. These are the ones
                                    you have picked, counted over your wrong answers — a habit, not a topic.
                                </p>
                            </div>
                            <div className="divide-y divide-primary/10 border-2 border-primary/10 rounded-md overflow-hidden">
                                {labels.map(l => (
                                    <div key={l.label} className="flex items-center gap-4 px-4 py-3 text-sm">
                                        <span className="flex-1 text-foreground/90">{l.label}</span>
                                        <span className="font-mono text-xs text-muted-foreground">{l.count}</span>
                                        <span className="font-mono text-xs text-muted-foreground w-14 text-right">{pct(l.share)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ── the log itself ────────────────────────────────────────── */}
            <section className="space-y-4 pt-8 border-t border-primary/10">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-primary">Your answer log</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                        {attempts.length} row{attempts.length === 1 ? "" : "s"}, held in this browser&rsquo;s
                        storage. Every number above is folded out of it on load, so there is nothing else to
                        back up. The file carries your answers and their timings and nothing else — no
                        licence, no account, no identifier.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button size="sm" variant="outline" onClick={handleExport} disabled={attempts.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) void handleImport(f)
                            e.target.value = ""
                        }}
                    />
                    {attempts.length > 0 && (
                        confirmClear ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                        void clearProgress()
                                        setConfirmClear(false)
                                        setNotice("Deleted. Every number on this page is back to nothing.")
                                    }}
                                >
                                    Delete all {attempts.length} rows
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
                            </>
                        ) : (
                            <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        )
                    )}
                </div>
                {notice && <p className="text-sm text-secondary">{notice}</p>}
            </section>
        </div>
    )
}

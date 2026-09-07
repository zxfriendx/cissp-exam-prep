"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarClock, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTotalQuestionCount } from "@/lib/content"
import { useQuizStore } from "@/store/quiz-store"
import { DAILY_TARGET, useProgressStore } from "@/store/progress-store"

/**
 * "Due today": the spaced-repetition queue, in the slot Weakness Hunter used to
 * occupy.
 *
 * Weakness Hunter dealt ten random questions from each of the three domains
 * with the worst running percentage. It could not tell a question answered
 * wrong last night from one answered wrong in June, could not tell either from
 * a question never seen, and happily re-served questions the reader had just
 * got right. This queue is the reviews SM-2 says have come due, most overdue
 * first, topped up with unseen questions from the weakest objectives only if
 * the day's target is not already met — so a reader who is behind gets their
 * backlog rather than filler.
 *
 * The counts on the card ARE the queue: they are computed by the same call the
 * click makes, so if it says twelve, the quiz that starts has twelve in it.
 */
export function WeaknessHunterButton() {
    const startReviewQuiz = useQuizStore(state => state.startReviewQuiz)
    const hydrate = useProgressStore(state => state.hydrate)
    const hydrated = useProgressStore(state => state.hydrated)
    // Subscribed to the log itself, not only to `hydrated`: recording an answer
    // replaces the attempts array, which is what re-renders this card with a
    // recounted queue.
    const seen = useProgressStore(state => new Set(state.attempts.map(a => a.qid)).size)
    const todaysQueue = useProgressStore(state => state.todaysQueue)
    const router = useRouter()

    useEffect(() => { void hydrate() }, [hydrate])

    // The queue depends on the clock and on IndexedDB, and the prerender has
    // neither. `hydrated` is false in the static markup AND on the first client
    // render, so the two agree and React keeps the tree; the queue appears on
    // the re-render that hydration triggers.
    //
    // One clock for the card, read once at mount, so the count shown and the
    // queue the click builds cannot straddle a due date.
    const [now] = useState(() => Date.now())
    const queue = hydrated ? todaysQueue(now, DAILY_TARGET) : null
    const total = queue ? queue.due.length + queue.fresh.length : 0
    const ready = total > 0

    const handleStart = () => {
        if (!queue || queue.ids.length === 0) return
        startReviewQuiz(queue.ids)
        router.push('/quiz/review')
    }

    return (
        <Card
            className={`transition-all duration-300 group border-2 border-secondary/30 ${ready ? 'cursor-pointer hover:border-secondary/50 hover:shadow-md' : 'opacity-75'}`}
            onClick={ready ? handleStart : undefined}
            role={ready ? "button" : undefined}
            tabIndex={ready ? 0 : undefined}
            onKeyDown={ready ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStart() }
            } : undefined}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                    Due today
                </CardTitle>
                <CalendarClock className="h-5 w-5 text-secondary stroke-2" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary mb-2">
                    {queue === null
                        ? <span className="text-muted-foreground">Checking&hellip;</span>
                        : `${total} question${total === 1 ? "" : "s"}`}
                </div>

                {queue === null && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Reading what you have answered before.
                    </p>
                )}

                {queue !== null && total === 0 && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Nothing is due yet, and you have already seen {seen} of
                        the {getTotalQuestionCount()} questions here. Come back tomorrow, or retake a domain.
                    </p>
                )}

                {queue !== null && total > 0 && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {queue.due.length > 0 && <>{queue.due.length} coming back for review</>}
                        {queue.due.length > 0 && queue.fresh.length > 0 && <>, plus </>}
                        {queue.due.length === 0 && queue.fresh.length > 0 && <>Nothing is due for review, so these are </>}
                        {queue.fresh.length > 0 && <>{queue.fresh.length} you have not seen, chosen from your weakest objectives</>}
                        .
                    </p>
                )}

                {queue !== null && queue.due.length === 0 && queue.fresh.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-secondary font-medium">
                        <Sparkles className="h-3.5 w-3.5 stroke-2" />
                        <span>Caught up on reviews &middot; {seen} of {getTotalQuestionCount()} seen</span>
                    </div>
                )}

                <Link
                    href="/progress/"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block mt-3 text-xs font-medium text-secondary hover:text-accent underline underline-offset-4"
                >
                    See where you stand
                </Link>
            </CardContent>
        </Card>
    )
}

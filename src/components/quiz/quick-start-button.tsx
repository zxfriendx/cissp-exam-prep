"use client"

import { Shuffle } from "lucide-react"
import { useQuizStore } from "@/store/quiz-store"
import { useRouter } from "next/navigation"
import { formatMinutes, paceBudgetSeconds } from "@/lib/blueprint"

/* The impulse path: one click from landing on the page to answering a question,
   with nothing to choose first. It runs the same startRandomQuiz(10) the Mixed
   Set card runs -- that card used to sit at the very bottom of the page beside
   20 and 40, where a first-time visitor had to scroll past every other mode to
   reach it. The card is gone from there; 20 and 40 remain for people who
   deliberately want a longer sitting. */
export function QuickStartButton({ count = 10 }: { count?: number }) {
    const startRandomQuiz = useQuizStore(state => state.startRandomQuiz);
    const router = useRouter();

    const handleStart = () => {
        startRandomQuiz(count);
        router.push('/quiz/random');
    };

    return (
        <div className="flex flex-col items-center gap-2.5 pt-4">
            <button
                type="button"
                onClick={handleStart}
                className="group inline-flex items-center gap-3 rounded-lg border-2 border-secondary/40 bg-secondary/10 px-7 py-4 text-base font-semibold text-primary transition-all duration-300 hover:border-secondary hover:bg-secondary/20 hover:shadow-md"
            >
                <Shuffle className="h-5 w-5 text-secondary stroke-2 transition-transform duration-500 group-hover:rotate-180" />
                Test your skill: {count} random questions
            </button>
            <p className="text-xs text-muted-foreground">
                All eight domains, about {formatMinutes(paceBudgetSeconds(count))} at exam pace. No account.
            </p>
        </div>
    )
}

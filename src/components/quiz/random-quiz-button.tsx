"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shuffle } from "lucide-react"
import { useQuizStore } from "@/store/quiz-store"
import { useRouter } from "next/navigation"

export function RandomQuizButton({ count }: { count: number }) {
    const startRandomQuiz = useQuizStore(state => state.startRandomQuiz);
    const router = useRouter();

    const handleStart = () => {
        startRandomQuiz(count);
        router.push('/quiz/random');
    };

    return (
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={handleStart}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Mixed Set
                </CardTitle>
                <Shuffle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{count} Questions</div>
                <p className="text-xs text-muted-foreground">
                    Randomized from all domains
                </p>
            </CardContent>
        </Card>
    )
}

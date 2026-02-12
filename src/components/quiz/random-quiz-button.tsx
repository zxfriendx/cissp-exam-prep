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
        <Card
            className="hover:border-secondary/50 hover:shadow-md transition-all duration-300 cursor-pointer group border-2 border-primary/15"
            onClick={handleStart}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                    Mixed Set
                </CardTitle>
                <Shuffle className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary mb-1" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                    {count}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Randomized from all domains
                </p>
            </CardContent>
        </Card>
    )
}

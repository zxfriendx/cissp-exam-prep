"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useQuizStore } from "@/store/quiz-store"
import Link from "next/link"
import { RotateCcw, Home } from "lucide-react"

interface ResultsViewProps {
    score: number
    totalQuestions: number
}

export function ResultsView({ score, totalQuestions }: ResultsViewProps) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const resetQuiz = useQuizStore(state => state.resetQuiz);

    let message = "Keep studying!";
    if (percentage >= 80) message = "Excellent work! You're ready.";
    else if (percentage >= 70) message = "Good job, but review the weak spots.";
    else if (percentage >= 50) message = "You're getting there.";

    return (
        <div className="container max-w-2xl mx-auto mt-12 p-4">
            <Card className="text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
                    <CardDescription className="text-xl mt-2">{message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="relative pt-6">
                        <div className="flex justify-between mb-2 text-sm font-medium">
                            <span>Score</span>
                            <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-4" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-4xl font-bold text-primary">{score}</div>
                            <div className="text-sm text-muted-foreground">Correct Answers</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-4xl font-bold">{totalQuestions}</div>
                            <div className="text-sm text-muted-foreground">Total Questions</div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-4 py-8">
                    <Button variant="outline" size="lg" onClick={resetQuiz} asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                    <Button size="lg" onClick={() => window.location.reload()}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retry Quiz
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

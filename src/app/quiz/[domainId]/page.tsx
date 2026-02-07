"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getDomainById, getQuestionsForDomain } from "@/lib/content"
import { useQuizStore } from "@/store/quiz-store"
import { useUserStatsStore } from "@/store/user-stats-store" // Added
import { QuestionCard } from "@/components/quiz/question-card"
import { ResultsView } from "@/components/quiz/results-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Home } from "lucide-react"
import Link from "next/link"

export default function QuizPage() {
    const params = useParams()
    const router = useRouter()
    const domainId = params.domainId as string

    const {
        currentQuestionIndex,
        answers,
        startQuiz,
        answerQuestion,
        nextQuestion,
        score,
        currentDomainId,
        isQuizActive,
        questions,
        quizTitle
    } = useQuizStore()

    const recordStats = useUserStatsStore(state => state.recordResult); // MOVED UP

    // Hydration check to prevent mismatch
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    // Initialize quiz logic
    useEffect(() => {
        if (!isQuizActive || (domainId !== 'random' && currentDomainId !== domainId)) {
            // If navigating directly to a domain URL and it's not the active quiz, start it.
            // If it IS the active quiz (even if 'random'), we just resume.
            if (domainId !== 'random') {
                startQuiz(domainId)
            }
        }
    }, [domainId, isQuizActive, currentDomainId, startQuiz])

    if (!mounted) return null;

    if (!questions || questions.length === 0) {
        // Fallback if accessed directly with 'random' but no state, or invalid domain
        if (domainId !== 'random') {
            // Try to start it if possible (re-run effects might catch this, but safe fallback)
            return null;
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">No active quiz found</h1>
                <Button asChild className="mt-4">
                    <Link href="/">Return Home</Link>
                </Button>
            </div>
        )
    }

    const isComplete = currentQuestionIndex >= questions.length;

    if (isComplete) {
        return <ResultsView score={score} totalQuestions={questions.length} />
    }

    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = answers[currentQuestion.id];

    // const recordStats = useUserStatsStore(state => state.recordResult); // REMOVED (Moved up)

    const handleAnswer = (optionId: string) => {
        const isCorrect = optionId === currentQuestion.correctAnswer;
        answerQuestion(currentQuestion.id, optionId, isCorrect);

        // Record Stats
        // Extract domainId from question id (e.g. "domain_1_q5" -> "domain_1")
        // We assume the ID format is always domain_X_qY
        const parts = currentQuestion.id.split('_');
        if (parts.length >= 2) {
            const dId = `${parts[0]}_${parts[1]}`;
            recordStats(dId, isCorrect);
        }
    }

    // Determine the domain for the current question (to get the correct Case Study)
    // Format: domain_X_qY
    const questionDomainId = (() => {
        const parts = currentQuestion.id.split('_');
        if (parts.length >= 2) {
            return `${parts[0]}_${parts[1]}`;
        }
        return domainId; // Fallback
    })();

    const currentCaseStudy = getDomainById(questionDomainId)?.caseStudy;

    return (
        <div className="container max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
            <div className="flex items-center justify-between py-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Exit Quiz
                    </Link>
                </Button>
                <div className="text-base font-semibold text-foreground/90">
                    {quizTitle}
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-grow flex flex-col justify-center pb-12">
                <QuestionCard
                    key={currentQuestion.id}
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    onAnswer={handleAnswer}
                    questionIndex={currentQuestionIndex}
                    totalQuestions={questions.length}
                    caseStudy={currentCaseStudy}
                />

                <div className="flex justify-end mt-6 mr-4 min-h-[40px]">
                    {/* Show Next button only if answered */}
                    {selectedAnswer && (
                        <Button onClick={nextQuestion} size="lg" className="animate-in fade-in slide-in-from-right-4">
                            Next Question
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

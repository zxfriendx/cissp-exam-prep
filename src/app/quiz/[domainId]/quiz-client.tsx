"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useParams } from "next/navigation"
import { domainOfQuestion, getStimulusFor, isVirtualQuizId } from "@/lib/content"
import { useQuizStore } from "@/store/quiz-store"
import { useUserStatsStore } from "@/store/user-stats-store"
import { QuestionCard } from "@/components/quiz/question-card"
import { ResultsView } from "@/components/quiz/results-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"

// The persisted store only exists in the browser, so the first client render
// must match the server's empty markup. useSyncExternalStore gives "false" on
// the server and "true" once hydrated without a setState-in-effect.
const subscribeNoop = () => () => {}
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false)

export default function QuizPageClient() {
    const params = useParams()
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
        quizTitle,
        deferFeedback,
    } = useQuizStore()

    const recordStats = useUserStatsStore(state => state.recordResult);
    const mounted = useMounted()

    // A domain URL starts (or resumes) that domain's quiz. The virtual routes
    // (random, weakness-hunter, exam) only ever resume what the store holds.
    useEffect(() => {
        if (isVirtualQuizId(domainId)) return
        if (!isQuizActive || currentDomainId !== domainId) {
            startQuiz(domainId)
        }
    }, [domainId, isQuizActive, currentDomainId, startQuiz])

    if (!mounted) return null;

    if (!questions || questions.length === 0) {
        if (!isVirtualQuizId(domainId)) {
            // The effect above is about to start it.
            return null;
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">No active quiz found</h1>
                <Button asChild className="mt-4">
                    <Link href="/practice/">Return Home</Link>
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

    const handleAnswer = (optionId: string) => {
        const isCorrect = optionId === currentQuestion.correctAnswer;
        answerQuestion(currentQuestion.id, optionId, isCorrect);

        // Per-domain stats feed Weakness Hunter.
        const dId = domainOfQuestion(currentQuestion);
        if (dId) recordStats(dId, isCorrect);
    }

    // The scenario THIS question is set in. A domain has fifteen to nineteen of
    // them, so it cannot be looked up from the domain the way the single
    // per-domain case study used to be. A discrete item has none and shows none.
    const scenario = getStimulusFor(currentQuestion);
    const mates = currentQuestion.stimulusId
        ? questions.filter(q => q.stimulusId === currentQuestion.stimulusId)
        : [];
    const scenarioPosition = scenario
        ? { index: mates.findIndex(q => q.id === currentQuestion.id) + 1, total: mates.length }
        : undefined;
    // Consecutive questions in one scenario: fold the panel rather than making
    // the reader scroll past the same six sentences three times.
    const previous = currentQuestionIndex > 0 ? questions[currentQuestionIndex - 1] : undefined;
    const scenarioContinued = !!scenario && previous?.stimulusId === currentQuestion.stimulusId;

    return (
        <div className="container max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
            <div className="flex items-center justify-between py-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/practice/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Exit Quiz
                    </Link>
                </Button>
                <div className="text-base font-semibold text-foreground/90 text-center">
                    {quizTitle}
                    {deferFeedback && (
                        <div className="text-xs font-normal text-muted-foreground mt-0.5">
                            Answers are marked at the end
                        </div>
                    )}
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
                    scenario={scenario}
                    scenarioPosition={scenarioPosition}
                    scenarioContinued={scenarioContinued}
                    deferFeedback={deferFeedback}
                />

                <div className="flex justify-end mt-6 mr-4 min-h-[40px]">
                    {/* Show Next button only if answered */}
                    {selectedAnswer && (
                        <Button onClick={nextQuestion} size="lg" className="animate-in fade-in slide-in-from-right-4">
                            {currentQuestionIndex + 1 >= questions.length ? "Finish" : "Next Question"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

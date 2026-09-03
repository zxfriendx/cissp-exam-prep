"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useQuizStore } from "@/store/quiz-store"
import { getDomainById } from "@/lib/content"
import { blueprintFor, formatMinutes, paceBudgetSeconds } from "@/lib/blueprint"
import { cleanExplanation, domainIdOf, orderedOptions, parseCaseStudy } from "@/lib/text"
import { Emphasis } from "@/components/quiz/emphasis"
import { CaseStudyBody } from "@/components/quiz/case-study"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { RotateCcw, Home, CheckCircle2, XCircle, BookOpen, Clock, EyeOff } from "lucide-react"

interface ResultsViewProps {
    score: number
    totalQuestions: number
}

interface DomainRow {
    id: string
    title: string
    correct: number
    total: number
}

export function ResultsView({ score, totalQuestions }: ResultsViewProps) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const { questions, answers, startedAt, finishedAt, resetQuiz, restartQuiz } = useQuizStore();

    let message = "Keep studying!";
    if (percentage >= 80) message = "Excellent work! You're ready.";
    else if (percentage >= 70) message = "Good job, but review the weak spots.";
    else if (percentage >= 50) message = "You're getting there.";

    // Pace: the book allows roughly 1 min 15 s per question.
    const elapsedSeconds = startedAt && finishedAt ? Math.max(0, Math.round((finishedAt - startedAt) / 1000)) : null;
    const budgetSeconds = paceBudgetSeconds(totalQuestions);

    // Score by domain, for sets that cross domains.
    const byDomain = new Map<string, DomainRow>();
    for (const q of questions) {
        const id = domainIdOf(q.id) ?? "other";
        const row = byDomain.get(id) ?? { id, title: getDomainById(id)?.title ?? id, correct: 0, total: 0 };
        row.total += 1;
        if (answers[q.id] === q.correctAnswer) row.correct += 1;
        byDomain.set(id, row);
    }
    const domainRows = [...byDomain.values()].sort(
        (a, b) => (blueprintFor(a.id)?.number ?? 99) - (blueprintFor(b.id)?.number ?? 99)
    );

    // The case study debrief for every domain in the set, now that the key is out.
    const debriefs = domainRows
        .map(row => ({ id: row.id, title: row.title, text: parseCaseStudy(getDomainById(row.id)?.caseStudy ?? "").debrief }))
        .filter(d => d.text);

    return (
        <div className="container max-w-4xl mx-auto mt-12 p-4 space-y-12">
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

                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 stroke-2" />
                        {elapsedSeconds !== null
                            ? <>You took {formatMinutes(elapsedSeconds)}. Exam pace allows about {formatMinutes(budgetSeconds)} for {totalQuestions} questions (1 min 15 s each).</>
                            : <>Exam pace allows about {formatMinutes(budgetSeconds)} for {totalQuestions} questions (1 min 15 s each).</>}
                    </p>

                    {domainRows.length > 1 && (
                        <div className="text-left">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest font-mono mb-3">Score by domain</h3>
                            <div className="divide-y divide-primary/10 border-2 border-primary/10 rounded-lg overflow-hidden">
                                {domainRows.map(row => {
                                    const pct = Math.round((row.correct / row.total) * 100);
                                    return (
                                        <div key={row.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                                            <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">
                                                {row.id.replace("domain_", "Domain ")}
                                            </span>
                                            <span className="flex-1 text-foreground/90">{row.title}</span>
                                            <span className="font-mono text-xs text-muted-foreground">{row.correct}/{row.total}</span>
                                            <span className={cn("font-semibold w-12 text-right", pct >= 70 ? "text-[rgb(var(--success))]" : "text-[rgb(var(--destructive))]")}>{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-4 py-8">
                    <Button variant="outline" size="lg" onClick={resetQuiz} asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                    <Button size="lg" onClick={restartQuiz}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retake This Set
                    </Button>
                </CardFooter>
            </Card>

            {/* The back of the book: key and worked explanations. */}
            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-primary flex items-center gap-2">
                        <BookOpen className="h-6 w-6 stroke-2" />
                        Answers explained
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Every question in this set with its key and the reasoning, including why each
                        distractor loses. Missed questions are open; the rest are folded.
                    </p>
                </div>
                <ol className="space-y-3">
                    {questions.map((q, i) => {
                        const chosen = answers[q.id];
                        const correct = chosen === q.correctAnswer;
                        const correctText = q.options[q.correctAnswer] ?? "";
                        return (
                            <li key={q.id}>
                                <details open={!correct} className="rounded-lg border-2 border-primary/15 bg-background">
                                    <summary className="cursor-pointer list-none px-5 py-4 flex items-start gap-3">
                                        {correct
                                            ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 stroke-2 text-[rgb(var(--success))]" />
                                            : <XCircle className="h-5 w-5 mt-0.5 shrink-0 stroke-2 text-[rgb(var(--destructive))]" />}
                                        <span className="font-mono text-xs text-muted-foreground mt-1 w-8 shrink-0">{i + 1}.</span>
                                        <span className="flex-1 text-sm leading-relaxed text-foreground/90">
                                            <Emphasis text={q.question} />
                                        </span>
                                    </summary>
                                    <div className="px-5 pb-6 pt-1 space-y-4 border-t-2 border-primary/10">
                                        <ul className="space-y-2 pt-3">
                                            {orderedOptions(q.options).map(([key, text]) => {
                                                const isKey = key === q.correctAnswer;
                                                const isChosen = key === chosen;
                                                return (
                                                    <li
                                                        key={key}
                                                        className={cn(
                                                            "flex gap-3 text-sm leading-relaxed rounded-md px-3 py-2",
                                                            isKey && "bg-[rgb(var(--success))]/15 text-foreground",
                                                            isChosen && !isKey && "bg-[rgb(var(--destructive))]/15 text-foreground",
                                                            !isKey && !isChosen && "text-foreground/60",
                                                        )}
                                                    >
                                                        <span className="font-mono font-semibold w-5 shrink-0 text-secondary">{key}.</span>
                                                        <span className="flex-1"><Emphasis text={text} /></span>
                                                        {isChosen && !isKey && <span className="text-xs text-muted-foreground shrink-0">your answer</span>}
                                                        {isKey && <span className="text-xs text-muted-foreground shrink-0">key</span>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <p className="text-sm font-medium text-secondary">
                                            <span className="font-mono">{q.correctAnswer}</span>
                                            {" — "}
                                            <Emphasis text={correctText} />
                                        </p>
                                        <p className="text-[15px] leading-relaxed text-foreground/80 whitespace-pre-line">
                                            <Emphasis text={cleanExplanation(q.explanation, correctText)} />
                                        </p>
                                    </div>
                                </details>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {debriefs.length > 0 && (
                <section className="space-y-4 pb-12">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-primary flex items-center gap-2">
                            <EyeOff className="h-6 w-6 stroke-2" />
                            Case study debrief
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            The analysis behind each scenario, held back until now because it gives answers away.
                        </p>
                    </div>
                    {debriefs.map(d => (
                        <details key={d.id} className="rounded-lg border-2 border-secondary/25 bg-background">
                            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-secondary">
                                {d.id.replace("domain_", "Domain ")} &middot; {d.title}
                            </summary>
                            <div className="px-5 sm:px-8 pb-8 pt-4 border-t-2 border-secondary/15">
                                <CaseStudyBody markdown={d.text} />
                            </div>
                        </details>
                    ))}
                </section>
            )}
        </div>
    )
}

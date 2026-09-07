"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, BookOpen } from "lucide-react"
import Link from "next/link"
import { getDrillCountPaid, setCountFor, setLabel } from "@/lib/content"
import { useBankStore } from "@/lib/bank"
import { useQuizStore } from "@/store/quiz-store"

interface DomainCardProps {
    id: string
    title: string
    questionCount: number
    description: string
    /** Share of the real examination, per the 2024 outline. */
    weight?: number
}

export function DomainCard({ id, title, questionCount, description, weight }: DomainCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const startQuiz = useQuizStore(state => state.startQuiz);
    const router = useRouter();
    const sets = setCountFor(questionCount);

    /* "20 of 80 questions", not "20 questions". A card that only says 20 lets a
       reader conclude 20 is all there is for the domain, which is the wrong
       impression in both directions: it undersells the book and it makes the
       free app look thin. The 80 is counted by the generator from the bank, not
       typed in here. Dropped once the paid bank is loaded, when 80 IS all of
       them and "80 of 80" is just noise. */
    const tier = useBankStore(state => state.tier);
    const paidDrills = getDrillCountPaid(id);
    const showOutOf = tier === 'free' && paidDrills !== undefined && paidDrills > questionCount;

    // "Start Quiz" is a link, so an unfinished domain quiz resumes. A set is
    // an explicit start: it replaces whatever the store holds for the domain.
    const startSet = (set: number) => {
        startQuiz(id, set);
        router.push(`/quiz/${id}`);
    };

    return (
        <Card
            className="flex flex-col h-full border-2 border-primary/15 hover:border-secondary/40 hover:shadow-lg transition-all duration-300 bg-background group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            }}
        >
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-3 mb-1">
                    <CardTitle className="text-lg leading-tight font-semibold text-primary">
                        {title}
                    </CardTitle>
                    <Badge
                        variant="secondary"
                        className="shrink-0 font-mono text-xs bg-muted/60 text-primary border border-primary/20"
                    >
                        {id.replace('domain_', '')}
                    </Badge>
                </div>
                <CardDescription className="text-sm font-medium">
                    {showOutOf ? `${questionCount} of ${paidDrills}` : questionCount} questions
                    {weight !== undefined && (
                        <span className="text-secondary"> &middot; {weight}% of the exam</span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow pb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-5 border-t border-primary/10">
                <Button asChild className="w-full font-medium shadow-sm bg-primary hover:bg-secondary transition-colors">
                    <Link href={`/quiz/${id}`}>
                        <PlayCircle className="mr-2 h-4 w-4 stroke-2" />
                        Start Quiz
                    </Link>
                </Button>
                {sets > 1 && (
                    <div className="w-full flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest shrink-0">In sets</span>
                        {Array.from({ length: sets }, (_, i) => i + 1).map(set => (
                            <button
                                key={set}
                                type="button"
                                onClick={() => startSet(set)}
                                className="text-xs font-mono px-2.5 py-1 rounded-md border border-primary/20 text-primary hover:border-secondary/60 hover:bg-muted/30 transition-colors"
                                aria-label={`Start ${title}, questions ${setLabel(set, questionCount)}`}
                            >
                                {setLabel(set, questionCount)}
                            </button>
                        ))}
                    </div>
                )}
                <Button
                    variant="outline"
                    className="w-full font-medium border-2 border-primary/20 hover:border-secondary/50 hover:bg-muted/30 transition-all"
                    asChild
                >
                    <Link href={`/study/${id}`}>
                        <BookOpen className="mr-2 h-4 w-4 stroke-2" />
                        Review Case Study
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

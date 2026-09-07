"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, BookMarked } from "lucide-react"
import { useQuizStore } from "@/store/quiz-store"
import { useRouter } from "next/navigation"
import { formatMinutes, paceBudgetSeconds } from "@/lib/blueprint"

interface ExamButtonProps {
    /** Blueprint-weighted sample size; omit for everything the app serves, in order. */
    count?: number
    /** How many questions the app serves, for the everything card. */
    total: number
}

export function ExamButton({ count, total }: ExamButtonProps) {
    const startExamQuiz = useQuizStore(state => state.startExamQuiz);
    const router = useRouter();
    const n = count ?? total;

    const handleStart = () => {
        startExamQuiz(count);
        router.push('/quiz/exam');
    };

    return (
        <Card
            className="hover:border-secondary/50 hover:shadow-md transition-all duration-300 cursor-pointer group border-2 border-primary/15"
            onClick={handleStart}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                    {count ? "Weighted Set" : "Everything Free"}
                </CardTitle>
                {count
                    ? <ClipboardList className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />
                    : <BookMarked className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary mb-1">
                    {n}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {count
                        ? "Drawn to the 2024 exam blueprint weights, domains mixed"
                        : "Every question the free app carries, domain by domain"}
                </p>
                <p className="text-xs text-secondary mt-2 font-medium">
                    About {formatMinutes(paceBudgetSeconds(n))} at exam pace
                </p>
            </CardContent>
        </Card>
    )
}

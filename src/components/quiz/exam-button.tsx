"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, BookMarked, FileText } from "lucide-react"
import { useQuizStore } from "@/store/quiz-store"
import { useRouter } from "next/navigation"
import { formatMinutes, paceBudgetSeconds } from "@/lib/blueprint"
import { getFormQuestions, type MockForm } from "@/lib/content"

interface ExamButtonProps {
    /** Blueprint-weighted sample size; omit for everything the app serves, in order. */
    count?: number
    /** How many questions the app serves, for the everything card. */
    total: number
    /**
     * One of the two paid mock forms, sat whole. Takes precedence over `count`:
     * a form is a fixed set in a fixed order, not a sample. Only offered on the
     * paid tier — see components/practice/exam-modes.tsx for why that tier has
     * no "everything" card at all.
     */
    form?: MockForm
    /** The "everything" card is showing only the open questions, not the whole sample. */
    everythingOpen?: boolean
    /**
     * The set needs more questions than the visitor has opened (a weighted 50
     * before the email signup, when 40 are open). Clicking calls this instead
     * of starting a short set, so the page can show the signup panel.
     */
    onGated?: () => void
}

export function ExamButton({ count, total, form, onGated, everythingOpen }: ExamButtonProps) {
    const startExamQuiz = useQuizStore(state => state.startExamQuiz);
    const startFormQuiz = useQuizStore(state => state.startFormQuiz);
    const router = useRouter();

    // Counted off the bank that is loaded, not the 125 the manifest promises:
    // if a form came back short, the card says so rather than the pace estimate
    // being quietly wrong.
    const n = form ? getFormQuestions(form).length : count ?? total;

    const handleStart = () => {
        if (onGated) {
            onGated();
            return;
        }
        if (form) {
            startFormQuiz(form);
            router.push(`/quiz/form-${form.toLowerCase()}`);
            return;
        }
        startExamQuiz(count);
        router.push('/quiz/exam');
    };

    const title = form ? `Mock Form ${form}` : count ? "Weighted Set" : everythingOpen ? "Everything Open" : "Everything Free";
    const blurb = form
        ? "The whole form as the printed book sets it, in order"
        : count
            ? "Drawn to the 2024 exam blueprint weights, domains mixed"
            : everythingOpen
                ? "Every question open now, domain by domain"
                : "Every question the free app carries, domain by domain";

    return (
        <Card
            className="hover:border-secondary/50 hover:shadow-md transition-all duration-300 cursor-pointer group border-2 border-primary/15"
            onClick={handleStart}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleStart() }
            }}
            aria-label={onGated ? `${title}, ${n} questions. Needs the free email signup` : undefined}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                    {title}
                </CardTitle>
                {form
                    ? <FileText className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />
                    : count
                        ? <ClipboardList className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />
                        : <BookMarked className="h-5 w-5 text-secondary group-hover:text-primary transition-colors stroke-2" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary mb-1">
                    {n}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {blurb}
                </p>
                <p className="text-xs text-secondary mt-2 font-medium">
                    {onGated
                        ? "Opens with the free email signup"
                        : `About ${formatMinutes(paceBudgetSeconds(n))} at exam pace`}
                </p>
            </CardContent>
        </Card>
    )
}

"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Question } from "@/lib/content"
import { cleanExplanation, orderedOptions } from "@/lib/text"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, FileText, BookOpen } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Emphasis } from "@/components/quiz/emphasis"

interface QuestionCardProps {
    question: Question
    selectedAnswer?: string
    onAnswer: (optionId: string) => void
    questionIndex: number
    totalQuestions: number
    /** The scenario only. The debrief is shown after the quiz. */
    caseStudy?: string
    /** Examination mode: record the answer, mark it at the end. */
    deferFeedback?: boolean
}

export function QuestionCard({
    question,
    selectedAnswer,
    onAnswer,
    questionIndex,
    totalQuestions,
    caseStudy,
    deferFeedback = false,
}: QuestionCardProps) {

    const isAnswered = !!selectedAnswer;
    const isCorrect = selectedAnswer === question.correctAnswer;
    const showMarking = isAnswered && !deferFeedback;

    // Options are shown in the bank's own A-D order. The bank's answer key is
    // balanced across the four letters (109/111/109/110), and every
    // explanation argues by letter ("A secures the path, not the login"), so a
    // runtime shuffle would put the explanation at odds with what was on
    // screen. This also matches the printed examination question for question.
    const options = orderedOptions(question.options);
    const correctText = question.options[question.correctAnswer] ?? "";
    const explanation = cleanExplanation(question.explanation, correctText);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full max-w-4xl mx-auto mt-12"
        >
            <Card className="shadow-lg border-2 border-primary/15">
                <CardHeader className="pb-6 pt-8 px-8">
                    <div className="flex justify-between items-start mb-8">
                        <span className="text-xs font-semibold text-primary uppercase tracking-widest font-mono">
                            Question {questionIndex + 1} / {totalQuestions}
                        </span>

                        <div className="flex gap-3 items-center">
                            {caseStudy && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <button className="text-xs font-medium text-secondary hover:text-primary transition-colors flex items-center gap-2 px-4 py-2 rounded-md border-2 border-secondary/30 hover:border-secondary/50 bg-background hover:bg-muted/20">
                                            <FileText className="h-4 w-4 stroke-2" />
                                            Scenario
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-semibold text-primary">
                                                The scenario these questions are set in
                                            </DialogTitle>
                                        </DialogHeader>
                                        <p className="text-sm text-muted-foreground">
                                            The stems name systems and people that only appear here. The
                                            case study debrief is held back until you have finished.
                                        </p>
                                        <div className="prose dark:prose-invert max-w-none leading-relaxed text-base">
                                            <ReactMarkdown>{caseStudy}</ReactMarkdown>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {showMarking && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <Badge
                                        variant={isCorrect ? "default" : "destructive"}
                                        className="text-xs px-3 py-1 font-semibold"
                                        style={{
                                            backgroundColor: isCorrect ? 'rgb(var(--success))' : undefined,
                                            color: isCorrect ? 'rgb(var(--success-foreground))' : undefined
                                        }}
                                    >
                                        {isCorrect ? "Correct" : "Incorrect"}
                                    </Badge>
                                </motion.div>
                            )}
                            {isAnswered && deferFeedback && (
                                <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
                                    Recorded
                                </Badge>
                            )}
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight leading-relaxed text-primary">
                        <Emphasis text={question.question} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-8 pb-8">
                    <div className="grid gap-4">
                        {options.map(([key, text]) => {
                            const isSelected = selectedAnswer === key;
                            const isTargetCorrect = question.correctAnswer === key;

                            return (
                                <motion.div key={key} variants={itemVariants} layout>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left h-auto py-6 px-7 text-base whitespace-normal transition-all duration-300 border-2 font-normal",
                                            !isAnswered && "border-primary/20 hover:border-secondary/50 hover:bg-muted/20 hover:shadow-md",
                                            showMarking && isTargetCorrect && "border-secondary/60 bg-[rgb(var(--success))] text-[rgb(var(--success-foreground))] font-medium",
                                            showMarking && isSelected && !isTargetCorrect && "border-red-400 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100",
                                            showMarking && !isSelected && !isTargetCorrect && "border-primary/10 opacity-60",
                                            isAnswered && deferFeedback && isSelected && "border-secondary/60 bg-muted/30 font-medium",
                                            isAnswered && deferFeedback && !isSelected && "border-primary/10 opacity-60",
                                        )}
                                        onClick={() => !isAnswered && onAnswer(key)}
                                        disabled={isAnswered}
                                    >
                                        <div className="flex items-center w-full gap-4">
                                            <span className="font-mono text-sm font-semibold w-6 shrink-0 text-secondary">{key}.</span>
                                            <span className="flex-1 leading-relaxed"><Emphasis text={text} /></span>
                                            {showMarking && isTargetCorrect && <CheckCircle2 className="h-6 w-6 text-secondary shrink-0 stroke-2" />}
                                            {showMarking && isSelected && !isTargetCorrect && <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 stroke-2" />}
                                        </div>
                                    </Button>
                                </motion.div>
                            );
                        })}
                    </div>

                    {showMarking && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mt-8 p-6 bg-muted/20 rounded-lg border-2 border-primary/15"
                        >
                            <h4 className="font-semibold flex items-center gap-2 mb-3 text-primary text-base">
                                <BookOpen className="h-5 w-5 stroke-2" /> Explanation
                            </h4>
                            <p className="text-sm font-medium text-secondary mb-3">
                                <span className="font-mono">{question.correctAnswer}</span>
                                {" — "}
                                <Emphasis text={correctText} />
                            </p>
                            <p className="text-foreground/80 leading-relaxed text-[15px] whitespace-pre-line">
                                <Emphasis text={explanation} />
                            </p>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

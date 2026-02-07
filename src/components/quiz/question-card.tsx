"use client"

import { useMemo } from "react"

import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface QuestionCardProps {
    question: Question
    selectedAnswer?: string
    onAnswer: (optionId: string) => void
    questionIndex: number
    totalQuestions: number
    caseStudy?: string
}

export function QuestionCard({
    question,
    selectedAnswer,
    onAnswer,
    questionIndex,
    totalQuestions,
    caseStudy
}: QuestionCardProps) {

    const isAnswered = !!selectedAnswer;
    const isCorrect = selectedAnswer === question.correctAnswer;

    const shuffledOptions = useMemo(() => {
        const entries = Object.entries(question.options);
        // Fisher-Yates shuffle
        for (let i = entries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        return entries;
    }, [question.id]);

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
            className="w-full max-w-3xl mx-auto mt-8"
        >
            <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-6">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            Question {questionIndex + 1} / {totalQuestions}
                        </span>

                        <div className="flex gap-2 items-center">
                            {caseStudy && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10">
                                            <FileText className="h-3.5 w-3.5" />
                                            Case Study
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Case Study</DialogTitle>
                                        </DialogHeader>
                                        <div className="prose dark:prose-invert max-w-none leading-relaxed opacity-90">
                                            <ReactMarkdown>{caseStudy}</ReactMarkdown>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {isAnswered && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs px-2.5 py-0.5 font-medium">
                                        {isCorrect ? "Correct" : "Incorrect"}
                                    </Badge>
                                </motion.div>
                            )}
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight leading-snug">
                        {question.question}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3">
                        {shuffledOptions.map(([key, text]) => {
                            const isSelected = selectedAnswer === key;
                            const isTargetCorrect = question.correctAnswer === key;

                            let variant: "outline" | "default" | "destructive" | "secondary" = "outline";

                            if (isAnswered) {
                                if (isTargetCorrect) variant = "default";
                                else if (isSelected) variant = "destructive";
                                else variant = "secondary";
                            } else {
                                variant = isSelected ? "default" : "outline";
                            }

                            return (
                                <motion.div key={key} variants={itemVariants} layout>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left h-auto py-5 px-6 text-[15px] whitespace-normal transition-all duration-300 border-border/50 hover:border-primary/50",
                                            isAnswered && isTargetCorrect && "border-green-500/50 bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-950/30",
                                            isAnswered && isSelected && !isTargetCorrect && "border-red-500/50 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-950/30",
                                            !isAnswered && "hover:bg-accent/50 hover:shadow-sm"
                                        )}
                                        onClick={() => !isAnswered && onAnswer(key)}
                                        disabled={isAnswered}
                                    >
                                        <div className="flex items-center w-full">
                                            <span className="flex-1 leading-relaxed">{text}</span>
                                            {isAnswered && isTargetCorrect && <CheckCircle2 className="ml-3 h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />}
                                            {isAnswered && isSelected && !isTargetCorrect && <XCircle className="ml-3 h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
                                        </div>
                                    </Button>
                                </motion.div>
                            );
                        })}
                    </div>

                    {isAnswered && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="mt-8 p-4 bg-muted/50 rounded-lg"
                        >
                            <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <BookOpenIcon className="h-4 w-4" /> Explanation
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                                {question.explanation}
                            </p>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div >
    )
}

function BookOpenIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    )
}

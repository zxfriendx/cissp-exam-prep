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
                                            Case Study
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-semibold text-primary" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                                                Case Study
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="prose dark:prose-invert max-w-none leading-relaxed text-base">
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
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight leading-relaxed text-primary" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                        {question.question}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-8 pb-8">
                    <div className="grid gap-4">
                        {shuffledOptions.map(([key, text]) => {
                            const isSelected = selectedAnswer === key;
                            const isTargetCorrect = question.correctAnswer === key;

                            return (
                                <motion.div key={key} variants={itemVariants} layout>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left h-auto py-6 px-7 text-base whitespace-normal transition-all duration-300 border-2 font-normal",
                                            !isAnswered && "border-primary/20 hover:border-secondary/50 hover:bg-muted/20 hover:shadow-md",
                                            isAnswered && isTargetCorrect && "border-secondary/60 bg-[rgb(var(--success))] text-[rgb(var(--success-foreground))] font-medium",
                                            isAnswered && isSelected && !isTargetCorrect && "border-red-400 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100",
                                            isAnswered && !isSelected && !isTargetCorrect && "border-primary/10 opacity-60"
                                        )}
                                        onClick={() => !isAnswered && onAnswer(key)}
                                        disabled={isAnswered}
                                    >
                                        <div className="flex items-center w-full gap-4">
                                            <span className="flex-1 leading-relaxed">{text}</span>
                                            {isAnswered && isTargetCorrect && <CheckCircle2 className="h-6 w-6 text-secondary shrink-0 stroke-2" />}
                                            {isAnswered && isSelected && !isTargetCorrect && <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 stroke-2" />}
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
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mt-8 p-6 bg-[rgb(var(--light-blue))]/20 rounded-lg border-2 border-[rgb(var(--light-blue))]/40"
                        >
                            <h4 className="font-semibold flex items-center gap-2 mb-3 text-primary text-base" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                                <BookOpenIcon className="h-5 w-5 stroke-2" /> Explanation
                            </h4>
                            <p className="text-foreground/80 leading-relaxed text-[15px]">
                                {question.explanation}
                            </p>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
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

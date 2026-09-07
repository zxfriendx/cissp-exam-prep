"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Question, Stimulus } from "@/lib/content"
import { cleanExplanation, orderedOptions } from "@/lib/text"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, BookOpen, CornerDownRight } from "lucide-react"
import { Emphasis } from "@/components/quiz/emphasis"
import { ScenarioPanel } from "@/components/quiz/scenario-panel"
import { QuestionProvenance } from "@/components/quiz/question-provenance"

interface QuestionCardProps {
    question: Question
    selectedAnswer?: string
    onAnswer: (optionId: string) => void
    questionIndex: number
    totalQuestions: number
    /** The scenario this question is set in. Absent on a discrete item. */
    scenario?: Stimulus
    /** Which question of that scenario is on screen, and how many are in this set. */
    scenarioPosition?: { index: number; total: number }
    /** The previous question shared the scenario, so the panel opens folded. */
    scenarioContinued?: boolean
    /** Examination mode: record the answer, mark it at the end. */
    deferFeedback?: boolean
}

/**
 * Why a wrong option is wrong, under the option itself.
 *
 * Every question in the bank carries, for each distractor, a reason label from
 * a vocabulary of eight and the question that option WOULD have been the right
 * answer to. That second half is the part worth reading: a distractor in this
 * bank is a correct statement about something else, and naming the something
 * else is what turns a wrong answer into a lesson. The app has never shown any
 * of it -- the data was authored for the printed book and rendered nowhere.
 */
function OptionVerdict({
    label,
    wouldAnswer,
    chosen,
}: {
    label: string
    wouldAnswer: string
    chosen: boolean
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
                "ml-4 sm:ml-10 mt-2 border-l-2 pl-4 py-1",
                chosen ? "border-[rgb(var(--destructive))]/50" : "border-primary/15",
            )}
        >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</p>
            <p className="text-sm leading-relaxed text-muted-foreground mt-1 flex gap-2">
                <CornerDownRight className="h-3.5 w-3.5 mt-1 shrink-0 stroke-2 text-muted-foreground/60" />
                <span>
                    <span className="text-foreground/50">Would be the answer to: </span>
                    <span className="text-foreground/80"><Emphasis text={wouldAnswer} /></span>
                </span>
            </p>
        </motion.div>
    )
}

export function QuestionCard({
    question,
    selectedAnswer,
    onAnswer,
    questionIndex,
    totalQuestions,
    scenario,
    scenarioPosition,
    scenarioContinued = false,
    deferFeedback = false,
}: QuestionCardProps) {

    const isAnswered = !!selectedAnswer;
    const isCorrect = selectedAnswer === question.correctAnswer;
    const showMarking = isAnswered && !deferFeedback;

    // Options are shown in the bank's own A-D order. The bank's answer key is
    // balanced across the four letters (the free preview lands 40/40/40/40),
    // and every explanation argues by letter ("A secures the path, not the
    // login"), so a runtime shuffle would put the explanation at odds with what
    // was on screen. This also matches the printed examination question for
    // question.
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
            className="w-full max-w-4xl mx-auto mt-12 space-y-5"
        >
            {scenario && (
                <ScenarioPanel
                    stimulus={scenario}
                    position={scenarioPosition}
                    continued={scenarioContinued}
                />
            )}

            <Card className="shadow-lg border-2 border-primary/15">
                <CardHeader className="pb-6 pt-8 px-8">
                    <div className="flex justify-between items-start gap-4 mb-8">
                        <span className="text-xs font-semibold text-primary uppercase tracking-widest font-mono">
                            Question {questionIndex + 1} / {totalQuestions}
                        </span>

                        <div className="flex gap-3 items-center">
                            {question.discriminator && !isAnswered && (
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary border border-secondary/30 rounded px-2 py-1">
                                    Turns on &ldquo;{question.discriminator}&rdquo;
                                </span>
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
                            const reason = question.distractorReasons?.[key];

                            return (
                                <motion.div key={key} variants={itemVariants} layout>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left h-auto py-6 px-7 text-base whitespace-normal transition-all duration-300 border-2 font-normal",
                                            !isAnswered && "border-primary/20 hover:border-secondary/50 hover:bg-muted/20 hover:shadow-md",
                                            // Written as `!deferFeedback && isAnswered && isTargetCorrect` (rather
                                            // than the equivalent `showMarking && isTargetCorrect`) so the
                                            // contrast-fix regression guard (test/quiz-contrast.test.mjs) can still
                                            // regex-extract these three class strings by their exact
                                            // `isAnswered && ... && "..."` shape. Semantically identical to
                                            // `showMarking && isTargetCorrect` -- `showMarking` is exactly
                                            // `isAnswered && !deferFeedback`, AND is commutative, and none of these
                                            // are side-effecting -- but keep it this way rather than "simplifying"
                                            // back to `showMarking`, or the dark: contrast fix silently stops being
                                            // checked.
                                            !deferFeedback && isAnswered && isTargetCorrect && "border-secondary/60 dark:border-secondary/60 bg-[rgb(var(--success))] dark:bg-[rgb(var(--success))] text-[rgb(var(--success-foreground))] dark:text-[rgb(var(--success-foreground))] font-medium disabled:opacity-100",
                                            !deferFeedback && isAnswered && isSelected && !isTargetCorrect && "border-red-400 dark:border-red-400 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100 disabled:opacity-100",
                                            !deferFeedback && isAnswered && !isSelected && !isTargetCorrect && "border-primary/10 disabled:opacity-60",
                                            // Exam mode (deferFeedback): no correct/incorrect color-coding yet, but
                                            // this is the same dark-only outline-variant vs. bare-class specificity
                                            // issue the contrast fix above addresses, so it gets the same treatment
                                            // -- dark: counterparts for the highlight, and disabled:opacity-60
                                            // (not the bare `opacity-60` the rebuild branch had, which loses to the
                                            // base's disabled:opacity-50 the same way the pre-fix unselected-wrong
                                            // state did).
                                            isAnswered && deferFeedback && isSelected && "border-secondary/60 dark:border-secondary/60 bg-muted/30 dark:bg-muted/30 font-medium disabled:opacity-100",
                                            isAnswered && deferFeedback && !isSelected && "border-primary/10 disabled:opacity-60",
                                        )}
                                        onClick={() => !isAnswered && onAnswer(key)}
                                        disabled={isAnswered}
                                    >
                                        <div className="flex items-center w-full gap-4">
                                            {/* On the marked-correct option the fill is the mint --success and
                                                the label has to go dark with the text. Left at text-secondary it
                                                measured 1.06:1 against that fill -- copper on mint, invisible --
                                                while the option text beside it sat at 9.45:1. The class-merge
                                                guard in test/quiz-contrast.test.mjs cannot see this: it checks
                                                the button's own colours, not the spans inside it. */}
                                            <span className={cn(
                                                "font-mono text-sm font-semibold w-6 shrink-0",
                                                showMarking && isTargetCorrect ? "text-[rgb(var(--success-foreground))]" : "text-secondary",
                                            )}>{key}.</span>
                                            <span className="flex-1 leading-relaxed"><Emphasis text={text} /></span>
                                            {showMarking && isTargetCorrect && <CheckCircle2 className="h-6 w-6 text-[rgb(var(--success-foreground))] shrink-0 stroke-2" />}
                                            {showMarking && isSelected && !isTargetCorrect && <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 stroke-2" />}
                                        </div>
                                    </Button>

                                    {showMarking && reason && (
                                        <OptionVerdict
                                            label={reason.label}
                                            wouldAnswer={reason.wouldAnswer}
                                            chosen={isSelected}
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {showMarking && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mt-8 p-6 bg-muted/20 rounded-lg border-2 border-primary/15 space-y-4"
                        >
                            <h4 className="font-semibold flex items-center gap-2 text-primary text-base">
                                <BookOpen className="h-5 w-5 stroke-2" /> Explanation
                            </h4>
                            <p className="text-sm font-medium text-secondary">
                                <span className="font-mono">{question.correctAnswer}</span>
                                {" — "}
                                <Emphasis text={correctText} />
                            </p>
                            <p className="text-foreground/80 leading-relaxed text-[15px] whitespace-pre-line">
                                <Emphasis text={explanation} />
                            </p>

                            <QuestionProvenance question={question} />
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

"use client"

import { Library } from "lucide-react"
import type { Question } from "@/lib/content"

/**
 * Where an answer comes from: the standards it rests on, the 2024 outline
 * objectives it tests, and what kind of question it is.
 *
 * Shown in two places (under a marked question, and again in the review list),
 * so it lives here rather than being written twice and drifting.
 *
 * `sources`, `discriminator`, `lens`, `cognitive` and `difficulty` are on the
 * 340 items written fresh for v2 and absent from the 410 rewritten out of the
 * v1 bank, so every part of this renders only where its data exists and the
 * whole thing collapses to nothing when none of it does.
 */
export function QuestionProvenance({ question }: { question: Question }) {
    const meta: string[] = []
    if (question.discriminator) meta.push(question.discriminator)
    if (question.lens) meta.push(question.lens)
    if (question.cognitive) meta.push(question.cognitive)
    if (question.difficulty) meta.push(`difficulty ${question.difficulty} of 5`)

    const sources = question.sources ?? []
    const outline = question.outlineItems ?? []
    if (sources.length === 0 && outline.length === 0 && meta.length === 0) return null

    return (
        <div className="space-y-3">
            {sources.length > 0 && (
                <div className="pt-3 border-t border-primary/10">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2 mb-2">
                        <Library className="h-3.5 w-3.5 stroke-2" /> Where this comes from
                    </p>
                    <ul className="space-y-1">
                        {sources.map(src => {
                            // "NIST SP 800-53 Rev 5 | SA-4 Acquisition Process"
                            const [standard, ...rest] = src.split("|")
                            return (
                                <li key={src} className="text-sm text-foreground/70 leading-relaxed">
                                    <span className="text-foreground/90 font-medium">{standard.trim()}</span>
                                    {rest.length > 0 && (
                                        <span className="text-muted-foreground"> · {rest.join("|").trim()}</span>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            {(outline.length > 0 || meta.length > 0) && (
                <div className="pt-3 border-t border-primary/10 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {outline.map(item => (
                        <span
                            key={item}
                            className="font-mono text-[10px] tracking-wider text-secondary border border-secondary/25 rounded px-2 py-0.5"
                            title="2024 CISSP outline objective"
                        >
                            {item}
                        </span>
                    ))}
                    {meta.length > 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {meta.join(" · ")}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

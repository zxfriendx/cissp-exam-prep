"use client"

import { useState } from "react"
import { ChevronDown, Building2 } from "lucide-react"
import type { Stimulus } from "@/lib/content"
import { Emphasis } from "@/components/quiz/emphasis"
import { cn } from "@/lib/utils"

/**
 * The scenario a question is set in, printed above the question the way the
 * book prints a testlet stimulus.
 *
 * This replaces the "Scenario" dialog that used to show the domain's ONE case
 * study. That framing came from the v1 bank, where a domain was a single
 * organization and fifty questions about it. The v2 bank is 133 scenarios
 * across the eight domains -- fifteen to nineteen organizations per domain,
 * three to six questions each -- so the scenario belongs to the question, not
 * to the domain, and it has to be on screen while the question is answered:
 * the stems name systems and people that exist nowhere else.
 */

interface ScenarioPanelProps {
    stimulus: Stimulus
    /** Which question of this scenario is on screen, and how many are in this set. */
    position?: { index: number; total: number }
    /** The previous question shared this scenario, so it opens folded. */
    continued?: boolean
}

const PROFILE_ROWS = [
    ["organization", "Organization"],
    ["regime", "Regime"],
    ["environment", "Environment"],
    ["state", "State"],
] as const

export function ScenarioPanel({ stimulus, position, continued = false }: ScenarioPanelProps) {
    const [open, setOpen] = useState(!continued)
    const profile = stimulus.profile ?? {}
    const rows = PROFILE_ROWS.filter(([key]) => profile[key])

    return (
        <section
            className="rounded-lg border-2 border-secondary/25 bg-muted/15 overflow-hidden"
            aria-label="The scenario this question is set in"
        >
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-start gap-3 px-6 py-4 text-left hover:bg-muted/25 transition-colors"
            >
                <Building2 className="h-4 w-4 mt-1 shrink-0 stroke-2 text-secondary" />
                <span className="flex-1 min-w-0">
                    <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        {continued ? "Same scenario" : "Scenario"}
                        {position && position.total > 1 && (
                            <span className="text-secondary">
                                {" · "}Question {position.index} of {position.total}
                            </span>
                        )}
                    </span>
                    <span className="block text-base font-semibold text-primary leading-snug mt-0.5">
                        {stimulus.title}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 mt-1 shrink-0 stroke-2 text-muted-foreground transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open && (
                <div className="px-6 pb-6 pt-1 space-y-5 border-t-2 border-secondary/15">
                    <p className="text-[15px] leading-relaxed text-foreground/85 pt-4">
                        <Emphasis text={stimulus.text} />
                    </p>
                    {rows.length > 0 && (
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr] text-sm">
                            {rows.map(([key, label]) => (
                                <div key={key} className="contents">
                                    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground pt-1">
                                        {label}
                                    </dt>
                                    <dd className="text-foreground/75 leading-relaxed">{profile[key]}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
            )}
        </section>
    )
}

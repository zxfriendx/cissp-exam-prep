"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { getDomainById, getStimulus, type Stimulus } from "@/lib/content"
import { blueprintFor } from "@/lib/blueprint"
import { splitCaseStudy } from "@/lib/text"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Emphasis } from "@/components/quiz/emphasis"
import { ArrowLeft, PlayCircle, BookOpen, ShieldCheck, EyeOff, Building2 } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

// Custom markdown components for better formatting
const markdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="text-3xl font-semibold text-primary mb-6 mt-8 pb-3 border-b-2 border-primary/20">
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-2xl font-semibold text-primary mb-4 mt-8">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-xl font-semibold text-secondary mb-3 mt-6">
            {children}
        </h3>
    ),
    h4: ({ children }) => (
        <h4 className="text-lg font-semibold text-foreground mb-2 mt-4">
            {children}
        </h4>
    ),
    p: ({ children }) => (
        <p className="text-base leading-relaxed mb-4 text-foreground/90">
            {children}
        </p>
    ),
    ul: ({ children }) => (
        <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-foreground/90">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-foreground/90">
            {children}
        </ol>
    ),
    li: ({ children }) => (
        <li className="leading-relaxed pl-1">
            {children}
        </li>
    ),
    strong: ({ children }) => (
        <strong className="font-semibold text-primary">
            {children}
        </strong>
    ),
    em: ({ children }) => (
        <em className="italic text-secondary">
            {children}
        </em>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-secondary/50 pl-6 py-2 my-4 bg-muted/20 rounded-r-lg italic text-foreground/80">
            {children}
        </blockquote>
    ),
    code: ({ children }) => (
        <code className="bg-muted/40 px-2 py-0.5 rounded text-sm font-mono text-secondary border border-primary/10">
            {children}
        </code>
    ),
    pre: ({ children }) => (
        <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto mb-4 border-2 border-primary/10">
            {children}
        </pre>
    ),
    hr: () => (
        <hr className="my-8 border-t-2 border-primary/15" />
    ),
    // The case studies' "Related reading" block links out to the white paper
    // and worksheet; the base styles reset anchors to plain text.
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
            {children}
        </a>
    ),
}

export default function StudyPageClient() {
    const params = useParams()
    const domainId = params.domainId as string
    const domain = useMemo(() => getDomainById(domainId), [domainId])
    const blueprint = blueprintFor(domainId)

    // The bank's caseStudy field is: a domain overview paragraph, then
    // "Case Study: ..." (the scenario the stems refer to), then an analysis /
    // key-lessons section. The printed examination prints the scenario before
    // the questions and holds the analysis back until after the answer key,
    // because it telegraphs several answers. Same split here.
    const { overview, scenario, debrief } = useMemo(() => {
        const text = domain?.caseStudy ?? ''
        const at = text.indexOf('Case Study:')
        const overviewText = at !== -1 ? text.slice(0, at).trim() : ''
        const body = at !== -1 ? text.slice(at).trim() : text
        const split = splitCaseStudy(body)
        return { overview: overviewText, scenario: split.scenario, debrief: split.debrief }
    }, [domain])

    // The scenarios this domain's quiz actually uses, in the order it meets
    // them. The case study above is one organization; the questions are set in
    // fifteen-odd others, and this page is where a reader can read them without
    // being asked a question about them.
    const scenarios = useMemo<Stimulus[]>(() => {
        const seen = new Set<string>()
        const out: Stimulus[] = []
        for (const q of domain?.questions ?? []) {
            const stim = getStimulus(q.stimulusId)
            if (stim && !seen.has(stim.id)) {
                seen.add(stim.id)
                out.push(stim)
            }
        }
        return out
    }, [domain])

    if (!domain) {
        return (
            <div className="container max-w-4xl mx-auto p-4 min-h-screen flex flex-col items-center justify-center gap-4">
                <p>No such domain.</p>
                <Button asChild>
                    <Link href="/practice/">Return Home</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header Navigation */}
            <div className="border-b border-primary/15 bg-background sticky top-0 z-10">
                <div className="container max-w-5xl mx-auto px-6 sm:px-10">
                    <div className="flex items-center justify-between h-16">
                        <Button variant="ghost" size="sm" asChild className="font-medium">
                            <Link href="/practice/">
                                <ArrowLeft className="mr-2 h-4 w-4 stroke-2" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container max-w-5xl mx-auto px-6 sm:px-10 py-12">
                {/* Domain Introduction Section */}
                <div className="mb-12 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/20">
                            <ShieldCheck className="h-8 w-8 text-primary stroke-2" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-4xl font-semibold tracking-tight text-primary">
                                    {domain.title}
                                </h1>
                                <Badge variant="secondary" className="font-mono text-xs bg-muted/60 text-primary border border-primary/20">
                                    {domainId.replace('domain_', 'Domain ')}
                                </Badge>
                                {blueprint && (
                                    <Badge variant="secondary" className="font-mono text-xs bg-muted/60 text-secondary border border-secondary/30">
                                        {blueprint.weight}% of the exam
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <BookOpen className="h-5 w-5 stroke-2" />
                                <span className="text-sm font-medium">
                                    Case study &amp; learning material &middot; {domain.questions.length} questions
                                    {scenarios.length > 0 && <> &middot; {scenarios.length} scenarios</>}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Domain Overview Card */}
                    {overview && (
                        <Card className="border-2 border-primary/20 bg-muted/10">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold text-primary">
                                    Domain Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-base leading-relaxed text-foreground/90">
                                    {overview}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Scenario */}
                <div className="mb-8">
                    <Card className="border-2 border-primary/15 shadow-lg">
                        <CardHeader className="border-b-2 border-primary/10 bg-muted/20">
                            <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2">
                                <BookOpen className="h-6 w-6 stroke-2" />
                                The domain case study
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground pt-2">
                                Background for the domain as a whole. The practice questions are not set in
                                it — each one carries its own scenario, printed above the question.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-10 px-8 sm:px-12">
                            <div className="max-w-none">
                                <ReactMarkdown components={markdownComponents}>
                                    {scenario}
                                </ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* The scenarios the questions are actually set in */}
                {scenarios.length > 0 && (
                    <section className="mb-8 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight text-primary flex items-center gap-2">
                                <Building2 className="h-6 w-6 stroke-2" />
                                The {scenarios.length} scenarios in this domain
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                One organization each, three to six questions apiece in the printed
                                examination. Nothing here gives an answer away — the scenario is what the
                                question hands you before it asks.
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {scenarios.map(stim => (
                                <details key={stim.id} className="rounded-lg border-2 border-primary/15 bg-background">
                                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-primary">
                                        {stim.title}
                                    </summary>
                                    <div className="px-4 pb-5 pt-1 border-t-2 border-primary/10 space-y-3">
                                        <p className="text-sm leading-relaxed text-foreground/80 pt-3">
                                            <Emphasis text={stim.text} />
                                        </p>
                                        {stim.profile?.organization && (
                                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                                {stim.profile.organization}
                                            </p>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {/* Debrief, held back like the back of the book */}
                {debrief && (
                    <details className="mb-12 rounded-xl border-2 border-secondary/25 bg-background group">
                        <summary className="cursor-pointer list-none px-8 py-5 flex items-center gap-3 text-secondary font-semibold">
                            <EyeOff className="h-5 w-5 stroke-2 shrink-0" />
                            <span>Case study debrief</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                &middot; read after you have attempted the questions; it gives several answers away
                            </span>
                        </summary>
                        <div className="px-8 sm:px-12 pb-10 pt-2 border-t-2 border-secondary/15">
                            <ReactMarkdown components={markdownComponents}>
                                {debrief}
                            </ReactMarkdown>
                        </div>
                    </details>
                )}

                {/* Action Section */}
                <div className="flex justify-center">
                    <Button size="lg" asChild className="w-full sm:w-auto px-8 py-6 text-base font-semibold shadow-lg">
                        <Link href={`/quiz/${domainId}`}>
                            <PlayCircle className="mr-2 h-5 w-5 stroke-2" />
                            Take Practice Quiz
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

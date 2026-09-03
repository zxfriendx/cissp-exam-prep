"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { getDomainById } from "@/lib/content"
import { blueprintFor } from "@/lib/blueprint"
import { parseCaseStudy } from "@/lib/text"
import { CaseStudyBody } from "@/components/quiz/case-study"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, PlayCircle, BookOpen, ShieldCheck, EyeOff } from "lucide-react"
import Link from "next/link"

export default function StudyPageClient() {
    const params = useParams()
    const domainId = params.domainId as string
    const domain = useMemo(() => getDomainById(domainId), [domainId])
    const blueprint = blueprintFor(domainId)

    // Overview, title, scenario and the held-back analysis, split the way the
    // printed examination splits them (src/lib/text.ts).
    const doc = useMemo(() => parseCaseStudy(domain?.caseStudy ?? ''), [domain])

    if (!domain) {
        return (
            <div className="container max-w-4xl mx-auto p-4 min-h-screen flex flex-col items-center justify-center gap-4">
                <p>No such domain.</p>
                <Button asChild>
                    <Link href="/">Return Home</Link>
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
                            <Link href="/">
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
                                    Case Study &amp; Learning Material &middot; {domain.questions.length} questions
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Domain Overview Card */}
                    {doc.overview && (
                        <Card className="border-2 border-primary/20 bg-muted/10">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold text-primary">
                                    Domain Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-base leading-relaxed text-foreground/90">
                                    {doc.overview}
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
                                The scenario these questions are set in
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground pt-2">
                                Read it first and keep it in mind. The question stems name systems and people
                                that only appear here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-10 px-6 sm:px-12">
                            <CaseStudyBody kicker="Case study" title={doc.title} markdown={doc.scenario} />
                        </CardContent>
                    </Card>
                </div>

                {/* Debrief, held back like the back of the book */}
                {doc.debrief && (
                    <details className="mb-12 rounded-xl border-2 border-secondary/25 bg-background group">
                        <summary className="cursor-pointer list-none px-8 py-5 flex items-center gap-3 text-secondary font-semibold">
                            <EyeOff className="h-5 w-5 stroke-2 shrink-0" />
                            <span>Case study debrief</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                &middot; read after you have attempted the questions; it gives several answers away
                            </span>
                        </summary>
                        <div className="px-6 sm:px-12 pb-10 pt-4 border-t-2 border-secondary/15">
                            <CaseStudyBody markdown={doc.debrief} />
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

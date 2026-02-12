"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getDomainById } from "@/lib/content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, PlayCircle, BookOpen, ShieldCheck } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

export default function StudyPageClient() {
    const params = useParams()
    const domainId = params.domainId as string
    const [domain, setDomain] = useState<any>(null)
    const [domainOverview, setDomainOverview] = useState<string>('')
    const [caseStudyContent, setCaseStudyContent] = useState<string>('')

    useEffect(() => {
        if (domainId) {
            const d = getDomainById(domainId)
            setDomain(d)

            // Split the case study into overview and actual case study
            if (d?.caseStudy) {
                const caseStudyText = d.caseStudy

                // Find where "Case Study:" starts
                const caseStudyIndex = caseStudyText.indexOf('Case Study:')

                if (caseStudyIndex !== -1) {
                    // Extract overview (everything before "Case Study:")
                    const overview = caseStudyText.substring(0, caseStudyIndex).trim()
                    // Extract case study (from "Case Study:" onwards)
                    const caseStudy = caseStudyText.substring(caseStudyIndex).trim()

                    setDomainOverview(overview)
                    setCaseStudyContent(caseStudy)
                } else {
                    // Fallback if no "Case Study:" found
                    setDomainOverview('')
                    setCaseStudyContent(caseStudyText)
                }
            }
        }
    }, [domainId])

    // Custom markdown components for better formatting
    const markdownComponents: Components = {
        h1: ({ children }) => (
            <h1 className="text-3xl font-semibold text-primary mb-6 mt-8 pb-3 border-b-2 border-primary/20" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                {children}
            </h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-primary mb-4 mt-8" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                {children}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-secondary mb-3 mt-6" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                {children}
            </h3>
        ),
        h4: ({ children }) => (
            <h4 className="text-lg font-semibold text-foreground mb-2 mt-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
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
    }

    if (!domain) {
        return (
            <div className="container max-w-4xl mx-auto p-4 min-h-screen flex items-center justify-center">
                <p>Loading domain content...</p>
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
                                <h1 className="text-4xl font-semibold tracking-tight text-primary" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                                    {domain.title}
                                </h1>
                                <Badge variant="secondary" className="font-mono text-xs bg-muted/60 text-primary border border-primary/20">
                                    {domainId.replace('domain_', 'Domain ')}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <BookOpen className="h-5 w-5 stroke-2" />
                                <span className="text-sm font-medium">Case Study & Learning Material</span>
                            </div>
                        </div>
                    </div>

                    {/* Domain Overview Card */}
                    {domainOverview && (
                        <Card className="border-2 border-primary/20 bg-[rgb(var(--light-blue))]/10">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-semibold text-primary" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                                    Domain Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-base leading-relaxed text-foreground/90">
                                    {domainOverview}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Case Study Content Section */}
                <div className="mb-12">
                    <Card className="border-2 border-primary/15 shadow-lg">
                        <CardHeader className="border-b-2 border-primary/10 bg-muted/20">
                            <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                                <BookOpen className="h-6 w-6 stroke-2" />
                                Case Study
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground pt-2">
                                Review this real-world scenario to understand practical applications of the domain concepts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-10 px-8 sm:px-12">
                            <div className="max-w-none">
                                <ReactMarkdown components={markdownComponents}>
                                    {caseStudyContent}
                                </ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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

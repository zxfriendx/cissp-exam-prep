"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getDomainById } from "@/lib/content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, PlayCircle, BookOpen } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'

export default function StudyPageClient() {
    const params = useParams()
    const domainId = params.domainId as string
    const [domain, setDomain] = useState<any>(null)

    useEffect(() => {
        if (domainId) {
            const d = getDomainById(domainId)
            setDomain(d)
        }
    }, [domainId])

    if (!domain) {
        return (
            <div className="container max-w-4xl mx-auto p-4 min-h-screen flex items-center justify-center">
                <p>Loading domain content...</p>
            </div>
        )
    }

    return (
        <div className="container max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
            <div className="flex items-center justify-between py-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>

            <div className="space-y-6 pb-12">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{domain.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm font-medium">Case Study & Learning Material</span>
                    </div>
                </div>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle>Case Study</CardTitle>
                        <CardDescription>
                            Review the following case study to understand the core concepts of this domain.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
                        <ReactMarkdown>
                            {domain.caseStudy}
                        </ReactMarkdown>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button size="lg" asChild className="w-full md:w-auto">
                        <Link href={`/quiz/${domainId}`}>
                            <PlayCircle className="mr-2 h-5 w-5" />
                            Take Practice Quiz
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

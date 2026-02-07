"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, BookOpen } from "lucide-react"
import Link from "next/link"

interface DomainCardProps {
    id: string
    title: string
    questionCount: number
    description: string
}

export function DomainCard({ id, title, questionCount, description }: DomainCardProps) {
    return (
        <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                        Domain {id.replace('domain_', '')}
                    </Badge>
                </div>
                <CardDescription>{questionCount} Questions</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                {/* Placeholder for progress bar later */}
                <p className="text-sm text-muted-foreground">
                    {description}
                </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-4 border-t bg-muted/20">
                <Button asChild className="w-full font-semibold shadow-sm">
                    <Link href={`/quiz/${id}`}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Quiz
                    </Link>
                </Button>
                <Button variant="secondary" className="w-full hover:bg-background/80 hover:border-primary/30 border border-transparent transition-all" asChild>
                    <Link href={`/study/${id}`}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Review Case Study
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

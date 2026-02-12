"use client"

import { useState } from "react"
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
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            className="flex flex-col h-full border-2 border-primary/15 hover:border-secondary/40 hover:shadow-lg transition-all duration-300 bg-background group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            }}
        >
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-3 mb-1">
                    <CardTitle className="text-lg leading-tight font-semibold text-primary" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                        {title}
                    </CardTitle>
                    <Badge
                        variant="secondary"
                        className="shrink-0 font-mono text-xs bg-muted/60 text-primary border border-primary/20"
                    >
                        {id.replace('domain_', '')}
                    </Badge>
                </div>
                <CardDescription className="text-sm font-medium">{questionCount} Questions</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow pb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-5 border-t border-primary/10">
                <Button asChild className="w-full font-medium shadow-sm bg-primary hover:bg-secondary transition-colors">
                    <Link href={`/quiz/${id}`}>
                        <PlayCircle className="mr-2 h-4 w-4 stroke-2" />
                        Start Quiz
                    </Link>
                </Button>
                <Button
                    variant="outline"
                    className="w-full font-medium border-2 border-primary/20 hover:border-secondary/50 hover:bg-muted/30 transition-all"
                    asChild
                >
                    <Link href={`/study/${id}`}>
                        <BookOpen className="mr-2 h-4 w-4 stroke-2" />
                        Review Case Study
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

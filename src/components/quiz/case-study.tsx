"use client"

import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { cn } from "@/lib/utils"

// The case studies come out of parseCaseStudy() as markdown: `###` section
// headings ("Key Events Leading to the Breach", "Analysis", "Key Lessons"),
// numbered steps with bold run-in labels, bullets, and links in the "Related
// reading" tail. No typography plugin is installed and the base styles reset
// headings and anchors to plain text, so everything is set here. The
// hierarchy mirrors the printed examination's page: a kicker, the title, a
// lede, bold sans section heads, copper numerals on the steps.
export const caseStudyMarkdown: Components = {
    h1: ({ children }) => (
        <h2 className="mt-8 mb-3 text-xl font-semibold tracking-tight text-primary">{children}</h2>
    ),
    h2: ({ children }) => (
        <h2 className="mt-8 mb-3 text-xl font-semibold tracking-tight text-primary">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="mt-9 mb-3 flex items-center gap-3 text-[1.0625rem] font-semibold leading-snug text-primary before:h-0.5 before:w-5 before:shrink-0 before:content-[''] before:bg-[rgb(var(--vault-copper))]">
            {children}
        </h3>
    ),
    h4: ({ children }) => (
        <h4 className="mt-6 mb-2 text-base font-semibold text-primary">{children}</h4>
    ),
    p: ({ children }) => (
        <p className="mb-4 text-base leading-7 text-foreground/85 last:mb-0">{children}</p>
    ),
    ol: ({ children }) => (
        <ol className="mb-5 ml-6 list-decimal list-outside space-y-3 marker:font-semibold">{children}</ol>
    ),
    ul: ({ children }) => (
        <ul className="mb-5 ml-6 list-disc list-outside space-y-2">{children}</ul>
    ),
    li: ({ children }) => (
        <li className="pl-1 leading-7 text-foreground/85 marker:text-[rgb(var(--vault-copper))] [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
        </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline decoration-secondary/40 underline-offset-4 hover:decoration-secondary"
        >
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-4 border-l-2 border-secondary/50 pl-5 italic text-foreground/80">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-8 border-t border-primary/15" />,
}

interface CaseStudyBodyProps {
    /** Markdown from parseCaseStudy(). With a title, its first paragraph is set as the lede. */
    markdown: string
    /** Small-caps label above the title, e.g. "Case study". */
    kicker?: string
    /** The case study's title, without the "Case Study:" label. */
    title?: string
    className?: string
}

export function CaseStudyBody({ markdown, kicker, title, className }: CaseStudyBodyProps) {
    return (
        <article
            className={cn(
                "max-w-[68ch]",
                // the lede: the first paragraph after the title, a size up and in full ink
                title && "[&>h2+p]:text-lg [&>h2+p]:leading-8 [&>h2+p]:text-foreground",
                className,
            )}
        >
            {kicker && <span className="vault-label">{kicker}</span>}
            {title && (
                <h2 className="mt-4 mb-6 text-2xl font-semibold leading-tight tracking-tight text-primary sm:text-[1.75rem]">
                    {title}
                </h2>
            )}
            <ReactMarkdown components={caseStudyMarkdown}>{markdown}</ReactMarkdown>
        </article>
    )
}

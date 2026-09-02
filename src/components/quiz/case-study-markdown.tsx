import type { Components } from "react-markdown"

// The case studies are markdown: `###` headings, lists and, in the
// "Related reading" block, links. No typography plugin is installed, so the
// base styles reset headings and anchors to plain text. This is the minimum
// shape for the places a case study renders outside the study page, which
// has its own fuller set.
export const caseStudyMarkdown: Components = {
    h3: ({ children }) => (
        <h3 className="text-lg font-semibold text-secondary mt-6 mb-2">{children}</h3>
    ),
    p: ({ children }) => <p className="mb-3">{children}</p>,
    ul: ({ children }) => (
        <ul className="list-disc list-outside ml-6 mb-3 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-outside ml-6 mb-3 space-y-1">{children}</ol>
    ),
    strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
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

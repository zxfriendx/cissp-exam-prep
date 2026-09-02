import { Fragment } from "react"

// The bank's prose carries single-asterisk emphasis (*accountable*, *of*). The
// printed examination renders it as italics; printed literally it reads as a
// typo. Same pattern as build_pdf.py's EMPH_RE: an asterisk that is not
// followed by whitespace, up to the next asterisk not preceded by whitespace,
// so a stray "*" or a wildcard like "*.example.com" stays literal.
const EMPH_RE = /\*(?!\s)([^*\n]+?)(?<!\s)\*/

/** Render a bank string with *emphasis* as <em>, everything else as text. */
export function Emphasis({ text }: { text: string }) {
    const parts = (text || "").split(EMPH_RE)
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
            )}
        </>
    )
}

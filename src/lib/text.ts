/**
 * Text helpers shared, in spirit, with the printed products. They mirror the
 * equivalents in content-pipeline/video_pipeline/cissp/build_pdf.py so the app
 * and the book make the same decisions about the same bank.
 */

// Question stems name people and systems ("Meridian Financial", "TechSafe
// Solutions") that only exist in their domain's case study, so the scenario
// has to be readable during the quiz. Its analysis section, though, telegraphs
// several answers, so the printed examination holds it back until after the
// answer key. Everything from the first analysis-style heading is debrief.
//
// The case studies are the printed bank's, in the loose markdown build_pdf.py's
// md_block() reads: **bold** run-in labels, `1.` steps with indented
// continuations, `*` bullets, and bare short lines acting as headings ("Key
// Events Leading to the Breach", "The Attack:", "Key Lessons:"). Domain 1 opens
// its analysis with "Analysis Using CISSP Domain 1 Principles"; domains 2 to 8
// open theirs with a bold `**Analysis:**` line, and domain 6 with "The Failure
// Analysis:". The builder's DEBRIEF_RE matches only the first form, so the
// book prints the other two before the questions (pdf-parity-audit, flag 2);
// the app holds all three back, which is the intent.
const DEBRIEF_RE = /^\s*(?:#{1,6}\s*)?(?:\*\*)?((?:The Failure )?Analysis\b|Lessons Learned|Key Lessons|Key Takeaways|Conclusion|Key Findings)/i;

export interface CaseStudySplit {
    /** Safe to read before answering. */
    scenario: string;
    /** Read after the key; empty when the case study has no analysis section. */
    debrief: string;
}

export function splitCaseStudy(text: string): CaseStudySplit {
    const lines = (text || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (DEBRIEF_RE.test(line) && line.trim().length < 80) {
            return {
                scenario: lines.slice(0, i).join("\n").trim(),
                debrief: lines.slice(i).join("\n").trim(),
            };
        }
    }
    return { scenario: (text || "").trim(), debrief: "" };
}

const LIST_RE = /^\s*(?:[*\-•]|\d+[.)])\s+/;
const BOLD_LINE_RE = /^\s*\*\*([^*]+?)\*\*:?\s*$/;

/**
 * Promote the bank's bare heading lines to `###` so react-markdown sets them
 * as headings instead of paragraphs. Same heuristic as the builder's
 * md_block(): a short line that is not a list item, not an indented
 * continuation, and does not end a sentence is a heading. A line that holds
 * only a bold run ("**Analysis:**") is a heading too. Trailing colons are
 * typesetting, not wording, and are dropped from the heading text.
 */
export function caseStudyToMarkdown(text: string): string {
    return (text || "")
        .split("\n")
        .map(raw => {
            const line = raw.trimEnd();
            const s = line.trim();
            if (!s || /^\s+\S/.test(raw) || LIST_RE.test(line) || /^#{1,6}\s/.test(s)) return line;
            const bold = BOLD_LINE_RE.exec(s);
            if (bold) return `### ${bold[1].replace(/:$/, "").trim()}`;
            const heading = s.length < 80 && !/[.!?]$/.test(s) && !/[.!?] /.test(s);
            return heading ? `### ${s.replace(/:$/, "")}` : line;
        })
        .join("\n");
}

export interface CaseStudyDoc {
    /** The domain overview paragraph that precedes the "Case Study:" line. */
    overview: string;
    /** The title without its "Case Study:" label; empty when the text has none. */
    title: string;
    /** Markdown. Safe to read before answering. */
    scenario: string;
    /** Markdown. Read after the key; empty when there is no analysis section. */
    debrief: string;
}

/**
 * The bank's caseStudy field is: a domain overview paragraph, then a
 * "Case Study: ..." title line, then the scenario the stems refer to, then the
 * analysis. This takes it apart the way the printed examination does and
 * returns markdown ready to render.
 */
export function parseCaseStudy(text: string): CaseStudyDoc {
    const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
    const at = lines.findIndex(l => /^\s*Case Study:/i.test(l));
    const overview = at === -1 ? "" : lines.slice(0, at).join("\n").trim();
    const title = at === -1 ? "" : lines[at].replace(/^\s*Case Study:\s*/i, "").trim();
    const body = (at === -1 ? lines : lines.slice(at + 1)).join("\n").trim();
    const split = splitCaseStudy(body);
    return {
        overview,
        title,
        scenario: caseStudyToMarkdown(split.scenario),
        debrief: caseStudyToMarkdown(split.debrief),
    };
}

/**
 * Older banks restated the answer text and an "Explanation:" label before the
 * reasoning. The current bank does not, but a quiz persisted in localStorage
 * before the bank swap still carries the old question objects, and the UI
 * prints the answer itself, so drop the duplicate lead-in either way.
 */
export function cleanExplanation(text: string, correctText?: string): string {
    let t = (text || "").trim();
    const marker = "Explanation:";
    const at = t.indexOf(marker);
    if (at !== -1) {
        t = t.slice(at + marker.length).trim();
    } else if (correctText) {
        const nl = t.indexOf("\n");
        if (nl !== -1) {
            const first = t.slice(0, nl).trim().replace(/\.$/, "").toLowerCase();
            const answer = correctText.trim().replace(/\.$/, "").toLowerCase();
            if (first === answer) t = t.slice(nl + 1).trim();
        }
    }
    return t.replace(/\n{2,}/g, "\n").trim();
}

/** Option letters in A-D order, whatever order the JSON object carries them in. */
export function orderedOptions(options: Record<string, string>): [string, string][] {
    return Object.entries(options).sort(([a], [b]) => a.localeCompare(b));
}

/** Unbiased in-place Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** "domain_3_q12" -> "domain_3"; undefined when the id is not in that form. */
export function domainIdOf(questionId: string): string | undefined {
    const m = /^(domain_\d+)_q\d+$/.exec(questionId);
    return m ? m[1] : undefined;
}

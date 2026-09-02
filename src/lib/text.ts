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
// Since 2026-09-02 the eight case studies share one shape, as `###` headings:
// Context, What went wrong, What a practitioner does differently, Outcome,
// What the exam tests, Related reading. The first two are the scenario; the
// rest is analysis ("What the exam tests" names answers), so the split lands
// on "What a practitioner does differently". The builder's DEBRIEF_RE in
// build_pdf.py does not know this heading yet; add it there before the
// pipeline bank takes these case studies, or the book will print the analysis.
const DEBRIEF_RE = /^\s*(?:#{1,6}\s*)?(Analysis\b|Lessons Learned|Key Lessons|Key Takeaways|Conclusion|Key Findings|What a practitioner does differently)/i;

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

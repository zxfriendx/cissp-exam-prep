# PDF parity audit — 2026-09-02

Does the web app match the printed practice examination, question for question and feature for feature? This is the check, what it found, and what was changed as a result.

## What was compared

| Artifact | Path | Notes |
|---|---|---|
| Printed PDF | `/data/video/pipeline/cissp_product/eight-domains-practice-examination.pdf` | *The Eight Domains — Practice Examination*, 439 questions, Edition 2026-09-01, 219 pages, rendered 2026-09-01 01:33 UTC by HeadlessChrome |
| PDF source bank | `/data/video/pipeline/_product_audit_2026-08-29/content.rekeyed.json` | 816,133 B, 2026-08-31 18:15. Not in git. The builder's hard-coded `QUESTIONS` path |
| Builder | `content-pipeline/video_pipeline/cissp/build_pdf.py` | branch `cissp-product-fixes`, HEAD `824b55d` |
| Exam weights | `content-pipeline/reference/isc2/cissp_outline_2024.json` | the 2024 outline; 16/10/13/13/13/12/13/10 |
| App bank, before | `src/data/content.json` at `28e067c` | 271,613 B, dated 2026-02-14, the same size as `content.rekeyed.json.pre-rekey` |
| App bank, after | `src/data/content.json` at `bd13c88` | byte-identical to the PDF source bank |

Method: `pdftotext` on the PDF, parsed into stems, options, the answer-key page and the "Answers explained" section (439 of each). Stems normalised (lower-case, punctuation and whitespace collapsed) and compared three ways: PDF text against its source JSON, app bank against the JSON by id, and app bank against the JSON by normalised stem. Scripts and intermediate output are in `~/.claude/jobs/cdc44193/tmp/pdf-parity/` (`audit.py`, `audit.json`, `exam_raw.txt`).

The last staged learn-site build (`~/.cache/learn-build/cissp-exam-prep/`, 2026-09-01 01:35) already carried the new bank, because `securepathdigital-site/stage-learn.sh` copies the pipeline file over `content.json` before building. The git repository did not. So the live site may already have been current on questions; the repository, the runtime shuffle and the UI were not.

## Counts per domain

| Domain | App before | PDF | App after |
|---|---:|---:|---:|
| 1 Security and Risk Management (16%) | 50 | 50 | 50 |
| 2 Asset Security (10%) | 60 | 60 | 60 |
| 3 Security Architecture and Engineering (13%) | 50 | 50 | 50 |
| 4 Communication and Network Security (13%) | 70 | 70 | 70 |
| 5 Identity and Access Management (IAM) (13%) | 50 | 50 | 50 |
| 6 Security Assessment and Testing (12%) | 50 | 50 | 50 |
| 7 Security Operations (13%) | 49 | 49 | 49 |
| 8 Software Development Security (10%) | 60 | 60 | 60 |
| **Total** | **439** | **439** | **439** |

Same ids, same counts, same order. Nothing was added or dropped; the whole bank was revised in place.

## Is the JSON what was printed?

Yes. All 439 stems, all 1,756 options, all 439 key letters and all 439 explanations in the PDF match `content.rekeyed.json` once whitespace is ignored. A stricter first pass reported 18 stems, 1 option and 101 explanations as different; every one of those was a `pdftotext` line-wrap artifact (hyphenated words rejoined across a page break, the case study's numbered list glued onto question 1) and disappears under whitespace-free comparison.

## App (before) against the PDF

By id, the two banks are the same 439 items, but the revision touched almost everything:

| Field | Questions changed |
|---|---:|
| Stem rewritten | 434 of 439 |
| Option set changed | 426 |
| Correct-answer **text** changed | 423 |
| Explanation changed | 439 (avg 117 chars, now avg 976; min 671, max 1,523) |
| Key **letter** changed | 333 |
| Identical in every field | 0 |

By normalised stem: 434 PDF questions have no match in the old app, 434 old app questions have no match in the PDF, 0 questions moved id, 0 duplicate stems in either bank. Only five stems survived verbatim, and even those had new options and explanations.

The old answer key was A for 361 of 439 questions (82%), and A for 100% of domains 3 to 8. The app hid this behind a runtime shuffle; a printed book cannot, which is what the rekey was for. The new key is A 109, B 111, C 109, D 110.

**Questions in the PDF missing from the app**: in effect all 434 rewritten ones, imported by replacing the bank wholesale (ids kept, so saved progress and per-domain stats are unaffected).
**Questions in the app not in the PDF**: the 434 pre-revision versions, superseded. None kept.
**Matched questions whose answer, options, explanation or domain differ**: all 439 differ in at least one field, none changed domain. Every difference was resolved in favour of the PDF. No case was found where the PDF is wrong; note that this audit is structural (does the app carry what the book carries), not an editorial review of 439 items.

## Feature gaps between the book and the app

What the printed examination does that the app did not, and what was done about it.

| Book | App before | Now |
|---|---|---|
| Options fixed in A-D order, key balanced; explanations argue by letter ("A secures the path, not the login") | Options shuffled at runtime, so 438 of 439 new explanations would have contradicted the screen | Shuffle removed, letters shown, order identical to the book (`9c8aa57`) |
| `*emphasis*` rendered as italics | Would have printed the asterisks (20 explanations, 1 stem) | Rendered with the builder's own pattern; wildcards and lone asterisks stay literal |
| "Answers explained" leads with `D — <answer text>` then the reasoning | Old explanation field restated the answer plus an `Explanation:` label and the UI printed it verbatim | Cleaned; also handles a quiz persisted before the swap |
| Scenario before the questions; **analysis / key lessons held back until after the key** | The full case study, analysis included, was in the quiz modal and on the study page | Split the same way the builder splits it: scenario during the quiz, debrief on the results page and folded on the study page (`9c8aa57`, `c27710b`) |
| Domain openers and contents state `16% of the exam` etc. | No weights anywhere | Weights on domain cards, study headers and results; source `src/lib/blueprint.ts` |
| Domain names spelled per the outline (`and`, not `&`) | `Security Architecture & Engineering`, `Identity & Access Management (IAM)` | Outline spelling everywhere, JSON untouched |
| A sit-down examination: mark a separate sheet, key at the back, 1 min 15 s per question | Immediate feedback only; no exam mode, no pace | Practice Examination: 50/100 blueprint-weighted mixed sets or the full book in order, marking deferred to the end, pace budget shown and time taken reported (`66a4425`, `c27710b`) |
| Answer key grid and "Answers explained" section | Results page showed a score only | Results page lists every question with options, your answer, the key, the explanation (missed ones open), score by domain, and the case study debriefs |
| Retake | "Retry" reloaded the page, which re-showed the persisted results | Retake restarts the same set |

Also fixed on the way, both latent: `getQuestionsForDomain` sorted the bank's own array in place, so one Weakness Hunter run scrambled every later domain quiz; and `/quiz/weakness-hunter` was not in `generateStaticParams`, so a reload on it 404s in the static export (`/quiz/exam` added alongside).

## What the book still has that the app does not

- A standalone all-439 answer-key page. The results page is the key for whatever set you sat; there is no single grid to print.
- Page numbers and a contents page, which have no on-screen equivalent.
- A running clock during the examination. The app records start and finish and reports the time against the pace budget afterwards; it does not count down.
- The companion products (study guide, revision sheets) are separate deliverables and out of scope here.

## Flags for the pipeline (not fixed here)

1. **A rebuild with the current `build_pdf.py` would re-letter the key.** `prepare_questions` (canonicalise, deterministic rekey, then rotate to exactly-even per-domain targets) is applied unconditionally when the test product is built. Run against `content.rekeyed.json`, the builder's own functions change 331 key letters and 425 option orders and produce A 113 / B 112 / C 107 / D 107. The printed edition's key page says 109/111/109/110 and matches the JSON letter for letter, so the 2026-09-01 print did not pass through that step as it exists today. Because 438 explanations cite letters (114 name the key in parentheses), a rebuild that does re-key would print explanations that contradict the key. Either make the rekey a no-op on this file (canonicalise is meant to make it idempotent, but the file is not currently a fixed point) or rewrite explanations to be letter-free. Verify with a dry run before the next edition.
2. **The `**Analysis:**` block in domains 2 to 8 is printed before the questions.** The builder's debrief regex matches a line starting with `Analysis`, not `**Analysis:**`, so only "Key Lessons" is held back in those domains. The app mirrors the builder exactly so the two agree; if the analysis paragraphs give answers away, fix the regex (or the heading) upstream and both products follow.
3. `content.json` in this repository must stay byte-identical to the pipeline file; the deploy script overwrites it and asserts only on ids. Edit questions in the pipeline.

## Verification

`npm run lint`: clean (one pre-existing advisory about the inline Google Tag Manager script). `npm run build`: passes, 24 static pages. Helper functions (`apportionByWeight`, `splitCaseStudy`, `cleanExplanation`, emphasis pattern) exercised directly under Node; the exported HTML checked for the new sections. Not done: a browser walk-through, since this session has no browser.

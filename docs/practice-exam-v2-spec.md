# The Eight Domains — Practice Examination v2

**Structural specification.** Branch `cissp/exam-v2`, written 2026-09-04.

This document specifies the *shape* of the v2 product: how it is laid out, how a reader
navigates it, and what fields the question bank needs to express that. It does not write
questions. A later authoring pass writes the bank against this spec, and the pre-ship
checklist in `content-pipeline/docs/QUESTION_AUTHORING_GUIDE.md` §4 continues to govern
what an individual item may look like — nothing here relaxes it.

**v1 is frozen, not replaced.** `eight-domains-practice-examination.pdf` (439 items,
239 pages, edition 2026-09-02) must remain byte-reproducible from
`src/data/content.json` for as long as it is sold. Every schema change in §6 is additive
and invisible to the v1 builder; §6.1 states the compatibility contract and how it is
enforced.

---

## Contents

- [1. What was read, and what it says](#1-what-was-read-and-what-it-says)
- [2. How paper practice tests are actually laid out](#2-how-paper-practice-tests-are-actually-laid-out)
- [3. The headline fix: making the key and the explanation match up](#3-the-headline-fix-making-the-key-and-the-explanation-match-up)
- [4. Testlets](#4-testlets)
- [5. The v2 book architecture](#5-the-v2-book-architecture)
- [6. Data schema changes](#6-data-schema-changes)
- [7. Build gates](#7-build-gates)
- [8. Sizing, phasing, and what has to be authored](#8-sizing-phasing-and-what-has-to-be-authored)
- [9. Decisions still open](#9-decisions-still-open)

---

## 1. What was read, and what it says

| Source | What it contributed |
|---|---|
| `cissp-exam-prep/src/data/content.json` | The bank as shipped: schema 2, 439 items, 8 domains, per-domain case studies. Measured below. |
| `/data/video/pipeline/cissp_product/eight-domains-practice-examination.pdf` | The built book: 239pp Letter, no bookmarks, no running heads, key at p.124, explanations at p.128. |
| `content-pipeline/.../video_pipeline/cissp/build_pdf.py` | The builder: three answer-key gates, a two-pass page-marker mechanism, per-domain question numbering. |
| `_product_audit_2026-08-29/QUIZ-BOOKLET-AUDIT-2026-09-03.md` | The coverage and usability audit. Its findings 4–7 are the brief for this document. |
| `content-pipeline/docs/QUESTION_AUTHORING_GUIDE.md` | The item-level rules. Unchanged by this spec. |
| `_product_audit_2026-08-29/reddit_feedback.json` | 125 verbatim candidate quotes. Quoted by `RF-##` id throughout. |

### 1.1 Measurements taken from the current bank

Run over `src/data/content.json` (n=439):

| Quantity | Mean | Median | p10 | p90 | Range |
|---|---|---|---|---|---|
| Stem length (words) | 41.3 | 41 | 32 | 52 | 5–73 |
| Mean option length (words) | 12.5 | 12 | 9.5 | 16.5 | 2–23 |
| Explanation length (words) | 152.3 | 152 | 121 | 183 | 108–239 |

Case studies are 580–724 words each, split by the builder at the `### What a practitioner
does differently` heading into a **scenario** (245–342 words, printed at the head of the
domain) and a **debrief** (307–392 words, held behind the answer key because it names
answers).

Printed density in the v1 PDF, derived from the contents page:

| Section | Pages | Items | Items/page |
|---|---|---|---|
| Question pages (incl. 8 case-study openers, ~12pp) | 121 | 439 | 4.03 |
| Answer key | 4 | 439 | ~110 |
| Answers explained (incl. 8 debriefs, ~12pp) | 112 | 439 | 4.39 |

These densities are the basis for every page estimate in §8.

### 1.2 The three complaints this spec answers

**"The answer key and explanations are hard to match up."** Measured, the lookup for one
wrong item is: read your mark for item *n*; flip 70–120 pages to the key; find the right
domain block; scan a four-column grid that reads down-then-across; if wrong, flip again
into a 112-page explanation run that has no page number of its own in the contents beyond
its first page; count forward to item *n*; flip back to a question page you have no
running head to help you find. Three flips, an ambiguous item number (numbering restarts
at 1 in every domain, so "37" names eight different questions), and no navigational
furniture anywhere in the interior — the literal string "DOMAIN" appears 8 times in 239
pages. §3 is the fix.

**"The actual test had more short paragraphs followed by questions."** The bank is 439
standalone stems averaging 41 words. Its only stimulus is one 250–340-word case study per
domain, shared by 50–70 items, and five of the eight domains have *zero* questions that
mention their own case study's named incident. The candidate corpus describes the real
thing the same way Bill does — long, scenario-led, and drawing on more than one domain at
a time (`RF-61`: "questions on the CISSP exam are not linear, they are cross-domain";
`RF-112`: "long and mentally tiring, so I could only manage one domain"). §4 is the fix.

**"Create variations, additional stories and additional case studies."** With a caution
the corpus is emphatic about: a bank that repeats itself is abandoned (`RF-110`: "some
question kept repeating. I saw no use in doing it a third time"). Variants therefore need
explicit linkage in the data and a build gate that keeps siblings out of the same form.
§6.2 and §7 are the fix.

---

## 2. How paper practice tests are actually laid out

Sources were checked in this order: item-writing manuals published by testing boards
(primary), released exam booklets from the College Board and ETS (primary specimens),
peer-reviewed measurement literature (primary), and publisher catalogue copy (weak).
Where a convention turned out to be folklore rather than documented practice it is
flagged, because a spec that cites a rule nobody published is a spec that cannot be
argued with later.

### 2.1 Item sets are capped at a handful of items, and the reason is measurement

| Program | Stimulus | Items per set |
|---|---|---|
| NBME F-type (sequential clinical set) | unfolding vignette | 2–3 |
| INBDE (dental licensure) | "Patient Box" ± image | **3–6, capped explicitly** |
| Next Generation NCLEX case study | unfolding client record | exactly 6 |
| NBDHE | full patient case + chart + radiographs | 8–15 |
| GMAT reading comprehension | 200–350 words | 2–4 |
| AP English Literature (2012 released) | poem or prose passage | 8–14 |
| Digital SAT Reading and Writing | 25–150 words | **1 — sets abolished** |

The INBDE Item Development Guide is the clearest published statement of a cap and of why
it exists:

> "In contrast to NBDE I and II cases and testlets, which often involve ten or more items;
> INBDE itemsets and cases should only involve a small number of items (three to six)."
> — [INBDE Item Development Guide](https://jcnde.ada.org/-/media/project/ada-organization/ada/jcnde/files/inbde_item_development_guide.pdf), p. 21

The measurement argument behind it: items sharing a stimulus are not locally independent,
so scoring them as independent observations inflates reliability and distorts both item
and ability estimates. Wainer and Kiely coined "testlet" for the unit
([*JEM* 24, 1987](https://www.researchgate.net/publication/227686830_Item_Clusters_and_Computerized_Adaptive_Testing_A_Case_for_Testlets));
Sireci, Thissen and Wainer measured the damage — two 45-item reading tests built from four
testlets, where item-level coefficient alpha produced "substantial overestimates" of
reliability ([*JEM* 28(3), 1991](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-3984.1991.tb00356.x));
Yen's Q3 is the residual-correlation statistic used to detect it, and even its
conventional .2 cutoff is
[contested](https://onlinelibrary.wiley.com/doi/full/10.1111/jedm.12432).
Haladyna's survey of context-dependent item sets puts the practical range at 5–12 and
calls the format "inefficient to construct and administer, but versatile"
([*EM:IP* 11(1), 1992](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1745-3992.1992.tb00223.x)).

**What this means for a practice book, where nothing is scaled and no alpha is reported:**
the scoring consequence is minor but the diagnostic consequence is not. A twelve-item
testlet does not give the reader twelve independent chances to find a weakness. It gives
roughly one, twelve times over. That is the argument for a small cap here.

### 2.2 The stimulus and its items are kept visible together

The College Board states the rule for AP English and gives the reason:

> "In the multiple-choice exam booklet for the actual AP English Language and Composition
> exam, the passages and the questions asked about them are always printed on facing pages
> so that students do not have to turn back to reread a section of the passage or to locate
> a line reference."

In the released booklets the implementation on 8.5×11 is a two-column measure — passage in
the left column, questions in the right column of the same page — verified in the
[2012 AP English Literature released exam](https://secure-media.collegeboard.org/digitalServices/pdf/ap/ap-english-literature-public-practice-exam-2012.pdf)
and an [official SAT practice test](https://cdn2.hubspot.net/hubfs/360031/sat-practice-test-10.pdf).
The set is opened inline by a header, not by a running head:
`Questions 1-14. Read the following poem carefully before you choose your answers.` and
`Questions 1-10 are based on the following passage.`

**⚠ Not verified.** No published rule saying a stimulus *shall not* span a page break turns
up in the NBME, INBDE, NBDHE, PNCB or TIMSS manuals. The practice is real — facing-page
layout exists to prevent exactly that — but it is an inferred convention, and §4.4 adopts
it as *our* rule rather than citing it as a standard.

Related and documented: exam booklets use deliberate filler pages to force sections onto
the right leaf and to stop show-through. SAT prints `No Test Material On This Page` and
`THIS PAGE IS INTENTIONALLY LEFT BLANK. Test begins on the next page.`

### 2.3 The NBME Item-Writing Guide

[NBME Item-Writing Guide, October 2024](https://info.nbme.org/rs/552-QHC-046/images/NBME_Item-Writing-Guide.pdf).
It is a content manual and says nothing about typography, but four things bear directly on
v2's stimulus design.

**The vignette carries a fixed element order** (p. 30): age and gender → site of care →
presenting symptoms → duration → history → physical findings → diagnostic results →
initial treatment and subsequent findings. And (p. 35): "The bulk of the text (vignette or
case information) should precede, rather than follow, the lead-in… The use of a template
to ensure all of these sections are in place and correctly structured is highly
recommended."

**The lead-in must stand on its own:** "the test-taker should be able to answer the item
based on the vignette and lead-in alone."

**The cover-the-options rule** (p. 13):

> "If a lead-in is properly focused, a test-taker should usually be able to read the
> vignette and lead-in, cover the options, and guess the correct answer without seeing the
> option set."

**Length is not the flaw; option length is.** NBME refuses to set a vignette word count —
"decisions about vignette length should be made in accordance with the testing point of the
item" (p. 17) — while treating long, complex *options* as a technical flaw, because option
length "can shift the construct that is being measured from content knowledge to reading
speed." Its own worked vignettes run roughly 60–130 words. Sequential item sets (F-type)
are "two to three items associated with a clinical scenario that unfolds over time," with
the rule: "Imply a response to the previous item but make sure not to turn the next item
into a recall type."

INBDE adds a stated reading budget NBME does not: "examinees will typically have one minute
or less to read, comprehend, and respond to an item (the first item in an itemset/case… is
a noteworthy exception to this rule)," and "the majority of INBDE items involve four
response options."

INBDE's **Patient Box** — a fixed-field structured block above the narrative, with the rule
that stem text must not duplicate it — is the single most transferable idea in the whole
research pass, and §4.2 adopts it as an Organization Box.

### 2.4 Answer sheets

The best fully-documented specimen is ETS's own
[GRE Physics Test Practice Book](https://media.physics.hmc.edu/media/docs/gre1777.pdf),
a printed self-administered test with the answer sheet bound in at pp. 89–90: five columns
per side, **23 items per column**, numbering running *down* each column then to the next,
five ovals per row, "Item responses continued on reverse side."

Its instruction block is the model for a self-timed book:

> "To simulate how the administration will be conducted at the test center, print the
> answer sheet (pages 89 and 90)… When you are ready to begin the test, note the time and
> begin marking your answers on the answer sheet."

and, on the test book's back cover, a printed sample question with a legend showing one
correctly marked oval against four improper marks, plus "Do not be concerned that the
answer sheet provides spaces for more answers than there are questions in the test."

**⚠ Not verified: grouping in blocks of five.** No OMR or form-design guidance documents
it, and the ETS sheet contradicts it with unbroken runs of 23. Scantron's published
parameters concern mark geometry and registration, not visual grouping. §5.5 uses light
grouping as a readability choice and says so.

**The photocopy notice needs care.** The US Copyright Office's Classroom Guidelines
([Circular 21](https://www.copyright.gov/circs/circ21.pdf)) specifically exclude
consumables — "workbooks, exercises, standardized tests, test booklets and answer sheets"
— from the copying they permit. A photocopy line on our answer sheet is therefore an
*affirmative grant by the rightsholder*, not an appeal to fair use, and must be worded as
one. NBME's own three-condition notice is a clean model.

### 2.5 How keys and explanations are presented

**The recurring split, across every specimen examined: a compact grid for scoring, kept
physically apart from the prose for learning.** Readers do two different jobs and the book
gives each its own surface.

- **AP released exams** put the key behind a divider page carrying only *"Multiple-Choice
  Answer Key"*, then a two-column `Question # | Key` grid. No explanations at all.
- **The GRE Physics practice book** is the best single-page model found. Page 87 is headed
  "Answer Key and Percentages of Test Takers Answering Each Question Correctly" and runs
  four columns twice across the page: `Number | Answer | P+ | CORRECT RESPONSE`, where the
  last is an empty tick-box the reader fills in, followed by `Total Correct: ____` and a
  raw-to-scaled conversion table on the facing page. One page doing four jobs: key,
  self-scoring, per-item difficulty, score conversion.
- **McGraw-Hill PreTest**: chapter questions, then chapter answers, where "the explanation
  provides the reason why the correct answer is correct and, in most cases, the reasons why
  the wrong answers are wrong," plus a textbook reference per item — the same contract our
  authoring guide already imposes.
- **Barron's / Princeton Review** full-length-test books scope `Answer Key` then `Answers
  Explained` to each practice test rather than to the whole book.
- **Wiley/Sybex, ISC2 CISSP Official Practice Tests (4th ed.)** is the direct competitor and
  the direct structural precedent: eight domain-blocked chapters of ~100 questions plus
  **four mixed 125-item practice exams**, 1,300 items. *(Exact appendix section titles
  unverified — every retailer and publisher page returned 403.)*

**The spoiler problem is essentially undocumented.** What exists is a product, not a
convention: the IF-AT scratch-off answer form, where an opaque film covers A–E and the
reader reveals one option at a time
([instructions](https://www.uc.edu/content/dam/uc/cetl/docs/IF-ATinstructions.pdf)),
and [US Patent 5,924,740](https://patents.justia.com/patent/5924740) for a test booklet with
tear-out scratch-off answer sheets. Beyond that, the observable practice is plain
structural separation — divider pages, back matter, per-test scoping. **⚠ Column ordering,
covering strips, tear-out answer cards and upside-down answers did not turn up as named,
documented conventions.** §3 therefore solves the problem structurally rather than by
imitating a practice that does not exist.

### 2.6 Running heads and finding your place

[Chicago](https://www.chicagomanualofstyle.org/book/ed17/part1/ch01/toc.html) gives the
baseline: no running heads on display pages or chapter openings; same head on verso and
recto is acceptable; running feet are a legitimate substitute.

What exam booklets actually do is simpler and louder. SAT prints the **section number,
large, in both top corners of every page** of that section, so a reader cannot be in the
wrong section. SAT's footer is `Unauthorized copying or reuse of any part of this page is
illegal.` left and `CONTINUE` right; AP's is `GO ON TO THE NEXT PAGE.` Neither uses an item
range as a running head — the inline set header does that work.

**⚠ Not verified: item-range running heads** (`Questions 41-56` / `Answers 41-56`) as an
exam-booklet convention. It is a review-book device, and no publisher documents it. §5.9
adopts it anyway, on its merits for a 200-page reference, and labels it as our choice.

**Tabs.** Two distinct techniques, both documented: a **thumb index** is die-cut half-moon
notches in the fore edge ([APHA](https://printinghistory.org/about-thumb-indexes/)); an
**edge index / bleed tab** is a printed block bled to the fore edge and stepped down the
page so the marks stack into visible bands. Bleed tabs add no binding cost, allow unlimited
headings, and ride the normal print workflow; their limitation is that they are invisible
with the book fully closed. For eight domains on a perfect-bound book, bleed tabs are the
correct choice and die-cutting is not.

### 2.7 Time budgets and section furniture

Standard furniture, verbatim from released booklets:

- AP cover: `DO NOT OPEN THIS BOOKLET UNTIL YOU ARE TOLD TO DO SO.`
- AP "At a Glance" box: `Total Time`, `Number of Questions`, `Percent of Total Score`,
  `Writing Instrument`.
- AP section end: `STOP` / `END OF SECTION I` / `DO NOT GO ON TO SECTION II UNTIL YOU ARE
  TOLD TO DO SO.` and finally `STOP` / `END OF EXAM`.
- SAT section head: `Reading Test` / `65 MINUTES, 52 QUESTIONS`; section end: `STOP` / *"If
  you finish before time is called, you may check your work on this section only. Do not
  turn to any other section."*
- The pacing line that recurs across programs: *"Use your time effectively, working as
  quickly as you can without losing accuracy. Do not spend too much time on any one
  question."*

And the model for telling a solo reader to time themselves, from the GRE practice book:
"It is best to take this practice test under timed conditions. Find a quiet place… note the
time and begin marking your answers… Stop working on the test when 2 hours and 50 minutes
have elapsed."

Minutes per item, for calibration:

| Exam | Time / items | Minutes per item |
|---|---|---|
| CompTIA Security+ SY0-701 | 90 / 90 | 1.00 |
| INBDE (stated design target) | — | "one minute or less", set-openers excepted |
| AP English Literature MC | 60 / 55 | 1.09 |
| **CISSP CAT** | **180 / 100–150** | **1.20 at the cap, 1.80 at the floor** |
| GRE Physics | 170 / 100 | 1.70 |
| NCLEX-RN | 300 / 150 | 2.00 |

### 2.8 Item ordering: what the evidence supports

**Difficulty ordering buys almost nothing in score and something in affect.** Aamodt and
McShane's meta-analysis
([*Public Personnel Management* 21(2), 1992](https://www.researchgate.net/publication/319653642_Does_Item_Order_Affect_Performance_on_Multiple-Choice_Exams))
reports easy-to-hard versus random at **d = .11**, easy-first versus hard-first at
**d = .22**, and **content-blocked versus random at d = .04**. A 2018 study in *Studies in
Educational Evaluation* finds
[no effect of difficulty-based order](https://www.sciencedirect.com/science/article/abs/pii/S0191491X18302992)
on performance or item statistics. Where the evidence does live is anxiety: hard items at
the front raise self-reported anxiety and depress motivation
([study](https://files.eric.ed.gov/fulltext/EJ1486740.pdf)).

The `d = .04` for content-blocking is the useful number here: **ordering a section by
blueprint costs nothing measurable**, so the ordering decision can be made on navigational
and pedagogical grounds alone.

**Blocked and interleaved practice do different jobs, and a book needs both.** Rohrer and
Taylor's shuffling study found blocked practice better *during* practice and interleaved
practice far better on a delayed test a week later — 63% versus 20%, d = 1.34
([*Instructional Science* 35, 2007](http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf)),
replicated in classroom RCTs
([2015](https://files.eric.ed.gov/fulltext/ED557355.pdf),
[2019](https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf)). In
professional education specifically, Hatala, Brooks and Norman found mixed practice
produced **46%** diagnostic accuracy on novel ECG cases against **30%** for blocked
([*AHSE*, 2003](https://link.springer.com/article/10.1023/A:1022687404380)). Roediger and
Karpicke establish the underlying testing effect — restudy wins at a five-minute delay,
testing wins substantially at two days and a week
([*Psychological Science* 17(3), 2006](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)).

**And the same literature documents a metacognitive illusion:** learners "overwhelmingly
believed that blocking was better than interleaving," despite the reverse result. For a
commercial book this is a design constraint, not a footnote. A reader left to their own
judgement will work the domain chapters and skip the mixed forms, which is precisely
backwards, so §5.3's front matter has to say why the forms exist.

### 2.9 The examination this book is for

Per [ISC2's current exam outline](https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline)
(effective 2024-04-15): **3 hours, 100–150 items, multiple choice and advanced item types,
pass at 700 of 1000.** All languages moved to CAT in April 2024 and the 250-item six-hour
linear form is retired. Domain weights are the ones the book already prints — D1 16%,
D2 10%, D3 13%, D4 13%, D5 13%, D6 12%, D7 13%, D8 10%.

CAT mechanics that bear on the design
([ISC2 CAT page](https://www.isc2.org/certifications/CISSP/CISSP-CAT)): every candidate
starts below the standard; the algorithm targets roughly a 50% chance of a correct answer
on each next item; **25 pretest items** are embedded in the 100-item minimum; the exam ends
once the ability estimate excludes the pass point with 95% confidence; and **item review is
not permitted** — "once a candidate finalizes an answer, it may not be reviewed or
changed."

That last point is a constraint on this book and not a piece of trivia. A printed practice
test that invites flipping back trains a behaviour the real exam forbids. §5.4 and §5.5
carry the consequence.

**⚠ Verify on the day you go to print.** ISC2
[announced in March 2022](https://www.isc2.org/Insights/2022/03/Changes-to-the-CISSP-Exam-Length-Coming-Soon)
that from June 2022 the CAT would run 125–175 items in four hours with 50 pretest items.
Three current ISC2 pages — the outline, the CAT page and the cross-certification comparison
— all now state 100–150 items, three hours, 25 pretest items, and the November 2023 refresh
notice says three hours from April 2024. The consistent reading is that the 2022 expansion
was reverted at the 2024 refresh, and that is what this spec assumes. A large number of
third-party sites, including 2026-dated ones, still publish the 125–175 / four-hour
figures. This is the single fact in the book most likely to be wrong and most likely to be
noticed.

**Not verified, and therefore not claimed anywhere in the book:** the proportion of CISSP
items that are advanced types; whether drag-and-drop and hotspot items appear on the
current form; any quantitative account of real CISSP stem length. What can be stated is the
arithmetic — **180 minutes for up to 150 items is a 72-second median item budget** — and
that is the number §5.4 paces against.

---
## 3. The headline fix: making the key and the explanation match up

### 3.1 What the lookup costs today

One wrong item, item 37 of Domain 4, page 55:

1. The number on your sheet is "37". Eight items in the book are called 37.
2. Flip 69 pages to the answer key (p.124). Find the Domain 4 block. The grid is four
   columns that read down-then-across in runs of 18, so finding 37 means picking the
   right column first. Read `C`.
3. You marked `A`. Flip again into "Answers explained", which the contents locates only
   by its first page (p.128) — there is no per-domain entry. Domain 4's explanations
   actually begin on p.169 and item 37 lands near p.178, but nothing in the book says so,
   so you find it by opening somewhere in the middle and counting.
4. Read the explanation. It opens `37. C — <the correct option's text>` and then argues
   about options A, B and D **by letter**, and you can no longer see what A, B and D said.
5. Flip back to p.55. No running head, no bookmark; you find it by memory or by the
   contents page.

Three page-turns across a 123-page span, one ambiguous label, and a review step that is
not readable without the question page held open. Multiply by the 20–40 items a candidate
misses in a domain and the review session is mostly page-turning.

### 3.2 The options, and where each one fails

**A — Tear-out or perforated standalone key.** A real mechanism — it is the subject of
[US Patent 5,924,740](https://patents.justia.com/patent/5924740), and it does put the key
next to the question. It fails on delivery: this product ships as a PDF first and
print-on-demand second, and neither perforates. A tear-out page in a PDF is a page the
reader is told to print, which is a worse version of §5.5's answer sheet. It also solves
only the *key* lookup (step 2), leaving steps 3–5 untouched, and a torn-out key is the
one page in the book a reader will lose.

**B — Two-column key with item numbers as running heads.** Cheap and a genuine
improvement to step 2. It does nothing for steps 3, 4 or 5, which are where the time
actually goes. Adopted as a component (§5.7), rejected as the answer.

**C — Explanations printed in item order with the item restated.** Removes step 5
entirely and removes the dependency in step 4: the review section becomes readable on its
own, without the question page. Costs pages — quantified in §3.4. This is the
recommendation.

**D — Per-domain keys at the end of each domain.** Shortens the flip from ~115 pages to
~15 and disambiguates the number, because the key is inside the domain. Three failure
modes. First, spoiler proximity: with the D1 key on p.16 the reader working p.14 is two
leaves from the answers, and on the 50#-uncoated stock POD uses, a dense letter grid
shows through the leaf. Second, it breaks the mock-exam use case the audit already flags
as missing — a reader sitting a cross-domain form has to visit eight keys. Third, it
multiplies the section that must not be stumbled into by eight, and the mitigation
(forcing each key onto a verso behind a blank) costs 8–16 pages of white space to buy back
what a single well-signposted section gives for free.

**E — Thumb tabs or bleed tabs on the fore edge.** Finds the *section*; does not find
item 37 inside it, which is the lookup that hurts. The cost objection applies only to a
die-cut thumb index; a printed **bleed tab** stepped down the fore edge adds no binding
cost and rides the normal print workflow (§2.6), so it is cheap enough to adopt as a
component in §5.9. It is not the answer, because eight domain bands do not locate one item
among several hundred.

**F — Bidirectional page cross-references.** Each item carries `→ p.NNN`; each review
block carries `← item p.NN` and a study-guide reference. This is genuinely cheap here,
because `build_pdf.py` already has the machinery: `mk()` writes an invisible
`[[MK:token]]` marker into the text layer, `page_map()` reads token→page back out of a
probe render, and `two_pass()` renders twice so the second pass can print real page
numbers. Extending that from 10 tokens to one per item is a loop change, not a new
mechanism. It removes the *searching* in steps 3 and 5 but not the *flipping*. Adopted as
a supporting component, not as the answer.

### 3.3 Recommendation

**Make the review self-contained, then separate it.**

Concretely: every item gets a **review block** that restates the question, lists all four
options with a one-line verdict on each, gives the key, gives the full explanation, and
points at the study guide. The review blocks are printed in item order under a single
book-wide item number that appears in the running head of every page. Because a review
block no longer needs the question page beside it, the review section stops being an
appendix and becomes **Volume II**, a book the reader can work through on its own.

The block, at the size it will print:

```
────────────────────────────────────────────────────────────────────────
 214   Domain 1 · Security and Risk Management            item · Vol I p. 41
       Key: D

       Attackers phished a Meridian vendor's VPN credentials and used them
       directly. Which control would MOST effectively have stopped their use?

   A   Site-to-site IPsec tunnel to the vendor     right control, wrong problem
   B   NAC admitting only registered devices       compromised on that device
   C   Host IDS on vendor laptops                  detective, not preventive
 ▸ D   MFA on every vendor remote login            KEY

       The attack succeeded at the login step: a password alone opened the
       door. […152 words as authored today…]

       Study Guide § 1.13 Investigations · p. 96          Outline 1.13.1
────────────────────────────────────────────────────────────────────────
```

Four things are new, and only one of them is new *writing*:

- **The restated question line.** A compressed form of the stem, 15–30 words, authored
  once and stored in the bank (`recallLine`, §6.2). Not the full 41-word stem: the reader
  is re-entering a question they already worked, and a précis is faster to re-enter than
  the original.
- **The option ledger with verdicts.** This is not new content. The authoring guide's
  distractor rule D3 already requires every distractor to carry a **named reason** it
  loses, drawn from a fixed vocabulary — *wrong phase · wrong scope · right control wrong
  problem · symptom not cause · correct but not first · not the decision-maker's ·
  detective when preventive is asked*. Today those reasons are buried in 152 words of
  prose. The ledger promotes them to a scannable line and stores them as data
  (`distractorReasons`, §6.2). A reader who wants the short answer gets it in four lines;
  a reader who wants the argument reads on.
- **The key, stated before the prose rather than inside it.** Step 4 above currently
  requires the reader to parse the first sentence to learn what they should have picked.
- **The cross-references,** both ways: back to the item's page in Volume I, and out to the
  study guide section that teaches it. The audit's finding 4 is that the string "chapter"
  or "see page" appears zero times in 239 pages; a reader who misses an item has nowhere
  to go.

**Why this one and not the others.** A, B, D, E and F all reduce the *cost* of the
lookup. Only C removes the lookup. That difference compounds: the corpus is consistent
that the explanations are what buyers pay for (`RF-5`: "the feedback on each question is
highly informative"; `RF-23` describes a 160-page book containing 25 questions, six pages
each, whose entire value is the reasoning), and the review section is currently the part
of the book you cannot read without another part of the book open. Making it independent
turns 112 pages of appendix into the half of the product that teaches.

The separation into Volume II follows from the same change and is not a second decision:
once a review block stands alone, keeping it bound behind the questions has no benefit
and one large cost — the reader cannot have both open at once. Two volumes give a paper
reader question-in-left-hand, review-in-right-hand with no flipping at all, and give a
digital reader two files for the two screens the corpus already describes working that
way ("the browser allows me to sit down like i'm working and be able to use multiple
screens", `reddit_feedback.json`, formatting theme).

**F is adopted alongside it**, because the marker machinery already exists and a page
reference costs ten characters. **B is adopted for the quick-score key** (§5.7), which
stays in Volume I so that scoring never requires Volume II.

### 3.4 What it costs

At the v1 explanation section's measured density (4.39 blocks/page, ~733 words of
10.3pt/1.42 type per page), a review block runs:

| Component | Words |
|---|---|
| Header line (number, domain, key, cross-references) | ~14 |
| Recall line | ~25 |
| Option ledger (4 × option text ≤10 words + verdict ≤6 words) | ~64 |
| Explanation (unchanged) | ~152 |
| Study-guide reference | ~10 |
| **Total** | **~265** |

Against ~167 words today, that is 1.59×, giving **≈2.8 blocks per page**. For 625 items
(§8) the review section is ~223 pages plus 12 pages of case-study debriefs — which is
Volume II, and is why it is a volume rather than a section.

The cost is real and it is the price of the fix. Two things reduce it if the page count
becomes a problem: the ledger's option texts are *author-written short forms*, not the
printed options, so they can be held to eight words; and the explanation's own
per-distractor sentences can shorten once the ledger carries the verdict, which is a
future authoring pass, not a v2.0 requirement.

### 3.5 What it does not fix

**Adjacent-item spoilage inside the review section.** Three review blocks share a page, so
checking item 214 exposes 213 and 215. This is universal in the category and is accepted
here: review happens after a section is worked, not during it. §2.5 found no documented
publishing convention that solves it — only the IF-AT scratch-off form, which is a
manufactured product rather than a page layout, and plain structural separation. The spoiler risk that
*does* matter — answers visible while working the questions — is handled structurally by
putting every answer in a different volume, which is stronger than v1's separation and
stronger than any of options A–F.

**A reader who reviews mid-section anyway.** Mitigated, not solved, by printing the
quick-score key (Volume I) so that scoring alone never opens Volume II.

---
## 4. Testlets

### 4.1 Three kinds of context, kept distinct

| | **Case study** | **Testlet** | **Standalone item** |
|---|---|---|---|
| What it is | The domain's backdrop | One stimulus, 3–5 items | One self-contained item |
| Length | 250–340 words (scenario half) | 80–140 words | — |
| Items served | Every item in the domain that chooses to use it | Exactly its own 3–5 | 1 |
| Where printed | Once, at the domain opener | Inline, where its items fall | Inline |
| v1 equivalent | `domains[].caseStudy` (unchanged) | none | `domains[].questions[]` |

The case study stays exactly as it is — v1 must keep building, and the domain backdrop is
the right shape for what it does. A testlet is the new thing: a short paragraph with its
own small set of questions, which is the shape Bill describes the real exam having.

**Testlets are episodes inside their domain's case-study world.** Same organisation, same
people, a different moment — three weeks earlier during procurement, the morning after
containment, the following year's audit. This is deliberate and it closes the audit's
finding 3: Domains 3, 5, 6 and 8 currently have *zero* questions that mention their own
case study's named incident, so the case study is decorative in half the book. Making
each new testlet a scene from that world makes the domain narrative load-bearing without
forcing every individual item to depend on it, and it answers `RF-52` ("they seem to go
all over the place and have no relationship to what i learned or studied in the chapter").

A testlet may instead introduce a *new* organisation when the domain needs a context its
case study cannot supply — a second world per domain is allowed and expected (Bill:
"additional stories and additional case studies"). What is not allowed is a testlet set
nowhere, in an unnamed company with unnamed systems.

### 4.2 Stimulus

- **Length: 80–140 words.** Below 80 it is a long stem wearing a costume, and should be
  folded back into a single item. Above 140 it stops fitting the layout in §4.4 and the
  reader is re-reading a case study.
- **Contains:** an organisation, the systems or data at issue, what has happened or is
  being decided, and the constraint that makes the decision hard (a deadline, a
  contract, a regulator, a budget, a dependency). It is a situation, not a briefing.
- **Must not contain** the answer to any of its own items in so many words. The stimulus
  supplies facts; the items supply the decision.
- **May carry one exhibit** — a log excerpt, an access-control table, a config fragment,
  a risk-register row, a change ticket. Exhibits are plain text or a small table, set in
  a monospaced or ruled block. No images: the builder renders HTML to PDF and an exhibit
  that is a picture cannot be read by a screen reader or searched in the PDF text layer.
  A testlet with an exhibit uses the spread layout (§4.4).
- **Optional title**, 3–6 words, printed as a kicker: "Meridian: the 3 a.m. alert". It
  gives the reader a handle and gives the review section something to name.

**The Organization Box.** Above the narrative, a compact fixed-field block:

```
  ORGANIZATION   Meridian Financial Services · regional bank, 2,400 staff
  REGIME         PCI DSS · GLBA · state breach notification
  ENVIRONMENT    1,200 ATMs · outsourced maintenance · vendor VPN
  STATE          Day 14 of an unresolved intrusion
```

This is INBDE's Patient Box (§2.3) transposed. It exists because the CISSP's real item
budget is 72 seconds (§2.9) and a reader who has to mine four facts out of a paragraph
before they can begin has spent a third of it. Fixed fields in a fixed position are read
at a glance, they make every set in the book comparable, and they are fairer than burying
the same facts in prose at varying depths.

INBDE's accompanying rule transfers with it: **stem text must not duplicate the box.** If
the box says the regime is PCI DSS, no item stem says "at this PCI-regulated bank". The
box carries the standing facts; the narrative carries what changed; the stem asks the
question.

The box is optional per stimulus — a governance testlet about a board decision may need
only two of the fields — but the field *names* are fixed across the book.

### 4.3 Items per stimulus

**Three to five, default four. Never one, never more than five.**

- **Never one.** A single item hanging off a paragraph is a stem, and should be written as
  one. The overhead of the testlet apparatus (rule, "Items N–M refer to…", the review
  section's stimulus reprint) is not worth one question.
- **Never more than five.** Items sharing a stimulus are not locally independent, so the
  set does not give the reader five independent chances to find a weakness (§2.1). The
  operational precedents bracket the choice: NBME's sequential sets are 2–3 items, INBDE
  caps itemsets at 3–6 and says so explicitly, Next Generation NCLEX case studies are
  exactly 6. Five is inside every one of those bounds. **Four is the default, and it trades
  against stimulus length**: a four-item set fits one page only with a stimulus at the
  short end and options near 10 words, so a set that needs a fuller stimulus becomes a
  three-item set rather than a spread (§4.4).
- **Breadth over depth within a set.** Each item in a testlet maps to a *different*
  outline subtask. Four items on 1.13.1 is a drill, not a set.
- **Order within a set follows the incident's own timeline** where there is one:
  prevention, detection, response, recovery, lessons. This is how the reader will think
  about it, and it makes the set teach a sequence rather than four disconnected questions.

**The cover-the-options rule applies to the pair, not the stem.** NBME's test (§2.3) is
that a reader should be able to read the vignette and lead-in, cover the options, and
produce the answer. Inside a testlet the "vignette and lead-in" is *stimulus plus stem*,
and the stem is only 15–35 words, so the check is: cover the options and cover the
stimulus, and the stem alone should be *insufficient*. If the stem alone is enough, the
stimulus is decoration and the item belongs among the standalones.

**The independence rule.** No item may depend on the answer to a sibling. An item may
reference an *event in the stimulus* ("after the SOC closed the alert as maintenance…");
it may not reference a *decision an earlier item asked the reader to make* ("having
isolated the host, what next?"), because that hands over the earlier key. The test is
mechanical: **reorder the items at random; every one must still be answerable.** The
authoring pass runs it.

**Key spread within a set.** At most two items in a four- or five-item set may share a
correct letter. The book-wide balance gate in `build_pdf.py` does not catch a set of four
whose keys are all C, and a reader who spots one will spot them all.

### 4.4 Layout, and the page-break rule

**A testlet never spans a page turn.** This is our rule, adopted on the College Board's
reasoning — passages and their questions are kept together "so that students do not have to
turn back to reread a section of the passage" (§2.2) — and not a published standard; no
item-writing manual states one.

**The AP/SAT two-column implementation was considered and rejected.** On 8.5×11 the College
Board runs the passage in a left column and the questions in a right column of the same
page. That works for verse and for short numbered questions; it fails here because a
CISSP option averages 12.5 words and runs to 23, and a 3.2-inch column turns four options
into a thicket of wrapped lines. Option length is the one thing NBME names as a technical
flaw for shifting the measured construct toward reading speed, and a narrow measure
manufactures the same effect typographically. v2 keeps the full measure and stacks the
stimulus above its items.

Two permitted forms:

- **One page (3–4 items, no exhibit).** Stimulus at the top, then the items. The v1
  question section measures at roughly **367 words of stem-plus-options type per page**,
  and that number is what sets every budget in §4.2 and §4.3:

  | Set | Stimulus | Per item | Total | Fits one page |
  |---|---|---|---|---|
  | 3 items | 120 w | 25 w stem + 48 w options | 339 w | comfortably |
  | 4 items | 100 w | 25 w stem + 44 w options | 376 w | only just |
  | 4 items | 90 w | 22 w stem + 40 w options | 338 w | yes |
  | 5 items | 120 w | 25 w stem + 48 w options | 485 w | no — use the spread |

  So a four-item set on one page needs a stimulus at the short end of the 80–140 range and
  options held near 10 words, and a fuller stimulus buys a three-item set instead. This is
  also why item stems inside a testlet are held to **15–35 words**: the context has already
  been given, so the stem only has to ask. The 367 figure is approximate — it comes from
  v1's measured density, which carries inter-item gaps a testlet partly reclaims — so the
  V5 and V6 gates in §7, not this table, are what actually decide whether a set fits.
- **One spread (5 items, or any testlet with an exhibit).** Stimulus and exhibit on the
  verso (left), items on the recto (right), so the whole set is visible with the book
  open and nothing is re-read after a turn. This is the passage-set convention and it is
  strictly better than reprinting the stimulus, which wastes the same space and asks the
  reader to trust that the reprint is identical. The builder must start such a testlet on
  an even page.

Neither form ever repeats the stimulus, and there is no "(continued)" case, because
"continued" is what the page-break rule exists to prevent. §7 gives the build gate that
enforces it: the probe render's marker map must place a testlet's opening and closing
markers on the same page, or on an even/odd adjacent pair.

### 4.5 How testlets sit among standalone items

Testlets are **interleaved with standalone items in the ordinary run of the section**, not
segregated into a "scenarios" chapter. The reader should not be able to tell from the
table of contents which questions are which; the real exam does not warn you.

A testlet is introduced by the standard set line, above a hairline rule:

> **Items 214–217 refer to the following scenario.**

and closed by a second hairline. The item numbers in that line are the book-wide numbers
from §5.9, so the line is also a navigation aid.

**Targets, stated as floors on new content rather than as book-wide percentages** (the
carried-forward v1 items are all standalone, so a whole-book percentage would mostly
measure how much of v1 survived):

- At least **60% of newly authored v2 items** sit in a testlet.
- Every domain has at least **2 testlets in its drill section** and **2 across the two
  mock forms combined**. The drill floor is 2 rather than 4 because the drills carry only
  86 newly authored items (§8.1) and 8 × 4 sets would consume more than all of them; the
  forms, which are entirely new, carry the bulk of the testlet content.
- At least **one testlet per domain is cross-domain** — its items carry `crossDomain`
  domain ids, and the set deliberately asks a governance question, a technical question
  and an operational question about the same incident. This is the direct answer to
  `RF-61`, and a testlet is the only structure in the book that can do it honestly.
- The 27 zero-coverage outline items in the audit's Part 1 are covered first, and the two
  named clusters are natural sets: Domain 3's untested system-types family
  (3.5.1/3.5.2/3.5.10/3.5.11/3.5.15 — client, server, container, serverless, virtualized)
  is one five-item testlet about a single migration; Domain 7's half-tested DRP ladder
  (7.12.2 walkthrough and 7.12.3 simulation are missing) is one four-item testlet about a
  single recovery exercise.

---
## 5. The v2 book architecture

### 5.1 Two volumes

| | **Volume I — The Examination** | **Volume II — Answers and Review** |
|---|---|---|
| Contains | Front matter, instructions, Part I domain drills, Part II mock forms, answer sheets, quick-score key | One review block per item (§3.3), case-study debriefs, the restudy index |
| Approx. pages (§8) | ~239 | ~270 |
| Can be used alone for | Working questions; scoring a sitting | Reviewing; studying the reasoning end to end |
| Needs the other volume | No | No |
| Builder product key | `test` (v2 variant) | `review` (new) |

They are separate PDFs and, in print, separate perfect-bound books. Sold together as one
product. Neither is a subset of the other and neither is readable only with the other
open, which is the whole point of §3.

### 5.2 Physical specification

Unchanged from v1 unless noted: US Letter (612×792pt) for the PDF, margins
16/19/18/18 mm, Charter body at 11.5pt/1.52, Schibsted Grotesk for headings and
furniture, Krona One for display, Vault Steel on paper (`build_pdf.py` `BRAND`).

Two additions:

- **The interior must survive being printed single-sided.** A reader who prints Volume I
  on a home printer gets no verso, so nothing may depend on a verso/recto relationship
  except the testlet spread (§4.4), which degrades gracefully to two consecutive pages.
- **Blank versos are set deliberately, not accidentally.** Each part opener and the
  quick-score key start on a recto; the preceding verso, if blank, carries the line *This
  page is intentionally blank* so a reader does not think a page is missing.

### 5.3 Front matter (Volume I)

In order:

1. **Cover** — as v1, with the item count and edition updated. The trademark disclaimer
   stays on the cover; "CISSP" must not appear in the product name (`build_pdf.py`
   comment at `PRODUCTS`).
2. **Contents** — every part, every domain, every mock form, the answer sheets and the
   key, each with a page number. Volume II's contents are listed too, with a note that
   they are page numbers *in Volume II*.
3. **How to use this book** — one page, replacing v1's four-paragraph note. Covers: the
   two volumes and what each is for; the answer-sheet convention; where the key is; that
   the review blocks are self-contained. It must also **argue for Part II**, in two or three
   sentences and without jargon. Blocked practice feels more productive than mixed practice
   and is not, and the same literature that measures the gap also measures the illusion:
   learners "overwhelmingly believed that blocking was better than interleaving" (§2.8). A
   reader left to their own judgement will work the eight domain chapters, feel competent,
   and skip the two mixed forms — which are the only part of the book that trains
   discrimination *between* domains, which is the thing a computer-adaptive exam demands.
   Say it plainly, on the page, before they start.
4. **The examination you are preparing for** — one page: the 2024 outline's eight domains
   with their weights, the real exam's delivery format and time, and the paragraph in
   §5.4 about what a raw score does and does not tell you.
5. **How these questions are built** — one page. What v1 buries in a paragraph and the
   audit found buyers value: answer positions are balanced (the current χ²(3)=0.03
   uniformity is a selling point), the correct option is the longest choice in 7.1% of
   items, every explanation names why each distractor loses, and the item ids that let a
   reader report a suspect key (`RF-3`: a candidate who reported a question and got no
   answer). Include the report route.
6. **Part I opener** (recto).

### 5.4 Instructions and the time budget

Printed at the head of each mock form, and summarised on the "How to use" page:

- **An At-a-Glance box** at the head of each form, in the released-exam idiom (§2.7):
  total time, number of items, what to write with, what is allowed. It is recognisable to
  anyone who has sat a proctored exam and it costs nothing.
- **A stated total, derived rather than invented.** The real examination allows 180 minutes
  for up to 150 items, so the binding budget is **72 seconds an item** (§2.9). INBDE, which
  publishes the same kind of target, excepts the opening item of a set because someone has
  to read the stimulus — so a form carrying 13 testlets needs an allowance for them:

  > 125 items × 72 s  +  13 stimuli × 45 s  =  9,585 s  ≈  **2 hours 40 minutes**

  Printed as: *"Form A · 125 items · 2 hours 40 minutes. Note your start time on the
  answer sheet."* Not the 75 seconds v1 asserts, and not a round number chosen for looking
  reasonable — the arithmetic is shown in the front matter so a reader can check it.
- **A halfway marker,** printed between items 62 and 63: *"Halfway. If you are past 1 hour
  20 minutes, you are behind pace."* One checkpoint, not a running clock — the object is
  pacing awareness, not anxiety.
- **Answer once and move on.** The real examination is computer-adaptive and forbids item
  review outright: "once a candidate finalizes an answer, it may not be reviewed or
  changed" (§2.9). A printed test that invites flipping back trains a habit the exam will
  not let the reader use. The form instructions therefore say to answer each item once, in
  order, and not to return to it — and the flag column on the answer sheet (§5.5) exists
  for *post-scoring* review, not for revisiting during the sitting. The reader should be
  told why, because every other paper test they have ever sat told them the opposite.
- **A stop rule at the end of each form**, in the standard furniture (§2.7): `STOP` on its
  own line, then `END OF FORM A`, then the instruction not to go on. The next leaf is a
  deliberate blank verso carrying `THIS PAGE IS INTENTIONALLY LEFT BLANK`, then the answer
  sheet. Use the plain furniture words — *STOP*, *END OF FORM*, *GO ON TO THE NEXT PAGE* —
  and write our own instruction prose around them rather than lifting the College Board's
  paragraphs.
- **No stop rules inside the drills.** Part I is untimed study. It carries a per-domain
  pacing note instead: *"Domain 4 · 65 items · allow about 1 hour 40 minutes if you are
  timing yourself."*
- **What the score means.** The real examination is computer-adaptive and reports a scaled
  result against a 700/1000 cut, not a percentage of items answered correctly, so a raw
  percentage here is a study signal and not a pass prediction. State it plainly. Two
  candidates in the corpus describe being misled by a readiness number (`RF-13`: "the
  LearnZapp readiness number is meaningless"; `RF-60`: readiness figures are "not a
  sufficient indicator"), and the audit notes v1 gives no scoring guidance at all.

### 5.5 Answer sheets

One per mock form, plus one generic 50-item strip for drills, all in the back matter of
Volume I and all printed on a recto.

- **Layout:** items in five columns of 25, reading *down* each column and then to the
  next — the arrangement on ETS's own bound-in sheet (§2.4), which runs five columns of 23.
  A hairline every fifth item is a readability choice and nothing more: **block-of-five
  grouping is not a documented convention**, and the ETS sheet in fact runs unbroken. It is
  in this spec because it helps the eye recover its place, not because anyone else does it.
- **Marking:** four labelled boxes `A B C D` per item, not ovals. Nothing scans these; a
  box is faster with a pen and easier to read back than a filled circle. Include the ETS
  device of a **printed sample item with one correctly marked box and the common wrong
  markings beside it** — it takes a quarter of a column and removes an entire class of
  self-scoring error.
- **A flag column** — one narrow box per item. Not for revisiting during the sitting (§5.4:
  the real exam forbids review), but for marking the items that were *guessed or
  uncomfortable*. A guessed item answered correctly is a weakness the score cannot see, and
  the flag is the only place in the book that can record it. The review order after
  scoring is: wrong items first, then flagged-but-correct.
- **Header:** form name, date, start time, end time, and a line for the reader's own note.
- **A self-administration instruction** on the facing page, in the GRE practice book's idiom
  (§2.4): print the sheet, find a quiet place, allow the full time, note the start time,
  stop when the time has elapsed.
- **Scoring strip** below the grid: one row per domain with boxes for *items attempted*,
  *correct*, the domain's blueprint weight, and a weighted column, so the reader sees
  which domain is weak *relative to how much of the exam it is* rather than as a raw
  count. Domain 1 at 60% correct matters more than Domain 8 at 60%, and nothing in v1
  tells the reader that.
- **Footer: an affirmative photocopy grant**, worded as a grant by the rightsholder and
  not as an appeal to fair use. The Copyright Office's Classroom Guidelines specifically
  exclude "test booklets and answer sheets" from the copying they permit (§2.4), so a bare
  "you may photocopy this" leans on an exception that does not exist. Model it on NBME's
  three-condition notice:

  > *Permission is granted to reproduce this answer sheet, provided that (1) this notice
  > appears on every copy, (2) the copies are for the purchaser's own study, and (3) the
  > page is not modified.*

  Necessary because a reader will want to retake the form; also worth shipping as a
  standalone two-page PDF, which is what Kaplan does rather than relying on a tear-out.

### 5.6 Part I drills and Part II mock forms

**Part I — Domain drills.** Eight sections, one per domain, in outline order. Each opens
with the domain header (weight, item count, item range), the case-study scenario as v1
prints it, and then the items **in 2024-outline task order** — 1.1 items first, then 1.2,
and so on.

Blueprint order is affordable because content-blocked ordering versus random measures at
**d = .04** (§2.8): it costs nothing detectable in score, so the decision can be made on
navigational grounds alone. What it buys is real — the drill becomes a visible coverage map
against the outline, and it runs in the same order as the study guide, so a reader working
a weak task can read the two side by side and the cross-references in §5.10 run in
parallel.

One concession to the affect evidence, which is the only place item order reliably shows
up: **the first two items of each domain open easy.** Hard items at the front raise
self-reported anxiety and depress motivation, and it costs nothing to not do that.

**Part II — Mock forms.** Two independent 125-item forms, A and B, each apportioned across
domains by the 2024 weights using the same largest-remainder method the app already
implements in `src/lib/blueprint.ts` (`apportionByWeight`), so the printed forms and the
app's exam mode cannot disagree:

| Domain | Weight | Form items |
|---|---|---|
| 1 Security and Risk Management | 16% | 20 |
| 2 Asset Security | 10% | 13 |
| 3 Security Architecture and Engineering | 13% | 16 |
| 4 Communication and Network Security | 13% | 16 |
| 5 Identity and Access Management | 13% | 16 |
| 6 Security Assessment and Testing | 12% | 15 |
| 7 Security Operations | 13% | 16 |
| 8 Software Development Security | 10% | 13 |
| **Total** | **100%** | **125** |

Within a form the items are **interleaved, not domain-blocked**, and the domain is not
printed on the item. A form should feel the way the corpus describes the real thing:
cross-domain and non-linear (`RF-61`). Interleaved retrieval is also the shape that
transfers, where blocked practice is the shape that acquires — which is exactly why the
book has both parts rather than one.

**Form items are never drill items.** A form the reader has already worked measures
memory, not readiness (`RF-110`: "some question kept repeating. I saw no use in doing it a
third time"). Forms A and B share no items with each other or with Part I, and §7 gates
it.

### 5.7 The quick-score key (Volume I)

Stays in Volume I so scoring never requires Volume II. One section, starting on a recto
behind a blank verso, with a tinted edge band so it is visible when thumbing and hard to
open into by accident.

It is modelled on the GRE Physics practice book's scoring worksheet (§2.5), which is the
best single-page design found in the research: one page that is simultaneously the key, the
self-scoring form, a per-item difficulty read and a rollup.

- **One grid per section** (each domain drill, Form A, Form B), each headed with the item
  range it covers.
- **Four columns, run twice down the page**: `Item │ Key │ Tier │ ✓`. The last is an empty
  box the reader ticks, which is what turns reading the key into scoring the sheet without
  a second pass.
- **Two blocks of 25 per column**, reading down, with the item numbers as a repeated spine
  so a mis-tracked eye recovers in one line rather than one column. v1's four irregular
  columns of 13–18, reading down-then-across, is the layout that makes step 2 of §3.1 slow.
- **`Tier` is the author's difficulty estimate (1–5), and must be labelled as such.** GRE
  prints `P+`, the measured percentage of candidates who answered correctly; we have no
  candidate data and printing an author's guess in a column that looks like a statistic
  would be inventing one. Footnote it on the page: *estimated by the author; not measured*.
  If the practice app ever reports real per-item response rates, this column is where they
  land, and only then does it become a statistic.
- **Nothing else on the page.** No option text, no reasons, nothing that teaches — it is
  scanned at one item per second, and anything else on it is a spoiler for the items either
  side.
- **Totals under each grid**: `Correct ___ of ___`, and a per-domain rollup carrying each
  domain's blueprint weight, so weakness reads relative to how much of the exam the domain
  is. Followed by the §5.4 caution: the real result is a scaled 700/1000 from an adaptive
  form, not a percentage, so this is a study signal and not a prediction.
- The letter-balance line v1 prints under the key heading stays. It is evidence, and the
  audit found it is true.

### 5.8 Volume II — the review

- **One review block per item**, in book-wide item order, formatted as §3.3.
- **Running heads carry the item range** (§5.9), so finding item 214 is one fore-edge
  thumb, not a search.
- **Case-study debriefs** — the second half of each `caseStudy` field, which v1 already
  holds back behind the key — are printed at the end of the corresponding domain's review
  run, not all together, so the debrief lands where the reader has just finished being
  wrong about that world.
- **A restudy index** at the back: every outline item that appears in the book, with the
  item numbers testing it and the study-guide section teaching it. A reader who missed six
  items reads six review blocks; a reader who missed six items *in the same outline task*
  should be told so, and this is the page that tells them.

### 5.9 Item numbering and running heads

**Numbering.** One continuous sequence per part:

- Part I drills: **1 … N** across all eight domains, unbroken. Domain 1 is items 1–80,
  Domain 2 is 81–130, and so on; each domain opener prints its own range.
- Part II: **A1 … A125** and **B1 … B125**.

This replaces v1's per-domain restart, which is the root cause of the ambiguity in §3.1 —
"question 37" currently names eight different questions and no page in the interior says
which one you are looking at. A continuous number is also what an answer sheet needs and
what a review block needs, and it is what the released booklets examined in §2 do within a
section — AP numbers 1–55 across its whole multiple-choice section, GRE 1–100 across its
whole test, neither restarting at an internal boundary.

**The printed number is derived, not stored.** v1's items carry a `number` field, which
bakes a per-domain position into the data; adding one item to Domain 3 would renumber
everything after it and silently invalidate the field. In v2 the printed number is
computed by the builder from the item's position in its section, and the *stable* handle
is the item `id` (§6.2), which never changes. The review block prints both: the number for
navigation, the id in small type for reporting a suspect key.

**Running heads.** Every interior page carries a head, outer-aligned so it reads on the
fore edge:

| | Verso (left) | Recto (right) |
|---|---|---|
| Part I | `Domain 4 · Communication and Network Security` | `Items 261–266` |
| Part II | `Form A` | `Items A44–A49` |
| Volume II | `Answers · Domain 4` | `Items 261–263` |
| Key | `Answer key` | `Items 261–330` |

**⚠ Item-range running heads are a review-book device, not an exam-booklet convention.**
No released booklet examined uses them; the inline set header does that work instead, and
no publisher documents the practice (§2.6). They are adopted here on their merits for a
200-page reference a reader searches by item number, and the spec says so rather than
claiming an inheritance.

**Two devices that are inherited.** Inside a mock form, the form letter is printed **large
in both top corners of every page**, which is how SAT stops a reader being in the wrong
section. And each domain in Volume II carries a **bleed tab**: a printed block stepped down
the fore edge, eight positions for eight domains, so the review volume opens to the right
domain by thumb. Bleed tabs add no binding cost and need no die-cutting (§2.6); they are
worth having in Volume II, which is the volume that gets searched, and are unnecessary in
Volume I, which gets read in order.

The footer stays as v1 has it (imprint, build date, page *n* of *N*). Add `GO ON TO THE
NEXT PAGE` on question pages inside a mock form, which is standard and tells the reader
that the section has not ended.

**Implementation note, because this constrains the builder.** Chrome's `page.pdf()`
header template only interpolates `pageNumber`, `totalPages`, `title`, `url` and `date`;
it cannot print a per-page item range, and Chrome does not support the CSS
`string-set`/`running()` mechanism that would otherwise do this. So **v2 paginates by
construction**: the builder emits one `<section class="page">` per printed page, fills it
to a measured item budget, and writes the running head as an in-flow block at the top of
that section. This is also what makes §4.4's page-break rule enforceable and what lets
every cross-reference in §5.10 be a real page number. The cost is some ragged page
bottoms, which is normal in the category and preferable to a testlet split across a turn.
§7 gates that each emitted section really occupies exactly one PDF page.

### 5.10 Cross-references

Three references, all derived rather than hand-written:

- **Item → review.** Each item in Volume I prints, in small muted type at the end of its
  option list, `▸ Vol II p. 183`.
- **Review → item.** Each review block prints `item · Vol I p. 41`.
- **Review → study guide.** Each review block prints the outline id it tests and the study
  guide section that teaches it: `Study Guide § 1.13 Investigations · p. 96`.

The first two are page numbers *in the other volume*, which means the two builds are
coupled: Volume I's page map must be available when Volume II renders, and vice versa.
`build_pdf.py` already has the primitive — `mk()` writes an invisible marker,
`page_map()` reads token→page out of a probe render, `two_pass()` renders twice. The
extension is a **three-pass build**: probe both volumes, then render both with each
other's maps. When only one volume is built, the reference degrades to the section
reference alone rather than printing a wrong number.

The study-guide reference resolves the same way when the study guide is built in the same
run (`main()` already builds `study` before `test`), and degrades to `§ 1.13
Investigations` with no page number when it is not. **The section reference, not the page
number, is the contract** — the study guide repaginates on every rebuild, and a stale page
number is worse than none.

### 5.11 Back matter (Volume I)

Answer sheets (§5.5), the quick-score key (§5.7), a one-page outline-coverage table
showing how many items test each 2024 task, the report-a-question route, and the
trademark and edition colophon.

---
## 6. Data schema changes

### 6.1 The compatibility contract

What the v1 builder actually reads from `src/data/content.json`
(`build_pdf.py:load_questions`, `bank_manifest_report`):

- `data["domains"][]`, keyed by the first integer in `id`;
- `dom["questions"][]`, filtered to items having both `question` and `options`;
- `dom["caseStudy"]`;
- `data["bank"]` — and it compares `byDomain`, `questionCount` and `keyCounts` **against
  the loaded `questions[]` only**. `bank.schema` is printed, never enforced.

Unknown keys are ignored everywhere, on domains and on items. The app is the same: the
`ContentData` / `Question` interfaces in `src/lib/content.ts` are structural, already carry
optional `level` / `tasks` / `references` fields for exactly this reason, and
`stage-learn.sh` asserts only that ids in `questions[]` are unique and that no answer
letter exceeds 30%.

**Three rules follow, and they are the whole contract:**

1. **No v2 item is ever added to `domains[].questions[]`.** New items live in a new sibling
   array. Adding to `questions[]` would change what v1 prints even though the builder
   still runs, which is not "v1 still builds".
2. **`bank.questionCount`, `bank.byDomain` and `bank.keyCounts` keep describing
   `questions[]` alone.** Updating them to include v2 totals fails the v1 build at gate
   0/3 with a manifest mismatch. v2 counts go in a separate `bank.v2` block.
3. **`bank.schema` stays `2`.** The new surface is versioned by `bank.v2.schema`.

Every field below is additive and optional to v1.

### 6.2 New and changed objects

#### Domain object — two new sibling keys

```jsonc
{
  "id": "domain_1",
  "title": "Security and Risk Management",
  "caseStudy": "…unchanged…",
  "questions":   [ /* …unchanged: the 439 v1 items… */ ],

  "stimuli":     [ /* NEW: testlet stimuli for this domain */ ],
  "questionsV2": [ /* NEW: items authored for v2 */ ]
}
```

`questionsV2` is named for the merge that ends it: when the v1 edition is retired, its
contents move into `questions[]` unchanged and the key disappears.

#### Stimulus object

```jsonc
{
  "id": "d1_s03",
  "domainId": "domain_1",
  "kind": "testlet",
  "title": "Meridian: the 3 a.m. alert",
  "text": "Fourteen days into the intrusion, Meridian's overnight SOC analyst …",
  "world": "meridian",
  "caseStudyId": "domain_1",
  "profile": {
    "organization": "Meridian Financial Services · regional bank, 2,400 staff",
    "regime": "PCI DSS · GLBA · state breach notification",
    "environment": "1,200 ATMs · outsourced maintenance · vendor VPN",
    "state": "Day 14 of an unresolved intrusion"
  },
  "outlineItems": ["1.13", "7.6"],
  "layout": "page",
  "exhibit": {
    "type": "log",
    "title": "VPN concentrator, 02:51–03:14",
    "lines": ["02:51:07  auth.ok   user=techsafe\\svc-maint  src=…", "…"]
  },
  "editions": ["v2"]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `d<N>_s<NN>`. Stable; never reused. |
| `domainId` | yes | The domain it prints in. |
| `kind` | yes | `"testlet"`. Reserved: `"caseStudy"`, if the domain backdrops are ever modelled the same way. |
| `title` | no | 3–6 words, printed as a kicker. |
| `text` | yes | 80–140 words (§4.2). |
| `profile` | no | The Organization Box (§4.2). Fixed keys — `organization`, `regime`, `environment`, `state` — any subset, rendered in that order. Stem text must not duplicate it. |
| `world` | no | A slug shared by every stimulus set in the same fictional organisation. Lets the builder avoid printing two unrelated "Meridian" worlds and lets the restudy index group by story. |
| `caseStudyId` | no | The domain whose `caseStudy` this is an episode of. Present on the testlets that close the audit's finding 3. |
| `outlineItems` | yes | 2024 outline ids the *set* covers. Individual items carry their own. |
| `layout` | yes | `"page"` or `"spread"` (§4.4). The builder gates it; this field states the author's intent so a mismatch is a diagnosable failure rather than a surprise. |
| `exhibit` | no | `{type, title, lines[]}`; `type` ∈ `log`, `table`, `config`, `ticket`, `register`. Forces `layout: "spread"`. |
| `editions` | yes | `["v2"]` today. |

The stimulus does **not** list its items. Items point at the stimulus, so the two cannot
drift apart.

#### Item object

Every v1 field keeps its meaning. New fields:

```jsonc
{
  "id": "d1_v2_q014",
  "domainId": "domain_1",
  "question": "Which action should the analyst take FIRST?",
  "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "correctAnswer": "D",
  "explanation": "…152 words…",
  "rev": "…",

  "editions": ["v2"],
  "form": "drill",
  "stimulusId": "d1_s03",
  "stimulusSeq": 2,

  "outlineItems": ["1.13.1"],
  "crossDomain": ["domain_7"],

  "recallLine": "The SOC sees a 3 a.m. vendor session it cannot verify. What first?",
  "optionsShort": { "A": "Block the vendor VPN", "B": "…", "C": "…", "D": "…" },
  "distractorReasons": {
    "A": { "label": "correct but not first",
           "wouldAnswer": "…what contains the intrusion once it is confirmed?" },
    "B": { "label": "wrong scope", "wouldAnswer": "…" },
    "C": { "label": "detective when preventive is asked", "wouldAnswer": "…" }
  },

  "lens": "operational",
  "cognitive": "application",
  "discriminator": "FIRST",
  "difficulty": 3,

  "variantOf": "domain_1_q11",
  "variantAxis": "lens"
}
```

| Field | Required for new v2 items | Notes |
|---|---|---|
| `editions` | yes | `["v1"]`, `["v2"]`, or `["v1","v2"]`. **On a v1 item this is how it is carried forward**: the v2 builder's drill pool is the items in `questions[]` whose `editions` include `"v2"`, plus everything in `questionsV2[]`. Absent ⇒ `["v1"]`. |
| `form` | yes | `"drill"`, `"A"` or `"B"`. Exactly one. |
| `stimulusId` | if in a testlet | Absent ⇒ standalone item. |
| `stimulusSeq` | if in a testlet | 1-based; must be contiguous 1…n within the set. Determines print order. |
| `outlineItems` | yes | 2024 outline ids, subtask-level where one exists (`"1.13.1"`), task-level otherwise (`"3.3"`). Drives the restudy index, the coverage table, the study-guide cross-reference and the drill ordering. |
| `crossDomain` | no | Other domain ids the item genuinely draws on (`RF-61`). Reported, never used to re-file the item. |
| `recallLine` | yes | ≤30 words. The review block's restated question (§3.3). Fallback when absent: the stem's final sentence. |
| `optionsShort` | no | ≤10 words each, for the review block's ledger. Fallback when absent: the option's first clause. |
| `distractorReasons` | yes | One entry per non-key option. `label` comes from the authoring guide's D3 vocabulary; `wouldAnswer` is checklist item 10's "the question it would be the right answer to", which is required today and lives only in prose. Storing it makes checklist items 10 and 17 machine-checkable and gives the ledger its second column. |
| `lens` | yes | `"governance"`, `"technical"` or `"operational"`. Used only to report the batch mix, per the guide's §1.6 rule that the mix must not be uniform. Never printed. |
| `cognitive` | yes | `"recall"`, `"application"`, `"analysis"`. Reported against the ≤40% recall target. |
| `discriminator` | no | The stem's discriminator word, for the gate that checks it is present and load-bearing. |
| `difficulty` | no | 1–5, author-assigned. Not printed and not used for scoring; it exists so a later pass can order or sample by it. |
| `variantOf` | if a variant | The `id` of the item this varies. May point into `questions[]` (a v1 parent) or `questionsV2[]`. |
| `variantAxis` | if a variant | `"scenario"`, `"discriminator"`, `"distractor-set"`, `"lens"`, `"outline-sibling"`. Says what was deliberately changed, so a reviewer can check that something actually was. |
| `number` | **no — deprecated for v2** | Print numbers are computed from section position (§5.9). v2 items do not carry it; v1 items keep theirs untouched. |

**On carried-forward v1 items.** The 414 items carried into the v2 drills (§8) will not
have `recallLine`, `optionsShort` or `distractorReasons` on day one — that is 414 × 7
short authored strings. They are therefore **required for newly authored items and
optional-with-fallback for carried ones**: the review block degrades to the stem's last
sentence, un-annotated options, and the existing 152-word explanation, which is still
better than v1 because the key, the options and the cross-references are all on the page.
The build prints the annotation coverage as a percentage so it reads as a backlog rather
than a silent gap.

#### Bank manifest

```jsonc
"bank": {
  "schema": 2,                 // UNCHANGED — v1's gate reads this file
  "edition": "2026-08-31",     // UNCHANGED — v1 edition
  "questionCount": 439,        // UNCHANGED — describes questions[] only
  "byDomain": { … },           // UNCHANGED
  "keyCounts": { … },          // UNCHANGED
  "sources": [ … ],            // UNCHANGED

  "v2": {                      // NEW
    "schema": 1,
    "edition": "2026-…",
    "carriedFromV1": 414,
    "newItems": 336,
    "itemCount": 750,
    "byDomain":  { "domain_1": 100, … },
    "byForm":    { "drill": 500, "A": 125, "B": 125 },
    "keyCounts": { "A": …, "B": …, "C": …, "D": … },
    "stimulusCount": 68,
    "itemsInTestlets": 252,
    "annotationCoverage": { "recallLine": 0.45, "distractorReasons": 0.45 }
  }
}
```

### 6.3 What the app has to do

Nothing, to keep working: `getDomainById` reads `d.questions`, and the extra keys are
ignored. A later app pass can read `questionsV2` and `stimuli` to offer testlets and the
two mock forms in the browser, which is where the app's existing `apportionByWeight`
already points. Two small changes are worth making at the same time as the schema lands,
so they do not become surprises:

- `stage-learn.sh`'s balance check should extend its unique-id assertion across
  `questions[] + questionsV2[]`, and run the ≤30% letter check over the v2 pool
  separately. Ids are namespaced (`d1_v2_q014`) so a collision would be a mistake, which
  is exactly what an assertion is for.
- `src/lib/content.ts` gains the optional fields on `Question` and a `Stimulus` interface.
  Type-level only; no runtime behaviour changes.

### 6.4 Authoring order

The schema is only useful in this order, because each step gates the next:

1. Tag every v1 item with `editions` — the carry-forward decision, 439 one-word edits, and
   the point at which the v2 drill pool exists.
2. Add `outlineItems` to every carried item. This is what makes the coverage table, the
   restudy index and the study-guide cross-references possible, and it is also the pass
   that confirms or refutes the audit's 53 "weak" coverage items, which were keyword
   guesses.
3. Author the stimuli, then their items, closing the 27 zero-coverage outline items first.
4. Author the form items.
5. Backfill `recallLine` / `optionsShort` / `distractorReasons` on carried items, domain by
   domain, tracked by the coverage number in the manifest.

---
## 7. Build gates

`build_pdf.py` already refuses to render a book it does not believe in: gate 0 checks the
bank against its own manifest, gate 1 the letter balance, gate 2 that the build did not
re-letter items whose explanations argue by letter, gate 3 that the explanations agree with
the printed key. v2 keeps all four, over the v2 pool, and adds the following. **Every gate
below either FAILS the build or REPORTS a number; none of them warn and continue, because a
warning in a build log is a thing nobody reads.**

| # | Gate | Effect |
|---|---|---|
| **V0** | **Compatibility.** No item in `domains[].questions[]` carries `stimulusId`; `bank.questionCount`, `bank.byDomain`, `bank.keyCounts` still equal what `questions[]` contains; `bank.schema == 2`. | **FAIL** — this is the gate that protects v1, and it should run first in both builders. |
| V1 | **v2 manifest.** `bank.v2` counts match the loaded v2 pool, the same way gate 0 does for v1. | FAIL |
| V2 | **Letter balance, v2 pool.** No letter above 30%, as v1. | FAIL |
| V3 | **Letter spread within a testlet.** At most two items in a set share a key. | FAIL |
| V4 | **Testlet integrity.** 3 ≤ items ≤ 5; `stimulusSeq` contiguous from 1; no item points at a missing stimulus; no stimulus has fewer than 3 items pointing at it; every item in a set maps to a distinct outline subtask. | FAIL |
| V5 | **Pagination.** Every emitted `<section class="page">` occupies exactly one PDF page, checked by requiring consecutive page markers to differ by exactly 1 in the probe render's map. | FAIL |
| V6 | **Testlet page-break rule.** A `layout: "page"` testlet's opening and closing markers land on the same page; a `layout: "spread"` testlet's land on an even page and the next odd page. | FAIL |
| V7 | **Form disjointness.** No item appears in more than one of `drill` / `A` / `B`; no two items sharing a `variantOf` root appear in the same form. | FAIL |
| V8 | **Cross-reference resolution.** Every printed page reference resolved to a real page in the other volume's map. An unresolved reference prints the section reference alone and is reported; a reference that resolves to the *wrong* volume fails. | FAIL on wrong, REPORT on absent |
| V9 | **Outline coverage.** Per-outline-item question counts, printed as a table. The 27 items the 2026-09-03 audit found at zero must be non-zero. | FAIL on the 27, REPORT the rest |
| V10 | **Near-duplicate stems**, v2 against v2 and v2 against v1, by the same measure that found 6 near-duplicate pairs in v1. | REPORT, with the pairs named |
| V11 | **Annotation coverage.** Share of the v2 pool carrying `recallLine`, `optionsShort`, `distractorReasons`. | REPORT — this is the backlog number from §6.2 |
| V12 | **Batch mix.** Distribution of `cognitive` (target ≤40% recall, per the authoring guide) and of `lens` (must not be uniform, per §1.6 of that guide). | REPORT |
| V13 | **Testlet share.** Items in testlets, overall and among newly authored items (§4.5 floor: 60% of new items). | REPORT overall, FAIL on the floor |

V5 is the one that carries the most weight and is the least obvious. Everything in §5.9 and
§5.10 — running heads that name the right item range, cross-references that are real page
numbers, testlets that do not split — depends on the builder controlling pagination rather
than discovering it. The probe render already produces a token→page map; the gate is
comparing that map against what the builder intended, which is a few lines of arithmetic
and the difference between a spec and a hope.

---

## 8. Sizing, phasing, and what has to be authored

### 8.1 Target composition

> **⚠ Superseded 2026-09-06.** This table was computed against a 439-item bank. The bank
> now holds 491, so the carry is 462 rather than 414 and the new drill authoring is **38
> items, not 86** — total new authoring for a 750-item v2 is 288. The current count is in
> `securepathdigital-site/docs/PRACTICE_EXAM_REFACTOR.md`, which also records which
> questions the coverage data now says to trim.


Drills sized to the blueprint, forms sized by the same largest-remainder apportionment the
app already uses:

| Domain | Weight | Drill target | v1 available | Carried | New drill items |
|---|---|---|---|---|---|
| 1 Security and Risk Management | 16% | 80 | 50 | 50 | **30** |
| 2 Asset Security | 10% | 50 | 60 | 50 | 0 |
| 3 Security Architecture and Engineering | 13% | 65 | 50 | 50 | **15** |
| 4 Communication and Network Security | 13% | 65 | 70 | 65 | 0 |
| 5 Identity and Access Management | 13% | 65 | 50 | 50 | **15** |
| 6 Security Assessment and Testing | 12% | 60 | 50 | 50 | **10** |
| 7 Security Operations | 13% | 65 | 49 | 49 | **16** |
| 8 Software Development Security | 10% | 50 | 60 | 50 | 0 |
| **Total** | 100% | **500** | 439 | **414** | **86** |

Plus **Form A 125** and **Form B 125**, both entirely new. Total v2 = **750 items**, of
which **336 are newly authored**.

Twenty-five v1 items are not carried — 10 from Domain 2, 5 from Domain 4, 10 from Domain 8,
the three domains v1 over-weighted relative to the blueprint. They stay in `questions[]`,
they keep v1 building unchanged, and they are marked `editions: ["v1"]`. §9 asks whether
they should be rewritten into under-served domains rather than shelved.

### 8.2 Page estimate

Derived from the v1 densities in §1.1 and the review-block cost in §3.4:

| | Pages |
|---|---|
| **Volume I** front matter | 8 |
| Part I drills (500 items, 8 case-study openers, ~18 testlets) | 146 |
| Part II forms (250 items, ~32 testlets, instructions) | 69 |
| Answer sheets | 4 |
| Quick-score key | 6 |
| Back matter | 6 |
| **Volume I total** | **≈ 239** |
| **Volume II** front matter and contents | 4 |
| Review blocks (414 carried at ~3.7/page, 336 annotated at ~2.8/page) | 232 |
| Testlet stimuli reprinted above their sets | 16 |
| Case-study debriefs | 12 |
| Restudy index | 6 |
| **Volume II total** | **≈ 270** |

About 509 pages against v1's 239. Two perfect-bindable volumes rather than one book nobody
can open flat.

### 8.3 Phasing

The order matters, and the first phase is the surprising one.

**Phase 1 — the architecture, with no new questions.** Tag `editions`, add `outlineItems`,
and build the v2 book out of the 414 carried items alone. That ships the entire §3 fix: the
self-contained review blocks, continuous numbering, running heads, the answer sheets, the
quick-score worksheet, the two volumes, the cross-references to the study guide, the
coverage table. **The headline complaint is a layout and data problem, not an authoring
problem, and it can be fixed before a single new question exists.** Phase 1 alone is a
shippable v2.0.

**Phase 2 — the coverage gaps, as testlets.** The 86 new drill items, authored to close the
27 zero-coverage outline items first, with Domain 3's system-types family and Domain 7's
DRP ladder as the two anchor sets (§4.5). This is also where each of Domains 3, 5, 6 and 8
gets testlets set in its own case-study world, which is the audit's finding 3.

**Phase 3 — Form A.** 125 new items, interleaved, blueprint-apportioned. The first time the
book can be sat as a mock examination.

**Phase 4 — Form B, and the annotation backfill.** The second form, plus `recallLine`,
`optionsShort` and `distractorReasons` for the 414 carried items, tracked domain by domain
against the V11 number.

Phases 2–4 are authoring work that runs against the pre-ship checklist in
`QUESTION_AUTHORING_GUIDE.md` §4, extended with the testlet rules in §4.3 above. Nothing in
them changes the architecture Phase 1 lands.

---

## 9. Decisions still open

> **⚠ Answered 2026-09-06.** Decisions 1, 2 and 3 are settled — **two volumes**, **v2
> replaces v1 in the $9.99 bundle**, **750 items**. Decisions 5, 6 and 7 were settled by
> measurement while Phase 1 was built. The answers and their reasons are in
> `securepathdigital-site/docs/PRACTICE_EXAM_REFACTOR.md`; the list below is kept for the
> arguments it records, not as an open question set. Decisions 4 (the uncarried items),
> 8 (testlets in the app) and 9 (verify the exam format on print day) are still open.

These were Bill's calls, not the authoring pass's.

1. **Two volumes, or one book.** The §3 recommendation works either way — the review block
   is self-contained regardless of where it is bound. Splitting costs a second SKU and a
   second print job; keeping one book costs the reader the ability to have question and
   explanation open at once, which is the thing being fixed. The spec assumes two.
2. **Does v1 stay on sale?** It must stay *buildable* either way (§6.1). Whether the
   storefront sells both, or v2 replaces it, changes nothing structural but does need
   deciding before the `/guides/` page is updated — which it needs anyway: it currently
   advertises 127/219/10 pages against real files of 189/239/10.
3. **750 items, or fewer.** 336 new items is the bulk of the work in this spec. A smaller
   v2 — drills plus one form, 625 items — is a legitimate stopping point, and Phase 3 is
   where it stops.
4. **The 25 uncarried v1 items.** Shelve them, or rewrite them into Domains 1, 5 and 7
   where the blueprint is short? Rewriting is cheaper than authoring from nothing and
   reuses explanations that already pass the audit.
5. **Trim size.** The one-page testlet rule (§4.4) is sized against 8.5×11. At 6×9 a
   four-item testlet does not fit a page and every set needs a spread, which forces
   even-page starts and wastes leaves. If a 6×9 trim is wanted for the print channel, the
   testlet cap drops to three items and §4.4 needs rewriting.
6. **Bleed tabs** (§5.9) depend on the print channel offering fore-edge bleed. Worth
   checking before the design assumes them; the book works without them.
7. **Who assigns `difficulty`, and should the Tier column print at all** before there is
   response data behind it (§5.7). Printing an author's estimate in a column that looks
   like a statistic is a small honesty risk; omitting it costs the key its diagnostic
   value.
8. **Does the app get testlets?** The schema supports it and `apportionByWeight` already
   exists, so the browser could offer the same two mock forms. Out of scope here, but the
   schema was designed not to foreclose it.
9. **Verify the exam format on print day.** ISC2's current pages say 100–150 items in three
   hours with 25 pretest items; a 2022 announcement said 125–175 in four hours, and much of
   the third-party web still repeats it (§2.9). Every time budget in §5.4 derives from the
   current figures.

---

*Written against `content.json` edition 2026-08-31 (439 items), the 239-page build of
2026-09-02, and the quiz and booklet audit of 2026-09-03. No question text was changed in
producing this document.*

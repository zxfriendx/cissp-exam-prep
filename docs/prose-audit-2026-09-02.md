# Prose audit, 2026-09-02

Run with the `audit-prose` skill (`prosescan.py` for candidates, a read-through
for the verdicts) on the eight CISSP domain case studies in
`src/data/content.json`, the ATM Technical Risks white paper, and the
SecurePath marketing copy. Densities are findings per 1,000 words; the skill's
calibration is ~215/1k for deliberately sloppy copy and 0–17/1k for edited copy
in this user's repos.

## Results

| Document | Before | After | Action |
|---|---|---|---|
| CISSP case studies, 8 domains (`content.json` → `caseStudy`) | 12.2/1k, 31 findings | 0.0/1k, 0 findings | Rewritten (this branch) |
| ATM Technical Risks white paper, published edition (`atmavailability/content/white-paper/ATM-Technical-Risks-White-Paper.md`) | 0.4/1k, 4 findings | unchanged | Read-only: superseded by the v2 rewrite in progress |
| ATM white paper v2 drafts, 9 files (`content/white-paper/v2/draft/`) | 0.0/1k | unchanged | Already clean; another session is editing them today |
| SecurePath `marketing/capabilities-one-pager.md` | 5.3/1k, 2 findings | unchanged | Both false positives |
| SecurePath `marketing/wisp-one-pager.md` | 4.4/1k, 2 findings | unchanged | One real tell, left for Bill (see below) |
| SecurePath `deliverables/sample-wisp-maple-stone-cpas.md` | 0.0/1k | unchanged | |
| ATMIA pitch draft (`atmavailability/content/white-paper/atmia-pitch-draft.md`) | 3.1/1k, 1 finding | unchanged | False positive ("the second edition" names the product) |

## Case studies: what was wrong

1. Every domain ended in a "Key Lessons" list of bold-label bullets
   (`* **Vendor Risk**: ...`), 25 of the 31 hits. The lessons now sit in prose
   under "What a practitioner does differently" and "What the exam tests".
2. Two welded participles in the domain overviews ("...ensuring assets are
   managed according to their value", "...ensuring applications are resilient
   against modern attack vectors"). Cut.
3. Filler vocabulary: "highlights", "Additionally", "comprehensive" (twice). Cut.
4. Rhythm (not regex-findable): before, sentences averaged 30 words with 2% of
   them short; after, 27 words with 13% short.
5. Significance assertions the scanner cannot see: "This case has become a
   primary example of...", "This incident highlights catastrophic failures in
   the Asset Lifecycle", "This is a comprehensive failure of Secure SDLC".
   Replaced with the specific control that failed.
6. Each case had a narrative and an analysis but no approach and no outcome.
   All eight now share one shape: Context, What went wrong, What a
   practitioner does differently, Outcome, What the exam tests, Related
   reading. The Related reading block cross-references the ATM Technical Risks
   white paper by section name (section numbers differ between the published
   PDF and the v2 draft), the ATM Security Capability Maturity Worksheet by
   domain, and ATM Availability pages where the case touches them.
7. The study page called the scenarios "real-world". They are composites with
   fictional institutions, so the caption now reads "Work through this
   scenario to see how the domain's concepts apply in practice", and each
   case says so in its Related reading block.

No client names, figures or dates were added. The existing scenario figures
($2.5M, 50,000 records, 1,200 ATMs and so on) were kept as they were.

## White paper (published edition): the four hits

- §2.4 "A typical cash withdrawal involves several steps, highlighting data
  exchange points" (participle; confirmed).
- §6.6 "...maps them to the types of attacks they primarily address,
  illustrating the layered security concept" (participle; confirmed).
- §7 "...fostering security awareness among staff and customers" (rejected:
  one item in a series of gerunds, not analysis welded on).
- §7 "recognize ATMs not just as cash dispensers but as critical network
  endpoints" (negative parallelism; confirmed).

All four sections have been restructured in the v2 draft, which scans at
0.0/1k, so there is nothing to carry forward.

## Left for Bill

- `wisp-one-pager.md` line 10: "It isn't optional and it isn't just an IRS
  form" is the negative-parallelism tic. Directory is not under git, so it was
  left alone.
- The `caseStudy` field is one string per domain. If the eight cases keep
  growing, a `caseStudy.md` per domain with a build step would make them
  reviewable as prose.

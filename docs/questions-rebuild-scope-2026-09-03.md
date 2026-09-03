# Questions rebuild: scope (2026-09-03)

The ask: "incorporate the new test questions that we made into the web app",
rebuilt locally before anything reaches production. Earlier passes treated the
printed examination's 439 questions as the whole job. This document inventories
every question source the content pipeline has produced, says which bank sits
where, and sizes what "incorporate" actually requires.

Nothing here was deployed. Method and probe scripts:
`~/.claude/jobs/cdc44193/tmp/questions-rebuild/probe_*.py`.

## 1. The finding in one paragraph

There are three wordings of the same 439 questions and nothing else the
pipeline authored. The 2026-08-31 revision run rewrote all 439 in place (its
merge step refuses any added or dropped id), so "the new questions" are the
**revised** 439, not additional ones. The app branches under review already
carry them byte for byte; `master` (`vault-steel-rebrand`) and the live site do
not. The current printed examination was rendered from the revised bank, not
from the old website questions: the only PDF printing the old wording is the
2026-08-30 archive. Beyond the 439, the pipeline holds 218 older lesson-checkpoint
items (D1, D2, D4, D5; 2026-08-07) that were never part of this product and fail
its authoring guide as they stand.

## 2. Which bank is where

Three banks, identified by a hash of the questions only (stems, options, key,
explanation; case studies excluded because the app rewrote those on 09-02):

| Bank | File | Date | Keys | Notes |
|---|---|---|---|---|
| **OLD** | `_product_audit_2026-08-29/content.rekeyed.json.pre-rekey` = `content.json` at repo commit `03a3cf7` (2026-02-14) | 08-29 copy | A = 361/439 (82%) | The original website bank. 26 items carry another question's options, joke distractors, an "All of the above" key |
| **OLD, rekeyed** | `content.rekeyed.PRE-REVISION-2026-08-31.json` = `qrev/in/domain_*.json` | 08-31 | 109/111/109/110 | Same wording, options shuffled per question so the key is balanced |
| **REVISED** | `content.rekeyed.json` = `content-pipeline/.claude/worktrees/question-revision/qrev/merged.json` = `qrev/out/domain_*.json` | 08-31 18:15 | 109/111/109/110 | All 439 rewritten to `QUESTION_AUTHORING_GUIDE.md`: scenario stems, four defensible options, explanations refuting every distractor. Same ids, same numbers, same counts |

Where each one is (verified 2026-09-03):

| Place | Bank | Evidence |
|---|---|---|
| `cissp-exam-prep` `vault-steel-rebrand` (= master, `695061c`) | OLD | question hash `fdb11f66` |
| `guides-into-app`, `journal-2026-09-02/case-studies` | OLD | same hash |
| `journal-2026-09-02/cissp-integrated`, `journal-2026-09-02/pdf-parity`, `journal-2026-09-03/case-study-fix`, this branch | REVISED | hash `60874c87`; 0 of 439 differ from `content.rekeyed.json` |
| `~/.cache/learn-build/…/content.json` and the staged `/data/video/pipeline/learn_site` (09-03) | REVISED | 439 ids in the chunk; source tree hash `60874c87` |
| `cissp_product/eight-domains-practice-examination.pdf` (09-02 21:09, 239 pp) | REVISED | 435/435 revised stems present, 1/98 old |
| `cissp_product/…DRIFTED-KEYS-2026-09-02.pdf` (09-02 18:36) | REVISED | same; its key table, not its questions, was wrong |
| `cissp_product_ARCHIVE_original-2026-08-30/…examination.pdf` (123 pp) | OLD | 98/98 old stems, 1/435 revised |
| `_atm_cissp_retired_2026-08-31/_next/…` (the retired site build, 2026-03-08) | OLD | md5-identical to the repo's `out/` |
| **live learn.securepathdigital.net** | OLD (per the coordinator's stem check) | Cloudflare answers `curl` with a challenge page; confirm in a browser before deploying |

So: the PDF did not get overwritten with the older website questions. The
website is what still serves them. Starting over would discard the 08-31
revision, which is the best bank on disk.

## 3. Inventory of every question source

| Source | Date | Items | Per-item fields | In the app? |
|---|---|---:|---|---|
| `content.rekeyed.json` (REVISED) | 08-31 | 439 | id, number, question, options A–D, correctAnswer, explanation | Yes, on the review branches; **not on master or live** |
| `content.rekeyed.PRE-REVISION-2026-08-31.json` | 08-31 | 439 | same | Superseded |
| `content.rekeyed.json.pre-rekey` | 08-29 | 439 | same | Yes, on master (the OLD bank) |
| `qrev/out/domain_*.json`, `qrev/in/domain_*.json` | 08-31 | 439 + 439 | same | Identical to REVISED / OLD-rekeyed; no extra items, no extra fields |
| `question_audit.json`, `question_audit_rekeyed.json`, `mcq_audit3.json` | 08-29..31 | 439 rows | domain, number, level (recall/middle/application), flags, stem | Metadata about the **OLD** bank; stale for the revised wording |
| `batch_in.json` / `batch_agy.json` | 08-29 | 12 | + `_audit_flags`, `_level`, `critique` | Revision pilot, superseded |
| `content-pipeline/reference/cissp/cissp-quiz-questions.json` | 08-07 | 137 (49 quizzes, D1–D2) | number, question, options, correct_answer, explanation, incomplete_question ×1 | **No.** Transcript-derived from a third-party course (the directory is gitignored for that reason). Key B = 69/137 (50%) |
| `content-pipeline/reference/cissp/tools/generated_d4_d5.json` | 08-07 | 81 (27 quizzes, D4–D5) | same | **No.** Generated lesson quizzes. Key B = 56/81 (69%) |
| `cissp_lessons/d*.json`, `video_pipeline/cissp/d*.json` | 08-30..09-01 | 0 | lesson scripts | n/a |
| `cissp_product/eight-domains-study-guide.pdf` (189 pp), `eight-domains-revision-sheets.pdf` (10 pp) | 09-02 | 0 | no practice items | n/a |
| `reference/isc2/cissp_outline_2024.json` | — | 0 | domains, weights, tasks, subtasks | Weights are in `src/lib/blueprint.ts`; task ids unused |

Unique stems across everything, normalised: **657** (439 + 137 + 81; the three
wordings of the 439 share ids and are counted once). Pipeline-authored questions
the app lacks: **0**. Questions on disk the app lacks: **218**, all older than the
product and not written to its guide.

No source carries per-question difficulty, references, or blueprint task ids.
Explanations: every item. Case-study linkage: one `caseStudy` string per domain,
never per question. Answer key: letter, options fixed A–D, explanations argue by
letter, so the app must not shuffle (it does not).

## 4. What "incorporate the new questions" requires

1. **Ship the revised 439.** Already on this branch. Blocked on the case-study
   work landing (`journal-2026-09-03/case-study-fix`, uncommitted as of this
   writing) and Bill's review of the staged build. Deploy is not this task.
2. **Stop hand-copying the bank.** Today the pipeline's JSON is copied over
   `src/data/content.json` by hand (commit `bd13c88`), and `stage-learn.sh` only
   checks id uniqueness and key balance. An importer that reads the pipeline
   file by path, validates every item, refuses duplicates, keeps ids stable and
   writes a report is what makes the *next* batch safe.
3. **Give the schema room.** Per question: `domainId` (so ids stop having to
   encode the domain), `rev` (content hash, so a re-import reports changed
   items and a saved quiz can tell it is stale), optional `tasks[]` (2024
   outline ids), `references[]`, `level`. Top level: a `bank` manifest
   (edition date, sources, counts). The case studies stay app-owned; the
   importer never writes them.
4. **UI for larger banks.** A domain quiz is the whole domain in one sitting
   (49–70 today). Above roughly 60 that stops being a session, so the domain
   card should offer sets of 25 in book order as well as the whole domain.
   Blueprint-weighted sampling, per-domain scoring, the debrief hold-back and
   explanations already work for any bank size.
5. **Saved progress.** `cissp-quiz-storage` persists the question objects
   themselves, so an in-flight quiz survives a bank change; `cissp-user-stats`
   is keyed by domain id and is unaffected by additions. A re-import that
   changes a question's wording is reported by `rev` and does not break either.
6. **Metadata authoring (not import work).** Blueprint task ids for 439
   questions is a model pass plus spot review (2–4 h with `agy`); it would let
   Weakness Hunter work per task instead of per domain. Rewriting the 218
   legacy items to the guide is authoring: at the guide's "one person, ten
   minutes" that is ~36 h, or a supervised `agy` run. Neither is in this branch.

## 5. Size

- Importer, schema v2, bank manifest, domain sets, tests, staging: **about a
  day**, done on this branch (§6).
- Merge with the case-study work, stage, review: hours, once that branch lands.
- Task-id tagging: 2–4 h supervised. Legacy 218 rewrite: ~36 h human or a
  supervised model run. New questions: 10 min each by the guide's own estimate.

It is bigger than "swap the JSON" (that part was done on 09-02), but the large
items are authoring, not app work.

## 6. Increment plan (this branch)

1. `scripts/import-questions.mjs`: reads bank-shaped (`{domains:[…]}`) and
   quiz-shaped (`{quizzes:[…]}`) sources by path, validates, dedupes by
   normalised stem within a domain, assigns stable ids, writes `content.json`
   with a report of added / changed / unchanged / skipped. `--dry-run`,
   `--check`. Never touches `caseStudy`.
2. Schema v2 in `content.json` and `src/lib/content.ts`: `bank` manifest,
   `domainId`, `rev`, optional `tasks`, `references`, `level`; helpers read
   `domainId` with the id-pattern fallback for persisted quizzes.
3. UI: bank edition and count on the home page; metadata chips on the question
   card and results when present; domain sets of 25.
4. `npm run lint`, `npm run build`, importer self-test; stage with
   `stage-learn.sh`; serve the export loopback-only behind `tailscale serve`
   for review.

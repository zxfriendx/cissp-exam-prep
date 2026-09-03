/**
 * Regression guard for the "black text on dark background" quiz-answer
 * contrast bug (fixed alongside this test).
 *
 * ROOT CAUSE (see src/components/quiz/question-card.tsx and
 * src/components/ui/button.tsx): the app is dark-only (`dark` class is
 * hardcoded on <html>), and the `outline` Button variant carries
 * `dark:bg-input/30 dark:border-input`. Those are `dark:`-prefixed, so once
 * compiled they win specificity over an UNPREFIXED override class in the
 * same Tailwind "class group" (e.g. `bg-[rgb(var(--success))]`), even when
 * the unprefixed override appears later in the source and even though
 * `tailwind-merge` (via `cn()`) usually dedupes conflicting classes --
 * `tailwind-merge` only dedupes within the SAME modifier chain, so an
 * unprefixed class and a `dark:`-prefixed class in the same color group are
 * treated as non-conflicting and BOTH survive the merge, after which raw CSS
 * specificity (not source order) decides the winner.
 *
 * This is a weaker guard than a rendered/browser check: it verifies which
 * Tailwind utility class NAMES survive `clsx` + `tailwind-merge` (the actual
 * merge library the app's `cn()` helper uses), which is exactly the
 * mechanism that caused the bug. It does NOT render anything, does not
 * touch a real DOM/CSSOM, and would not catch a bug introduced anywhere
 * outside this merge step (e.g. a change to globals.css that makes
 * `--success` itself too dark, or a browser-specific quirk). There is no
 * Playwright/browser test harness in this repo; a rendered
 * getComputedStyle() check after actually clicking an answer would be a
 * strictly stronger guard than this one.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cva } from "class-variance-authority";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUTTON_PATH = path.join(__dirname, "..", "src", "components", "ui", "button.tsx");
const QUESTION_CARD_PATH = path.join(__dirname, "..", "src", "components", "quiz", "question-card.tsx");

const buttonSrc = fs.readFileSync(BUTTON_PATH, "utf8");
const questionCardSrc = fs.readFileSync(QUESTION_CARD_PATH, "utf8");

function extract(src, re, label) {
  const m = src.match(re);
  assert.ok(m && m[1] && m[1].trim().length > 0, `could not extract ${label} -- source shape changed?`);
  return m[1];
}

// Pull the live class strings out of the real source files, rather than
// hand-copying them, so an edit to either file is what the test exercises.
const baseClasses = extract(buttonSrc, /cva\(\s*"([^"]+)"/, "button base classes");
const outlineClasses = extract(buttonSrc, /outline:\s*\n?\s*"([^"]+)"/, "outline variant classes");

const unansweredClasses = extract(
  questionCardSrc,
  /!isAnswered\s*&&\s*"([^"]+)"/,
  "unanswered-state classes"
);
const correctClasses = extract(
  questionCardSrc,
  /isAnswered\s*&&\s*isTargetCorrect\s*&&\s*"([^"]+)"/,
  "correct-answer-state classes"
);
const selectedWrongClasses = extract(
  questionCardSrc,
  /isAnswered\s*&&\s*isSelected\s*&&\s*!isTargetCorrect\s*&&\s*"([^"]+)"/,
  "selected-and-wrong-state classes"
);
const unselectedWrongClasses = extract(
  questionCardSrc,
  /isAnswered\s*&&\s*!isSelected\s*&&\s*!isTargetCorrect\s*&&\s*"([^"]+)"/,
  "unselected-and-wrong-state classes"
);

// Mirrors button.tsx's real buttonVariants() + the app's real cn() (twMerge(clsx(...))) --
// same libraries, same call shape, fed with the live extracted strings.
const buttonVariants = cva(baseClasses, {
  variants: { variant: { outline: outlineClasses } },
  defaultVariants: { variant: "outline" },
});
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function renderOptionButton(stateClasses) {
  return cn(buttonVariants({ variant: "outline", className: stateClasses }));
}

test("unanswered option button keeps the steel outline treatment", () => {
  const out = renderOptionButton(unansweredClasses);
  assert.match(out, /dark:bg-input\/30/, "default dark background should still be present");
  assert.match(out, /dark:border-input/, "default dark border should still be present");
  assert.match(out, /dark:hover:bg-input\/50/, "dark hover background should still be present");
});

test("correct-answer button: dark:bg-input/30 and dark:border-input must NOT survive the merge", () => {
  const out = renderOptionButton(correctClasses);

  // The exact bug: these base dark: classes used to survive alongside the
  // unprefixed success override and win on specificity, producing
  // near-black text on a near-black background.
  assert.doesNotMatch(out, /dark:bg-input\/30/, "base dark steel background leaked through -- contrast bug reintroduced");
  assert.doesNotMatch(out, /dark:border-input/, "base dark steel border leaked through");

  // The fix: dark:-prefixed counterparts in the same class group so
  // tailwind-merge actually removes the losing base classes.
  assert.match(out, /dark:bg-\[rgb\(var\(--success\)\)\]/, "success background must have a dark: counterpart");
  assert.match(out, /dark:border-secondary\/60/, "success border must have a dark: counterpart");
  assert.match(out, /dark:text-\[rgb\(var\(--success-foreground\)\)\]/, "success text must have a dark: counterpart");

  // disabled:opacity-50 (universal button dimming) must not silently wash
  // out the one state that has to stay legible.
  assert.doesNotMatch(out, /disabled:opacity-50\b/, "universal 50% dim must be cancelled for the correct answer");
  assert.match(out, /disabled:opacity-100/, "correct answer must render at full opacity once disabled");
});

test("selected-and-wrong button: dark:bg-input/30 and dark:border-input must NOT survive the merge", () => {
  const out = renderOptionButton(selectedWrongClasses);

  assert.doesNotMatch(out, /dark:bg-input\/30/, "base dark steel background leaked through");
  assert.doesNotMatch(out, /dark:border-input/, "base dark steel border leaked through -- red border silently reverted to steel");

  assert.match(out, /dark:bg-red-950\/20/, "wrong-answer dark background must be present");
  assert.match(out, /dark:text-red-100/, "wrong-answer dark text must be present");
  assert.match(out, /dark:border-red-400/, "wrong-answer border must have a dark: counterpart");

  assert.doesNotMatch(out, /disabled:opacity-50\b/, "universal 50% dim must be cancelled for the selected wrong answer");
  assert.match(out, /disabled:opacity-100/, "selected wrong answer must render at full opacity once disabled");
});

test("unselected-and-wrong button: keeps the muted steel look, but at the INTENDED dimming", () => {
  const out = renderOptionButton(unselectedWrongClasses);

  // This branch intentionally has no color override -- it inherits the
  // steel background/border. That's fine and unchanged.
  assert.match(out, /dark:bg-input\/30/, "unselected-wrong should still inherit the steel background");
  assert.match(out, /dark:border-input/, "unselected-wrong should still inherit the steel border");

  // The real (pre-fix) bug here: `opacity-60` is unprefixed, so it LOSES to
  // the base's `disabled:opacity-50` on specificity once the button is
  // actually disabled -- the option silently dims to 50%, not the
  // intended 60%, once accounting for `disabled:` beating a bare class.
  assert.doesNotMatch(out, /disabled:opacity-50\b/, "must not fall back to the base's 50% dim");
  assert.match(out, /disabled:opacity-60/, "intended 60% dim must actually win the merge");
});

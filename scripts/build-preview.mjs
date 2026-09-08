#!/usr/bin/env node
/**
 * Cut src/data/preview.json -- what the free practice app serves -- out of
 * src/data/content.json, which is the whole paid bank.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * The app used to import content.json directly. That was defensible while the
 * app served every question in it. It stopped being defensible the moment the
 * app became a preview of a paid product: Next bundles an imported JSON module
 * into the client, so importing the bank would have shipped all 750 questions
 * of the printed examination -- keys, explanations, distractor reasons and all,
 * 3 MB of them -- to every visitor's browser, where View Source is the whole
 * book. The preview would have been a preview of nothing.
 *
 * So the bank stays on the build machine and only the sample crosses the wire:
 * the 160 selected questions, the 127 scenarios they are set in, and the eight
 * domain case studies. About 620 KB, and the other 590 questions are not in the
 * export at all.
 *
 * The selection is src/lib/preview.ts, the same module the app's tests exercise
 * -- generated here rather than at runtime so the picker itself also stays out
 * of the browser.
 *
 * Run by `npm run preview:build`, and by `prebuild`, so `next build` cannot use
 * a stale sample. test/preview.test.mjs regenerates it and fails if the
 * committed file differs.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { FREE_PREVIEW_PER_DOMAIN, isDrill, pickPreview, previewStats } from '../src/lib/preview.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BANK_PATH = join(repoRoot, 'src', 'data', 'content.json');
export const PREVIEW_PATH = join(repoRoot, 'src', 'data', 'preview.json');

/** The preview document, as an object. Pure: the same bank always gives the same file. */
export function buildPreview(bank) {
    const domains = bank.domains.map(domain => {
        const drills = (domain.questionsV2 ?? []).filter(isDrill);
        // A bank with no v2 items at all still produces a usable app.
        const questions = drills.length
            ? pickPreview(drills, FREE_PREVIEW_PER_DOMAIN)
            : (domain.questions ?? []).slice(0, FREE_PREVIEW_PER_DOMAIN);

        const used = new Set(questions.map(q => q.stimulusId).filter(Boolean));
        return {
            id: domain.id,
            title: domain.title,
            caseStudy: domain.caseStudy,
            // Only the scenarios these questions are set in. The rest belong to
            // questions that are not in the preview.
            stimuli: (domain.stimuli ?? []).filter(s => used.has(s.id)),
            questions,
        };
    });

    const all = domains.flatMap(d => d.questions);
    const stats = previewStats(all);

    return {
        // Generated. Do not hand-edit: scripts/build-preview.mjs overwrites it.
        preview: {
            schema: 1,
            /**
             * The v2 bank edition this sample was cut from. The `bank` block
             * below is the v1 provenance manifest and says 2026-08-31 / 439,
             * which describes an array this file contains none of -- so a check
             * that wants to know how old the free preview is has to read this.
             */
            edition: bank.bank?.v2?.edition ?? null,
            perDomain: FREE_PREVIEW_PER_DOMAIN,
            served: stats.questions,
            scenarios: stats.scenarios,
            objectives: stats.objectives,
            discrete: stats.discrete,
            keyCounts: stats.keyCounts,
            /** Questions in the paid examination this is a sample of. */
            paid: bank.domains.reduce((n, d) => n + (d.questionsV2?.length ?? 0), 0),
            /**
             * Per domain, how many drills the paid examination holds. The free
             * app prints "20 of 80" on a domain card, and it can only be honest
             * about the second number if the number ships with the sample.
             * Drills only: Forms A and B are cross-domain mock papers, not part
             * of a domain's own set.
             */
            paidDrillsByDomain: Object.fromEntries(bank.domains.map(d =>
                [d.id, (d.questionsV2 ?? []).filter(isDrill).length])),
        },
        bank: bank.bank,
        domains,
    };
}

export const serialise = (preview) => JSON.stringify(preview, null, 2) + '\n';

export function readBank(path = BANK_PATH) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
    const bank = readBank();
    const preview = buildPreview(bank);
    writeFileSync(PREVIEW_PATH, serialise(preview));
    const { served, scenarios, objectives, paid, keyCounts } = preview.preview;
    const bytes = serialise(preview).length;
    console.log(
        `preview.json  <-  ${served} of ${paid} questions · ${scenarios} scenarios · ` +
        `${objectives} outline objectives · keys ${JSON.stringify(keyCounts)} · ${(bytes / 1024).toFixed(0)} KB`
    );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();

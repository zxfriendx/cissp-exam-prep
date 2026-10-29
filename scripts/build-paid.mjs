#!/usr/bin/env node
/**
 * Cut services/unlock/data/paid.json — what the unlock service serves to a
 * verified buyer — out of src/data/content.json.
 *
 * Sibling of build-preview.mjs, and the mirror image of it: that script cuts the
 * 160 questions that ship to everyone, this one cuts all 750 that ship to nobody
 * without a licence. Both key off the same `bank.v2.edition`, so a client can
 * tell whether the bank it cached matches the one the service now holds without
 * downloading it — the ETag on /v1/bank is that string.
 *
 * The output holds all 750, not the 590 the preview withheld. The free 160 are a
 * strict subset (verified), so an unlocked client replaces its bank wholesale
 * rather than merging two pools and de-duplicating them.
 *
 * NEVER import this file, or its output, from anything under src/. An imported
 * JSON module is bundled into the client; that is the whole reason this split
 * exists. test/no-bank-import.test.mjs enforces it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BANK_PATH = join(repoRoot, 'src', 'data', 'content.json');
export const PAID_PATH = join(repoRoot, 'services', 'unlock', 'data', 'paid.json');

export function buildPaid(bank) {
    const edition = bank.bank?.v2?.edition;
    if (!edition) throw new Error('content.json has no bank.v2.edition — cannot version the paid cut');
    const domains = bank.domains.map(d => ({
        id: d.id,
        title: d.title,
        caseStudy: d.caseStudy,
        stimuli: d.stimuli ?? [],
        questions: d.questionsV2 ?? [],
    }));
    return { schema: 1, edition, domains };
}

export const serialise = (o) => JSON.stringify(o) + '\n';   // minified: it goes over the wire
export const readBank = (path = BANK_PATH) => JSON.parse(readFileSync(path, 'utf8'));

function main() {
    const paid = buildPaid(readBank());
    mkdirSync(dirname(PAID_PATH), { recursive: true });
    const body = serialise(paid);
    writeFileSync(PAID_PATH, body);
    const q = paid.domains.reduce((n, d) => n + d.questions.length, 0);
    const s = paid.domains.reduce((n, d) => n + d.stimuli.length, 0);
    console.log(`paid.json  <-  ${q} questions · ${s} scenarios · edition ${paid.edition} · ${(body.length / 1024).toFixed(0)} KB`);
}
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();

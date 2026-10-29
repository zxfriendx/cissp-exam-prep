#!/usr/bin/env node
/**
 * Flatten the ISC2 2024 Detailed Content Outline into src/data/outline.json.
 *
 * The bank's `outlineItems` are bare strings ("1.3", "1.3.2") that resolve at
 * either the task or the subtask level, and the app needs to print what they
 * mean — a weakness map that says "5.2.2" and nothing else is a lookup table
 * the reader does not have.
 *
 * Source of record is content-pipeline, not this repo, so this is a sync rather
 * than an edit. Run it when the outline changes; ISC2 last revised CISSP on
 * 2024-04-15 and refreshed CCSP and CC in 2026 without touching this one.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = '/home/zabx/source/content-pipeline/reference/isc2/cissp_outline_2024.json';
export const OUT = join(repoRoot, 'src', 'data', 'outline.json');

export function flatten(outline) {
    const items = {};
    const domainOf = {};
    for (const d of outline.domains) {
        const domainId = `domain_${d.domain}`;
        for (const task of d.tasks ?? []) {
            items[task.id] = task.title;
            domainOf[task.id] = domainId;
            for (const sub of task.subtasks ?? []) {
                items[sub.id] = sub.title;
                domainOf[sub.id] = domainId;
            }
        }
    }
    return {
        source: outline.source,
        syncedFrom: SOURCE,
        counts: { ...outline.counts, flattened: Object.keys(items).length },
        domainOf,
        items,
    };
}

export const serialise = (o) => JSON.stringify(o, null, 2) + '\n';
export const readSource = (path = SOURCE) => JSON.parse(readFileSync(path, 'utf8'));

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
    const flat = flatten(readSource());
    writeFileSync(OUT, serialise(flat));
    console.log(`outline.json  <-  ${flat.counts.flattened} entries `
        + `(${flat.counts.tasks} tasks + ${flat.counts.subtasks} subtasks) from ${flat.source}`);
}

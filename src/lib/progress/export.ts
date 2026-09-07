/**
 * Take your progress with you.
 *
 * The whole point of keeping this local is that it is the reader's, so it has
 * to be possible to get it out — a new laptop, a cleared browser, a second
 * machine. The file is the attempt log and nothing else.
 *
 * WHAT IS DELIBERATELY NOT IN IT
 * ------------------------------
 * No licence, no unlock token, no entitlement, no device id, no email. The
 * export is built by copying a NAMED LIST of fields off each attempt rather
 * than spreading the record, so a field added to AttemptRecord elsewhere — an
 * unlock receipt cached alongside an answer, say — cannot ride out in a file
 * the reader is invited to email to themselves. A new field that genuinely
 * belongs in the export gets added to FIELDS on purpose.
 *
 * Pure: no clock, no storage, no runtime imports.
 */
import type { AttemptRecord } from '@/lib/progress/types';

export const EXPORT_SCHEMA = 1;

/** The exported form: an attempt without its local autoincrement key. */
export type ExportedAttempt = Omit<AttemptRecord, 'id'>;

export interface ProgressExport {
    schema: number;
    /** Unix ms. */
    exportedAt: number;
    /** The question-bank edition the attempts were answered against. */
    edition: string;
    attempts: ExportedAttempt[];
}

/**
 * Every field that leaves the device. Copied one by one; see the header.
 * `id` is absent on purpose — it is IndexedDB's key on THIS device and would
 * collide with a different device's keys on import.
 */
const FIELDS = [
    'qid', 'domainId', 'outlineItems', 'chosen', 'key', 'correct',
    'label', 'mode', 'sessionId', 'ts', 'ms',
] as const;

const strip = (a: AttemptRecord): ExportedAttempt => {
    const out: Record<string, unknown> = {};
    for (const f of FIELDS) {
        const v = (a as unknown as Record<string, unknown>)[f];
        if (v !== undefined) out[f] = v;
    }
    return out as unknown as ExportedAttempt;
};

/**
 * The identity of an attempt across devices: which question, answered when.
 * There is no other candidate — the autoincrement id is per-device, and two
 * genuine answers to the same question in the same millisecond do not happen.
 */
export const attemptKey = (a: Pick<AttemptRecord, 'qid' | 'ts'>): string => `${a.qid} ${a.ts}`;

export function buildExport(
    attempts: readonly AttemptRecord[],
    edition: string,
    now: number,
): ProgressExport {
    return {
        schema: EXPORT_SCHEMA,
        exportedAt: now,
        edition,
        // Oldest first, so a diff of two exports from the same device is an
        // append rather than a reshuffle.
        attempts: attempts
            .slice()
            .sort((x, y) => (x.ts - y.ts) || x.qid.localeCompare(y.qid))
            .map(strip),
    };
}

export interface ParsedExport {
    schema: number;
    exportedAt: number;
    edition: string;
    attempts: ExportedAttempt[];
    /** Rows dropped because they were not attempts. Reported, not thrown on. */
    skipped: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * One row is valid if the fold can use it: a question, a domain, a verdict and
 * a time. Everything else is optional, because an older export legitimately
 * lacks `ms` or `label`.
 */
function validAttempt(v: unknown): v is ExportedAttempt {
    if (!isRecord(v)) return false;
    if (typeof v.qid !== 'string' || v.qid === '') return false;
    if (typeof v.domainId !== 'string' || v.domainId === '') return false;
    if (typeof v.correct !== 'boolean') return false;
    if (typeof v.ts !== 'number' || !Number.isFinite(v.ts)) return false;
    if (v.outlineItems !== undefined
        && !(Array.isArray(v.outlineItems) && v.outlineItems.every(i => typeof i === 'string'))) return false;
    if (v.ms !== undefined && typeof v.ms !== 'number') return false;
    if (v.label !== undefined && typeof v.label !== 'string') return false;
    return true;
}

/** Throws on a file that is not a progress export; skips rows that are not attempts. */
export function parseExport(input: unknown): ParsedExport {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    if (!isRecord(raw)) throw new Error('Not a progress file.');
    if (typeof raw.schema !== 'number') throw new Error('Not a progress file: no schema.');
    if (raw.schema > EXPORT_SCHEMA) {
        throw new Error(
            `This file was written by a newer version of the app (schema ${raw.schema}); this one reads up to ${EXPORT_SCHEMA}.`,
        );
    }
    if (!Array.isArray(raw.attempts)) throw new Error('Not a progress file: no attempts.');

    const attempts: ExportedAttempt[] = [];
    let skipped = 0;
    for (const row of raw.attempts) {
        if (validAttempt(row)) attempts.push(strip(row as AttemptRecord));
        else skipped += 1;
    }

    return {
        schema: raw.schema,
        exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
        edition: typeof raw.edition === 'string' ? raw.edition : '',
        attempts,
        skipped,
    };
}

export interface MergeResult {
    /** What to append. Already free of anything `existing` holds. */
    added: ExportedAttempt[];
    /** Incoming rows the device already had. */
    duplicates: number;
}

/**
 * Merge on (qid, ts). Importing the same file twice adds nothing the second
 * time, and importing a file that overlaps this device's own history — the
 * normal case when two machines have been used in turn — adds only the part
 * this device is missing.
 *
 * Existing attempts are never modified or removed. The log is append-only; an
 * import that could rewrite history would put the rollups back in the position
 * of possibly disagreeing with it.
 */
export function mergeAttempts(
    existing: readonly Pick<AttemptRecord, 'qid' | 'ts'>[],
    incoming: readonly ExportedAttempt[],
): MergeResult {
    const have = new Set(existing.map(attemptKey));
    const added: ExportedAttempt[] = [];
    let duplicates = 0;
    for (const a of incoming) {
        const k = attemptKey(a);
        if (have.has(k)) { duplicates += 1; continue; }
        // Guard the incoming file against itself, too: a hand-edited or
        // double-concatenated file can carry the same row twice.
        have.add(k);
        added.push(a);
    }
    return { added, duplicates };
}

/** "eight-domains-progress-2026-09-07.json" */
export function exportFilename(now: number): string {
    const d = new Date(now);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `eight-domains-progress-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/**
 * The paid bank, read once at boot and gzipped once at boot.
 *
 * 2.3 MB of JSON compresses to about half a megabyte, and every buyer downloads
 * the same bytes, so compressing per request would burn CPU to produce an
 * identical buffer. Both forms are held; /v1/bank picks one by Accept-Encoding.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { PaidBank } from '../../../src/lib/unlock-protocol.ts';

export interface Bank {
    json: PaidBank;
    raw: Buffer;
    gzip: Buffer;
    edition: string;
    /** Quoted, ready to go straight into the ETag header. */
    etag: string;
    items: number;
    stimuli: number;
}

export function makeBank(text: string): Bank {
    const parsed: unknown = JSON.parse(text);
    const json = parsed as PaidBank;

    if (!json || typeof json !== 'object') throw new Error('paid bank is not an object');
    if (json.schema !== 1) throw new Error(`paid bank schema is ${String(json.schema)}, expected 1`);
    if (typeof json.edition !== 'string' || !json.edition) throw new Error('paid bank has no edition');
    if (!Array.isArray(json.domains) || json.domains.length === 0) throw new Error('paid bank has no domains');

    let items = 0;
    let stimuli = 0;
    for (const d of json.domains) {
        if (!d || typeof d.id !== 'string' || !Array.isArray(d.questions) || !Array.isArray(d.stimuli)) {
            throw new Error(`paid bank domain ${String(d?.id)} is malformed`);
        }
        items += d.questions.length;
        stimuli += d.stimuli.length;
    }
    if (items === 0) throw new Error('paid bank carries no questions -- build-paid.mjs ran against the wrong content.json');

    const raw = Buffer.from(text, 'utf8');
    return { json, raw, gzip: gzipSync(raw, { level: 9 }), edition: json.edition, etag: `"${json.edition}"`, items, stimuli };
}

export const loadBank = (path: string): Bank => makeBank(readFileSync(path, 'utf8'));

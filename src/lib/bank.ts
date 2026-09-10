/**
 * Which question bank the app is serving, and the swap between them.
 *
 * The app ships with the 160-question free preview compiled in. A buyer who
 * unlocks downloads the 750-question paid bank once, and from then on every
 * accessor in src/lib/content.ts reads THAT instead — same shape, same
 * components, no component knowing which tier it is rendering.
 *
 * WHY THE BANK IS A MODULE VARIABLE AND NOT REACT STATE
 * -----------------------------------------------------
 * content.ts is imported by the quiz store, by generateStaticParams and by
 * plain functions that are not inside a render. Threading the bank through
 * React would mean rewriting all of that; a module variable plus a tiny store
 * that only exists to force a re-render is a much smaller change.
 *
 * THE HYDRATION RULE
 * ------------------
 * The server render and the FIRST client render must both see the preview. The
 * swap only ever happens from an effect (see components/entitlement/bank-loader),
 * after hydration, so the markup React builds on the client matches the markup
 * it is hydrating. Nothing here may read IndexedDB or localStorage at module
 * scope.
 *
 * TESTED DIRECTLY BY NODE
 * -----------------------
 * `node --test` imports this file and strips the types, the same trick
 * src/lib/preview.ts documents. The `@/` alias and the extensionless imports
 * come from scripts/node-ts-resolve.mjs, which the tests register.
 */
import { create } from 'zustand';
import { kvDelete, kvGet, kvSet } from '@/lib/idb';
import type { ContentData, Domain, Stimulus } from '@/lib/content';
import type { PaidBank } from '@/lib/unlock-protocol';

/** The IndexedDB `kv` key the downloaded paid bank is cached under. */
export const BANK_CACHE_KEY = 'paid-bank';

export type BankTier = 'free' | 'paid';

/** Before content.ts registers the preview. Never rendered: see setPreviewBank. */
const EMPTY: ContentData = { domains: [] };

let preview: ContentData = EMPTY;
let paid: PaidBank | null = null;
let active: ContentData = EMPTY;
let stimulusIndex = new Map<string, Stimulus>();

const indexStimuli = (data: ContentData): Map<string, Stimulus> =>
    new Map(data.domains.flatMap(d => (d.stimuli ?? []).map(s => [s.id, s] as const)));

const editionOf = (): string | null =>
    paid?.edition ?? preview.bank?.v2?.edition ?? preview.bank?.edition ?? null;

const countServed = (data: ContentData): number =>
    data.domains.reduce((n, d) => n + d.questions.length, 0);

/**
 * What components watch so they re-render when the bank changes underneath the
 * accessors. Deliberately NOT persisted: the tier is derived from the cached
 * bank and the entitlement token every time the app starts, so there is no
 * second copy of "am I paid" that can disagree with them.
 */
export interface BankState {
    tier: BankTier;
    /** The active bank's edition — the paid one when paid, the build's when free. */
    edition: string | null;
    /** Questions the app can serve right now, mock-form items included. */
    served: number;
    /** True while the paid bank is being read out of IndexedDB or downloaded. */
    loading: boolean;
}

export const useBankStore = create<BankState>(() => ({
    tier: 'free',
    edition: null,
    served: 0,
    loading: false,
}));

const publish = (): void => {
    useBankStore.setState({ tier: paid ? 'paid' : 'free', edition: editionOf(), served: countServed(active) });
};

/**
 * Install the free preview as the baseline. Called once, at module scope, by
 * content.ts — which is the only module that imports preview.json, so the paid
 * path never pulls the free sample in behind it.
 *
 * It is a registration rather than an import here because `node --test` cannot
 * import JSON from a stripped .ts file without an import attribute, and adding
 * one would put a bundler-specific syntax in the middle of the hot path.
 */
export function setPreviewBank(data: ContentData): void {
    preview = data;
    if (!paid) {
        active = data;
        stimulusIndex = indexStimuli(data);
    }
    publish();
}

/**
 * Swap in the paid bank, or pass null to drop back to the free preview.
 *
 * The build's own `preview` and `bank` metadata travels across the swap on
 * purpose: getBankManifest() has to keep answering "which edition does THIS
 * build expect", because that is the string the loader compares a cached bank
 * against, and getPreviewSummary() has to keep describing the free sample so
 * the upsell copy stays true.
 */
export function setActiveBank(bank: PaidBank | null): void {
    paid = bank;
    active = bank
        ? { preview: preview.preview, bank: preview.bank, domains: bank.domains as Domain[] }
        : preview;
    stimulusIndex = indexStimuli(active);
    publish();
}

/** The bank every accessor in content.ts reads. */
export const activeData = (): ContentData => active;

export const activeTier = (): BankTier => (paid ? 'paid' : 'free');

/** The scenario a question is set in. Rebuilt by every swap, so it cannot go stale. */
export const lookupStimulus = (id: string): Stimulus | undefined => stimulusIndex.get(id);

export const setBankLoading = (loading: boolean): void => {
    useBankStore.setState({ loading });
};

// ── the offline copy ─────────────────────────────────────────────────────────
//
// 2.3 MB, so IndexedDB rather than localStorage — which is already carrying a
// quiz sitting and throws rather than degrading when it runs out. Every call
// below swallows its errors: a browser with storage switched off (private
// windows, some iOS configurations) must still be able to unlock and study for
// the session, it just downloads the bank again next time.

/** A shape check, not a trust check: only the service can verify the token. */
const looksLikeBank = (value: unknown): value is PaidBank => {
    if (!value || typeof value !== 'object') return false;
    const b = value as Partial<PaidBank>;
    return b.schema === 1 && typeof b.edition === 'string' && Array.isArray(b.domains);
};

export async function readCachedBank(): Promise<PaidBank | null> {
    try {
        const cached = await kvGet<unknown>(BANK_CACHE_KEY);
        return looksLikeBank(cached) ? cached : null;
    } catch {
        return null;
    }
}

export async function cacheBank(bank: PaidBank): Promise<void> {
    try {
        await kvSet(BANK_CACHE_KEY, bank);
    } catch {
        // Out of quota or storage denied. The bank is already live in memory.
    }
}

export async function clearCachedBank(): Promise<void> {
    try {
        await kvDelete(BANK_CACHE_KEY);
    } catch {
        // Nothing to do: the caller is dropping the entitlement either way.
    }
}

/** Tests only: forget everything so the next setPreviewBank starts clean. */
export function resetBankForTests(): void {
    preview = EMPTY;
    paid = null;
    active = EMPTY;
    stimulusIndex = new Map();
    useBankStore.setState({ tier: 'free', edition: null, served: 0, loading: false });
}

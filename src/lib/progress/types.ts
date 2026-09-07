/**
 * The vocabulary the progress fold is built on.
 *
 * src/lib/idb.ts owns the attempt store and the record's shape; this module
 * re-exports that shape so nothing under progress/ has to reach into the
 * storage layer for a type, and adds the two things only the fold needs.
 *
 * Everything here is `import type` on purpose. The pure modules in this folder
 * are imported directly by `node --test` (Node 22 strips types), which cannot
 * resolve the `@/` alias — a type-only import is erased before Node sees it, a
 * runtime one would not be. Nothing under progress/ except the store may import
 * an aliased module for its VALUE — which is also why this file exports no
 * constants: a `const` here would be a runtime import at every use site.
 */
import type { AttemptRecord } from '@/lib/idb';

export type { AttemptRecord } from '@/lib/idb';

/**
 * What the caller hands `recordAttempt`. `ts` is stamped on the way in and `id`
 * is assigned by IndexedDB, so neither is the caller's to supply.
 */
export type AttemptInput = Omit<AttemptRecord, 'id' | 'ts'> & { ts?: number };

/**
 * The parts of a blueprint entry the fold reads. `BLUEPRINT` in
 * src/lib/blueprint.ts satisfies this structurally, so the store passes it
 * straight in and the weights are stated in exactly one place. Tests import
 * blueprint.ts directly — it has no runtime imports of its own, so Node can
 * load it.
 */
export interface DomainWeight {
    id: string;
    number: number;
    weight: number;
    name?: string;
}

/**
 * A module resolve hook that teaches `node --test` the two things a bundler
 * knows and Node does not: the `@/` path alias, and extensionless imports.
 *
 * WHY THIS EXISTS
 * ---------------
 * Node 22 strips TypeScript types on the fly, so a test can import a src module
 * directly and check the real thing rather than a copy of it (test/preview.test.mjs
 * has done this since the picker was written). That stops at the first runtime
 * import: `@/lib/unlock-protocol` means nothing to Node, and nor does
 * `./unlock-protocol` without its extension.
 *
 * The alternative was to write src files in a dialect Node happens to resolve —
 * relative paths with explicit .ts extensions — which would make the app's own
 * source worse to read in order to make the tests easier to launch. Twenty lines
 * here is the better trade.
 *
 * It lives in scripts/ rather than test/ because `node --test` treats EVERY .mjs
 * under test/ as a test file, and a hooks module is not a test.
 *
 * Usage, at the top of a test file, before importing anything from src:
 *
 *     import { register } from 'node:module';
 *     register('../scripts/node-ts-resolve.mjs', import.meta.url);
 *     const { thing } = await import('../src/lib/thing.ts');
 *
 * The import of the module under test has to be dynamic: static imports are all
 * resolved before the file's body runs, which is before register() has happened.
 */
import { statSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

/** Tried in order, the way a bundler's `resolve.extensions` would. */
const CANDIDATES = ['', '.ts', '.tsx', '.mts', '.js', '/index.ts', '/index.tsx'];

const fileAt = (base) => {
    for (const ext of CANDIDATES) {
        const path = base + ext;
        try {
            if (statSync(path).isFile()) return path;
        } catch {
            // Not there. Try the next extension.
        }
    }
    return null;
};

export async function resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
        const hit = fileAt(join(SRC, specifier.slice(2)));
        if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }

    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
        const hit = fileAt(base);
        // Only step in where Node would have failed: an exact hit needs no help.
        if (hit && hit !== base) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }

    return next(specifier, context);
}
